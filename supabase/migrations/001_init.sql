-- =====================================================================
-- My Trek – 001_init.sql
-- Chạy 1 lần trên project Supabase mới: SQL Editor → dán toàn bộ → Run.
-- Không sửa file này sau khi đã chạy; thay đổi CSDL viết migration mới (R-09).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Hàm tiện ích
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- KT-12: lấy trip_id từ path Storage '<trip_id>/<file>'; không phải uuid → NULL
create or replace function public.storage_trip_id(p_name text)
returns uuid language plpgsql immutable set search_path = public as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 2. Bảng
-- ---------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '' check (char_length(full_name) <= 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.trips (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(btrim(name)) between 1 and 200),
  destination    text check (char_length(destination) <= 200),
  description    text check (char_length(description) <= 2000),
  start_date     date not null,
  end_date       date not null,
  base_currency  text not null default 'VND' check (base_currency ~ '^[A-Z]{3}$'),
  budget         numeric(18,2) check (budget >= 0),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- BR-01: kết thúc ≥ bắt đầu, tối đa 365 ngày (tính cả 2 đầu)
  constraint trips_dates_chk check (end_date >= start_date and end_date - start_date <= 364)
);
create index trips_owner_idx on public.trips (owner_id);

create table public.trip_members (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  display_name  text not null check (char_length(btrim(display_name)) between 1 and 100),
  email         text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role          text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  status        text not null default 'active' check (status in ('invited', 'active')),
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint trip_members_trip_user_key unique (trip_id, user_id),
  constraint trip_members_trip_id_id_key unique (trip_id, id),
  -- Đang mời ⇒ có email và chưa gắn tài khoản
  constraint trip_members_invited_chk check (status <> 'invited' or (email is not null and user_id is null))
);
-- BR-03: email duy nhất trong 1 chuyến đi, không phân biệt hoa thường (tên index dùng cho thông báo lỗi 9.4)
create unique index trip_members_trip_email on public.trip_members (trip_id, lower(email)) where email is not null;
-- BR-02: mỗi chuyến đi đúng 1 Owner
create unique index trip_members_one_owner on public.trip_members (trip_id) where role = 'owner';
create index trip_members_user_idx on public.trip_members (user_id);

create table public.trip_currencies (
  trip_id       uuid not null references public.trips (id) on delete cascade,
  currency      text not null check (currency ~ '^[A-Z]{3}$'),
  rate_to_base  numeric(18,6) not null check (rate_to_base > 0),
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (trip_id, currency)
);

create table public.itinerary_items (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  day_date       date not null,
  start_time     time,
  end_time       time,
  title          text not null check (char_length(btrim(title)) between 1 and 200),
  category       text not null default 'khac'
                 check (category in ('di_chuyen', 'luu_tru', 'an_uong', 'tham_quan', 'mua_sam', 'khac')),
  location_name  text check (char_length(location_name) <= 200),
  address        text check (char_length(address) <= 500),
  lat            double precision check (lat between -90 and 90),
  lng            double precision check (lng between -180 and 180),
  cost_estimate  numeric(18,2) check (cost_estimate >= 0),
  note           text check (char_length(note) <= 2000),
  sort_order     integer not null default 0,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint itinerary_items_id_trip_key unique (id, trip_id),
  constraint itinerary_items_time_chk check (start_time is null or end_time is null or end_time >= start_time),
  constraint itinerary_items_latlng_chk check ((lat is null) = (lng is null))
);
create index itinerary_items_trip_day_idx on public.itinerary_items (trip_id, day_date, start_time);

create table public.expenses (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 1 and 200),
  category       text not null default 'khac'
                 check (category in ('di_chuyen', 'luu_tru', 'an_uong', 'tham_quan', 'mua_sam', 'khac')),
  amount         numeric(18,2) not null check (amount > 0),
  currency       text not null check (currency ~ '^[A-Z]{3}$'),
  exchange_rate  numeric(18,6) not null default 1 check (exchange_rate > 0),
  -- BR-04: quy đổi về tiền tệ gốc, tỷ giá chốt theo từng khoản chi
  amount_base    numeric(18,2) generated always as (round(amount * exchange_rate, 2)) stored,
  paid_by        uuid not null,
  expense_date   date not null default current_date,
  split_type     text not null default 'equal' check (split_type in ('equal', 'custom')),
  note           text check (char_length(note) <= 2000),
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint expenses_id_trip_key unique (id, trip_id),
  -- KT-10 + KT-08
  constraint expenses_paid_by_fkey foreign key (trip_id, paid_by)
    references public.trip_members (trip_id, id) on delete cascade
);
create index expenses_trip_date_idx on public.expenses (trip_id, expense_date desc);
create index expenses_trip_paid_by_idx on public.expenses (trip_id, paid_by);

create table public.expense_splits (
  expense_id    uuid not null,
  trip_id       uuid not null references public.trips (id) on delete cascade,
  member_id     uuid not null,
  share_amount  numeric(18,2) not null check (share_amount >= 0),
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (expense_id, member_id),
  constraint expense_splits_expense_fkey foreign key (expense_id, trip_id)
    references public.expenses (id, trip_id) on delete cascade,
  constraint expense_splits_member_fkey foreign key (trip_id, member_id)
    references public.trip_members (trip_id, id) on delete cascade
);
create index expense_splits_trip_member_idx on public.expense_splits (trip_id, member_id);

create table public.settlements (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips (id) on delete cascade,
  from_member  uuid not null,
  to_member    uuid not null,
  amount       numeric(18,2) not null check (amount > 0),  -- tiền tệ gốc
  settled_on   date not null default current_date,
  note         text check (char_length(note) <= 2000),
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint settlements_diff_chk check (from_member <> to_member),
  constraint settlements_from_fkey foreign key (trip_id, from_member)
    references public.trip_members (trip_id, id) on delete cascade,
  constraint settlements_to_fkey foreign key (trip_id, to_member)
    references public.trip_members (trip_id, id) on delete cascade
);
create index settlements_trip_idx on public.settlements (trip_id);

create table public.checklist_items (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  category     text not null default 'viec_can_lam' check (category in ('hanh_ly', 'giay_to', 'viec_can_lam')),
  assignee_id  uuid,
  is_done      boolean not null default false,
  due_date     date,
  sort_order   integer not null default 0,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint checklist_items_assignee_fkey foreign key (trip_id, assignee_id)
    references public.trip_members (trip_id, id) on delete set null (assignee_id)
);
create index checklist_items_trip_idx on public.checklist_items (trip_id);

create table public.attachments (
  id                 uuid primary key default gen_random_uuid(),
  trip_id            uuid not null references public.trips (id) on delete cascade,
  storage_path       text not null unique,
  file_name          text not null check (char_length(file_name) between 1 and 255),
  mime_type          text,
  size_bytes         bigint not null check (size_bytes > 0 and size_bytes <= 10485760),  -- BR-12
  expense_id         uuid,
  itinerary_item_id  uuid,
  uploaded_by        uuid default auth.uid(),
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- BR-12/KT-12: path phải bắt đầu bằng trip_id của chính dòng này
  constraint attachments_path_trip_chk check (public.storage_trip_id(storage_path) is not distinct from trip_id),
  constraint attachments_expense_fkey foreign key (expense_id, trip_id)
    references public.expenses (id, trip_id) on delete set null (expense_id),
  constraint attachments_itinerary_fkey foreign key (itinerary_item_id, trip_id)
    references public.itinerary_items (id, trip_id) on delete set null (itinerary_item_id)
);
create index attachments_trip_idx on public.attachments (trip_id);
create index attachments_expense_idx on public.attachments (expense_id);
create index attachments_itinerary_idx on public.attachments (itinerary_item_id);

-- ---------------------------------------------------------------------
-- 3. Hàm phân quyền (KT-07): SECURITY DEFINER để tránh RLS đệ quy
-- ---------------------------------------------------------------------

create or replace function public.trip_role(p_trip_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from public.trip_members m
  where m.trip_id = p_trip_id and m.user_id = auth.uid() and m.status = 'active'
  limit 1
$$;

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.trip_role(p_trip_id) is not null
$$;

create or replace function public.can_edit_trip(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.trip_role(p_trip_id) in ('owner', 'editor'), false)
$$;

create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.trip_role(p_trip_id) = 'owner', false)
$$;

-- ---------------------------------------------------------------------
-- 4. Trigger
-- ---------------------------------------------------------------------

-- 4.1 Tự tạo profiles khi đăng ký (AUTH-01)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Đồng bộ email vào profiles khi người dùng đổi email
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- 4.2 trips: giữ owner_id (DB-12), chặn đổi tiền tệ gốc khi đã có khoản chi (BR-10)
create or replace function public.trips_before_update()
returns trigger language plpgsql set search_path = public as $$
begin
  new.owner_id := old.owner_id;
  new.created_by := old.created_by;
  if new.base_currency <> old.base_currency
     and exists (select 1 from public.expenses e where e.trip_id = old.id) then
    raise exception 'Không thể đổi tiền tệ gốc vì chuyến đi đã có khoản chi';
  end if;
  return new;
end $$;

create trigger trips_before_update
  before update on public.trips
  for each row execute function public.trips_before_update();

-- 4.3 KT-06: tạo chuyến đi xong tự thêm Owner vào trip_members
create or replace function public.trips_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name  text;
  v_email text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), split_part(coalesce(p.email, ''), '@', 1)), p.email
    into v_name, v_email
  from public.profiles p where p.id = new.owner_id;

  insert into public.trip_members (trip_id, user_id, display_name, email, role, status)
  values (new.id, new.owner_id, coalesce(nullif(v_name, ''), 'Chủ chuyến đi'), v_email, 'owner', 'active');
  return new;
end $$;

create trigger trips_after_insert
  after insert on public.trips
  for each row execute function public.trips_after_insert();

-- 4.4 trip_members: chuẩn hóa email, suy ra trạng thái, chặn thao tác sai quyền.
-- SECURITY INVOKER có chủ đích: current_user = 'authenticated' khi gọi trực tiếp từ app,
-- = chủ hàm (postgres) khi chạy bên trong RPC SECURITY DEFINER (accept_invitation, trigger tạo Owner).
create or replace function public.trip_members_before_write()
returns trigger language plpgsql set search_path = public as $$
declare
  v_from_client boolean := current_user in ('authenticated', 'anon');
begin
  new.email := nullif(lower(btrim(new.email)), '');
  new.display_name := btrim(new.display_name);

  if tg_op = 'UPDATE' then
    if new.trip_id <> old.trip_id then
      raise exception 'Không thể chuyển thành viên sang chuyến đi khác';
    end if;
    if old.role = 'owner' and new.role <> 'owner' then
      raise exception 'Không thể thay đổi vai trò của Chủ chuyến đi';
    end if;
    if old.role <> 'owner' and new.role = 'owner' then
      raise exception 'Không thể chuyển quyền Chủ chuyến đi';
    end if;
    if v_from_client then
      if new.user_id is distinct from old.user_id then
        raise exception 'Không thể gắn tài khoản cho thành viên. Người được mời cần tự đăng nhập và chấp nhận lời mời';
      end if;
      if old.user_id is not null and new.email is distinct from old.email then
        raise exception 'Không thể sửa email của thành viên đã có tài khoản';
      end if;
    end if;
  end if;

  -- MEM-02: chưa có tài khoản → có email là "đang mời", không email là thành viên offline
  if new.user_id is null then
    new.status := case when new.email is null then 'active' else 'invited' end;
  end if;
  return new;
end $$;

create trigger trip_members_before_write
  before insert or update on public.trip_members
  for each row execute function public.trip_members_before_write();

-- 4.5 KT-08 / BR-09: chặn xóa lẻ thành viên đã phát sinh chi tiêu; cho phép khi đang xóa cả chuyến đi
create or replace function public.trip_members_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.trips t where t.id = old.trip_id) then
    return old;  -- dòng trips cha đã bị xóa → đang xóa cả chuyến đi
  end if;
  if exists (select 1 from public.expenses e where e.trip_id = old.trip_id and e.paid_by = old.id)
     or exists (select 1 from public.expense_splits s where s.trip_id = old.trip_id and s.member_id = old.id)
     or exists (select 1 from public.settlements st where st.trip_id = old.trip_id
                and (st.from_member = old.id or st.to_member = old.id)) then
    raise exception 'Không thể xóa thành viên "%" vì đã phát sinh chi tiêu, phần chia hoặc thanh toán', old.display_name;
  end if;
  return old;
end $$;

create trigger trip_members_before_delete
  before delete on public.trip_members
  for each row execute function public.trip_members_before_delete();

-- 4.6 BR-14: hoạt động lịch trình phải nằm trong thời gian chuyến đi khi tạo/đổi ngày
create or replace function public.itinerary_items_check_day()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_start date;
  v_end   date;
begin
  if tg_op = 'INSERT' or new.day_date is distinct from old.day_date then
    select t.start_date, t.end_date into v_start, v_end from public.trips t where t.id = new.trip_id;
    if new.day_date < v_start or new.day_date > v_end then
      raise exception 'Ngày của hoạt động phải nằm trong thời gian chuyến đi (% – %)',
        to_char(v_start, 'DD/MM/YYYY'), to_char(v_end, 'DD/MM/YYYY');
    end if;
  end if;
  return new;
end $$;

create trigger itinerary_items_check_day
  before insert or update on public.itinerary_items
  for each row execute function public.itinerary_items_check_day();

-- 4.7 updated_at cho mọi bảng
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'trips', 'trip_members', 'trip_currencies', 'itinerary_items',
                           'expenses', 'expense_splits', 'settlements', 'checklist_items', 'attachments'] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. RPC
-- ---------------------------------------------------------------------

-- MEM-03: lời mời đang chờ của email đang đăng nhập
create or replace function public.my_invitations()
returns table (
  member_id    uuid,
  trip_id      uuid,
  trip_name    text,
  destination  text,
  start_date   date,
  end_date     date,
  role         text,
  invited_by   text
)
language sql stable security definer set search_path = public as $$
  select m.id, t.id, t.name, t.destination, t.start_date, t.end_date, m.role,
         coalesce(nullif(btrim(p.full_name), ''), p.email)
  from public.trip_members m
  join public.trips t on t.id = m.trip_id
  left join public.profiles p on p.id = coalesce(m.created_by, t.owner_id)
  where m.status = 'invited'
    and m.user_id is null
    and coalesce(auth.jwt() ->> 'email', '') <> ''
    and m.email = lower(auth.jwt() ->> 'email')
    and not exists (select 1 from public.trip_members x where x.trip_id = m.trip_id and x.user_id = auth.uid())
  order by t.start_date, t.name
$$;

-- MEM-03 / BR-11: chấp nhận lời mời – chỉ đúng email mới được
create or replace function public.accept_invitation(p_member_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_member public.trip_members;
  v_email  text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để chấp nhận lời mời';
  end if;

  select * into v_member from public.trip_members where id = p_member_id for update;
  if not found or v_member.status <> 'invited' or v_member.user_id is not null then
    raise exception 'Lời mời không tồn tại hoặc đã được xử lý';
  end if;
  if v_email = '' or v_member.email <> v_email then
    raise exception 'Lời mời này không dành cho email bạn đang đăng nhập';
  end if;
  if exists (select 1 from public.trip_members where trip_id = v_member.trip_id and user_id = auth.uid()) then
    raise exception 'Bạn đã là thành viên của chuyến đi này';
  end if;

  update public.trip_members set user_id = auth.uid(), status = 'active' where id = p_member_id;
  return v_member.trip_id;
end $$;

-- MEM-03: từ chối lời mời → xóa dòng mời
create or replace function public.decline_invitation(p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  delete from public.trip_members
  where id = p_member_id and status = 'invited' and user_id is null
    and v_email <> '' and email = v_email;
  if not found then
    raise exception 'Lời mời không tồn tại hoặc không dành cho bạn';
  end if;
end $$;

-- KT-09 / EXP-05: lưu khoản chi + phần chia trong 1 transaction. SECURITY INVOKER → RLS vẫn áp dụng.
-- p_expense: {id?, trip_id, title, category, amount, currency, exchange_rate, paid_by, expense_date, split_type, note}
-- p_splits : [{member_id, share_amount}, ...] – share_amount theo nguyên tệ của khoản chi
create or replace function public.save_expense(p_expense jsonb, p_splits jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id       uuid := nullif(p_expense ->> 'id', '')::uuid;
  v_trip_id  uuid := nullif(p_expense ->> 'trip_id', '')::uuid;
  v_amount   numeric(18,2) := (p_expense ->> 'amount')::numeric;
  v_currency text := upper(btrim(coalesce(p_expense ->> 'currency', '')));
  v_rate     numeric(18,6) := coalesce((p_expense ->> 'exchange_rate')::numeric, 1);
  v_base     text;
  v_total    numeric(18,2);
begin
  if v_trip_id is null then
    raise exception 'Thiếu thông tin chuyến đi';
  end if;
  if not public.can_edit_trip(v_trip_id) then
    raise exception using errcode = '42501', message = 'Bạn không có quyền thực hiện thao tác này';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Số tiền phải lớn hơn 0';
  end if;

  select t.base_currency into v_base from public.trips t where t.id = v_trip_id;
  if v_currency = v_base then
    v_rate := 1;  -- tiền tệ gốc: tỷ giá luôn = 1
  end if;

  if p_splits is null or jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'Khoản chi phải có ít nhất 1 người chia';
  end if;
  select coalesce(sum((s ->> 'share_amount')::numeric(18,2)), 0) into v_total
  from jsonb_array_elements(p_splits) s;
  -- BR-06: tổng phần chia phải bằng đúng số tiền
  if v_total <> v_amount then
    raise exception 'Tổng phần chia (%) phải bằng số tiền chi (%)', v_total, v_amount;
  end if;

  if v_id is null then
    insert into public.expenses (trip_id, title, category, amount, currency, exchange_rate,
                                 paid_by, expense_date, split_type, note)
    values (v_trip_id,
            p_expense ->> 'title',
            coalesce(nullif(p_expense ->> 'category', ''), 'khac'),
            v_amount, v_currency, v_rate,
            (p_expense ->> 'paid_by')::uuid,
            coalesce(nullif(p_expense ->> 'expense_date', '')::date, current_date),
            coalesce(nullif(p_expense ->> 'split_type', ''), 'equal'),
            nullif(p_expense ->> 'note', ''))
    returning id into v_id;
  else
    update public.expenses set
      title        = p_expense ->> 'title',
      category     = coalesce(nullif(p_expense ->> 'category', ''), 'khac'),
      amount       = v_amount,
      currency     = v_currency,
      exchange_rate = v_rate,
      paid_by      = (p_expense ->> 'paid_by')::uuid,
      expense_date = coalesce(nullif(p_expense ->> 'expense_date', '')::date, current_date),
      split_type   = coalesce(nullif(p_expense ->> 'split_type', ''), 'equal'),
      note         = nullif(p_expense ->> 'note', '')
    where id = v_id and trip_id = v_trip_id;
    if not found then
      raise exception 'Không tìm thấy khoản chi hoặc bạn không có quyền sửa';
    end if;
    delete from public.expense_splits where expense_id = v_id;
  end if;

  insert into public.expense_splits (expense_id, trip_id, member_id, share_amount)
  select v_id, v_trip_id, (s ->> 'member_id')::uuid, (s ->> 'share_amount')::numeric(18,2)
  from jsonb_array_elements(p_splits) s;

  return v_id;
end $$;

-- Q-05: đánh dấu xong/chưa checklist. Owner/Editor: mọi mục; Viewer: chỉ mục giao cho chính mình
create or replace function public.set_checklist_done(p_item_id uuid, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_item public.checklist_items;
  v_role text;
begin
  select * into v_item from public.checklist_items where id = p_item_id;
  if not found then
    raise exception 'Không tìm thấy mục checklist';
  end if;

  v_role := public.trip_role(v_item.trip_id);
  if v_role is null then
    raise exception using errcode = '42501', message = 'Bạn không có quyền thực hiện thao tác này';
  end if;
  if v_role = 'viewer' and not exists (
       select 1 from public.trip_members m
       where m.id = v_item.assignee_id and m.trip_id = v_item.trip_id and m.user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Bạn chỉ được đánh dấu mục được giao cho mình';
  end if;

  update public.checklist_items set is_done = coalesce(p_done, false) where id = p_item_id;
end $$;

-- ---------------------------------------------------------------------
-- 6. RLS (mục 8.4)
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- KT-06: SELECT phải có owner_id = auth.uid() để insert().select() không lỗi
create policy trips_select on public.trips for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_trip_member(id));
create policy trips_insert on public.trips for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy trips_update on public.trips for update to authenticated
  using (public.can_edit_trip(id)) with check (public.can_edit_trip(id));
create policy trips_delete on public.trips for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy trip_members_select on public.trip_members for select to authenticated
  using (public.is_trip_member(trip_id));
create policy trip_members_insert on public.trip_members for insert to authenticated
  with check (public.is_trip_owner(trip_id) and role <> 'owner' and user_id is null);
create policy trip_members_update on public.trip_members for update to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));
create policy trip_members_delete on public.trip_members for delete to authenticated
  using (role <> 'owner' and (public.is_trip_owner(trip_id) or user_id = (select auth.uid())));

-- Các bảng dữ liệu chuyến đi: thành viên xem, Owner/Editor ghi
do $$
declare
  t text;
begin
  foreach t in array array['trip_currencies', 'itinerary_items', 'expenses', 'expense_splits',
                           'settlements', 'checklist_items', 'attachments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_trip_member(trip_id))',
                   t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit_trip(trip_id))',
                   t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id))',
                   t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit_trip(trip_id))',
                   t || '_delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Quyền truy cập
-- ---------------------------------------------------------------------

-- anon: không có quyền gì trên bảng nghiệp vụ
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- profiles: người dùng chỉ được sửa họ tên của chính mình
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Hàm: thu hồi hết, chỉ cấp cho authenticated những hàm cần dùng
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.storage_trip_id(text),
  public.trip_role(uuid),
  public.is_trip_member(uuid),
  public.can_edit_trip(uuid),
  public.is_trip_owner(uuid),
  public.my_invitations(),
  public.accept_invitation(uuid),
  public.decline_invitation(uuid),
  public.save_expense(jsonb, jsonb),
  public.set_checklist_done(uuid, boolean)
to authenticated;

-- ---------------------------------------------------------------------
-- 8. Storage (mục 8.5)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('trip-files', 'trip-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy trip_files_select on storage.objects for select to authenticated
  using (bucket_id = 'trip-files' and public.is_trip_member(public.storage_trip_id(name)));
create policy trip_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-files' and public.can_edit_trip(public.storage_trip_id(name)));
create policy trip_files_update on storage.objects for update to authenticated
  using (bucket_id = 'trip-files' and public.can_edit_trip(public.storage_trip_id(name)))
  with check (bucket_id = 'trip-files' and public.can_edit_trip(public.storage_trip_id(name)));
create policy trip_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'trip-files' and public.can_edit_trip(public.storage_trip_id(name)));
