-- =====================================================================
-- My Trek – 003_expense_payments.sql
-- Đặt cọc / thanh toán nhiều đợt cho khoản chi (quyết định 1a 2a 3a 4a 5a – 28/11/2026)
--   • expenses.amount  = TỔNG chi phí (cam kết)
--   • expense_payments = các đợt ĐÃ trả (cọc, đợt 2…), mỗi đợt có người trả, ngày, số tiền (nguyên tệ của khoản chi)
--   • 1 tỷ giá chung cho cả khoản (BR-04 giữ nguyên)
--   • Dữ liệu cũ: mỗi khoản chi = 1 đợt đã trả đủ (người trả = paid_by, ngày = expense_date)
-- Chạy 1 lần: Supabase → SQL Editor → dán toàn bộ → Run. Toàn bộ trong 1 transaction.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Cột mới trên expenses
-- ---------------------------------------------------------------------

-- Hạn trả phần còn lại (tùy chọn)
alter table public.expenses add column due_date date;

-- paid_by giờ chỉ là "người trả đợt đầu" (thông tin); khoản chưa trả đồng nào thì để trống
alter table public.expenses alter column paid_by drop not null;

-- ---------------------------------------------------------------------
-- 2. Bảng các đợt thanh toán
-- ---------------------------------------------------------------------

create table public.expense_payments (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null,
  trip_id     uuid not null references public.trips (id) on delete cascade,
  paid_by     uuid not null,
  amount      numeric(18,2) not null check (amount > 0),   -- nguyên tệ của khoản chi
  paid_on     date not null default current_date,
  note        text check (char_length(note) <= 500),
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint expense_payments_expense_fkey foreign key (expense_id, trip_id)
    references public.expenses (id, trip_id) on delete cascade,
  -- KT-08 / KT-10: cùng chuyến đi; cascade khi xóa cả chuyến đi
  constraint expense_payments_payer_fkey foreign key (trip_id, paid_by)
    references public.trip_members (trip_id, id) on delete cascade
);
create index expense_payments_expense_idx on public.expense_payments (expense_id);
create index expense_payments_trip_payer_idx on public.expense_payments (trip_id, paid_by);

create trigger expense_payments_set_updated_at
  before update on public.expense_payments
  for each row execute function public.set_updated_at();

-- Chuyển dữ liệu cũ: mỗi khoản chi đã có = trả đủ 1 đợt
insert into public.expense_payments (expense_id, trip_id, paid_by, amount, paid_on, created_by, created_at)
select e.id, e.trip_id, e.paid_by, e.amount, e.expense_date, e.created_by, e.created_at
from public.expenses e
where e.paid_by is not null;

-- ---------------------------------------------------------------------
-- 3. Ràng buộc: tổng các đợt ≤ tổng tiền khoản chi
-- ---------------------------------------------------------------------

create or replace function public.expense_payments_check_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(18,2);
  v_paid   numeric(18,2);
begin
  select e.amount into v_amount from public.expenses e where e.id = new.expense_id for update;
  select coalesce(sum(p.amount), 0) into v_paid
  from public.expense_payments p
  where p.expense_id = new.expense_id and p.id is distinct from new.id;
  if v_paid + new.amount > v_amount then
    raise exception 'Tổng các đợt thanh toán vượt quá số tiền chi. Còn phải trả tối đa %', v_amount - v_paid;
  end if;
  return new;
end $$;

create trigger expense_payments_check_total
  before insert or update of amount, expense_id on public.expense_payments
  for each row execute function public.expense_payments_check_total();

create or replace function public.expenses_check_amount_vs_paid()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_paid numeric(18,2);
begin
  select coalesce(sum(p.amount), 0) into v_paid from public.expense_payments p where p.expense_id = new.id;
  if new.amount < v_paid then
    raise exception 'Số tiền chi không được nhỏ hơn số đã thanh toán (%)', v_paid;
  end if;
  return new;
end $$;

create trigger expenses_check_amount_vs_paid
  before update of amount on public.expenses
  for each row execute function public.expenses_check_amount_vs_paid();

-- ---------------------------------------------------------------------
-- 4. KT-08 / BR-09: chặn xóa thành viên đã trả 1 đợt nào đó
-- ---------------------------------------------------------------------

create or replace function public.trip_members_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.trips t where t.id = old.trip_id) then
    return old;  -- đang xóa cả chuyến đi
  end if;
  if exists (select 1 from public.expenses e where e.trip_id = old.trip_id and e.paid_by = old.id)
     or exists (select 1 from public.expense_payments p where p.trip_id = old.trip_id and p.paid_by = old.id)
     or exists (select 1 from public.expense_splits s where s.trip_id = old.trip_id and s.member_id = old.id)
     or exists (select 1 from public.settlements st where st.trip_id = old.trip_id
                and (st.from_member = old.id or st.to_member = old.id)) then
    raise exception 'Không thể xóa thành viên "%" vì đã phát sinh chi tiêu, phần chia hoặc thanh toán', old.display_name;
  end if;
  return old;
end $$;

-- ---------------------------------------------------------------------
-- 5. RPC save_expense: thêm tham số p_payments (thay toàn bộ các đợt)
-- ---------------------------------------------------------------------

drop function if exists public.save_expense(jsonb, jsonb);

-- p_expense : {id?, trip_id, title, category, amount, currency, exchange_rate, paid_by?, expense_date, due_date?, split_type, note}
-- p_splits  : [{member_id, share_amount}]
-- p_payments: [{paid_by, amount, paid_on, note?}] – NULL = trả đủ 1 đợt bởi p_expense.paid_by (tương thích bản cũ)
create or replace function public.save_expense(p_expense jsonb, p_splits jsonb, p_payments jsonb default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id       uuid := nullif(p_expense ->> 'id', '')::uuid;
  v_trip_id  uuid := nullif(p_expense ->> 'trip_id', '')::uuid;
  v_amount   numeric(18,2) := (p_expense ->> 'amount')::numeric;
  v_currency text := upper(btrim(coalesce(p_expense ->> 'currency', '')));
  v_rate     numeric(18,6) := coalesce((p_expense ->> 'exchange_rate')::numeric, 1);
  v_date     date := coalesce(nullif(p_expense ->> 'expense_date', '')::date, current_date);
  v_due      date := nullif(p_expense ->> 'due_date', '')::date;
  v_base     text;
  v_total    numeric(18,2);
  v_payments jsonb;
  v_paid     numeric(18,2);
  v_payer    uuid;
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
    v_rate := 1;
  end if;

  -- Phần chia (BR-06)
  if p_splits is null or jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'Khoản chi phải có ít nhất 1 người chia';
  end if;
  select coalesce(sum((s ->> 'share_amount')::numeric(18,2)), 0) into v_total from jsonb_array_elements(p_splits) s;
  if v_total <> v_amount then
    raise exception 'Tổng phần chia (%) phải bằng số tiền chi (%)', v_total, v_amount;
  end if;

  -- Các đợt thanh toán
  if p_payments is null then
    v_payments := case
      when nullif(p_expense ->> 'paid_by', '') is null then '[]'::jsonb
      else jsonb_build_array(jsonb_build_object('paid_by', p_expense ->> 'paid_by', 'amount', v_amount, 'paid_on', v_date))
    end;
  elsif jsonb_typeof(p_payments) <> 'array' then
    raise exception 'Danh sách thanh toán không hợp lệ';
  else
    v_payments := p_payments;
  end if;

  if exists (select 1 from jsonb_array_elements(v_payments) p
             where coalesce((p ->> 'amount')::numeric, 0) <= 0 or nullif(p ->> 'paid_by', '') is null) then
    raise exception 'Mỗi đợt thanh toán phải có người trả và số tiền lớn hơn 0';
  end if;
  select coalesce(sum((p ->> 'amount')::numeric(18,2)), 0) into v_paid from jsonb_array_elements(v_payments) p;
  if v_paid > v_amount then
    raise exception 'Tổng các đợt thanh toán (%) vượt quá số tiền chi (%)', v_paid, v_amount;
  end if;

  -- Người trả đợt sớm nhất (thông tin hiển thị)
  select (p ->> 'paid_by')::uuid into v_payer
  from jsonb_array_elements(v_payments) with ordinality as t(p, i)
  order by coalesce(nullif(p ->> 'paid_on', '')::date, v_date), i
  limit 1;

  if v_id is null then
    insert into public.expenses (trip_id, title, category, amount, currency, exchange_rate,
                                 paid_by, expense_date, due_date, split_type, note)
    values (v_trip_id, p_expense ->> 'title', coalesce(nullif(p_expense ->> 'category', ''), 'khac'),
            v_amount, v_currency, v_rate, v_payer, v_date, v_due,
            coalesce(nullif(p_expense ->> 'split_type', ''), 'equal'), nullif(p_expense ->> 'note', ''))
    returning id into v_id;
  else
    -- Xóa các đợt cũ TRƯỚC khi đổi số tiền để không vướng ràng buộc "số tiền ≥ đã trả"
    delete from public.expense_payments where expense_id = v_id and trip_id = v_trip_id;
    update public.expenses set
      title = p_expense ->> 'title',
      category = coalesce(nullif(p_expense ->> 'category', ''), 'khac'),
      amount = v_amount, currency = v_currency, exchange_rate = v_rate,
      paid_by = v_payer, expense_date = v_date, due_date = v_due,
      split_type = coalesce(nullif(p_expense ->> 'split_type', ''), 'equal'),
      note = nullif(p_expense ->> 'note', '')
    where id = v_id and trip_id = v_trip_id;
    if not found then
      raise exception 'Không tìm thấy khoản chi hoặc bạn không có quyền sửa';
    end if;
    delete from public.expense_splits where expense_id = v_id;
  end if;

  insert into public.expense_splits (expense_id, trip_id, member_id, share_amount)
  select v_id, v_trip_id, (s ->> 'member_id')::uuid, (s ->> 'share_amount')::numeric(18,2)
  from jsonb_array_elements(p_splits) s;

  insert into public.expense_payments (expense_id, trip_id, paid_by, amount, paid_on, note)
  select v_id, v_trip_id, (p ->> 'paid_by')::uuid, (p ->> 'amount')::numeric(18,2),
         coalesce(nullif(p ->> 'paid_on', '')::date, v_date), nullif(p ->> 'note', '')
  from jsonb_array_elements(v_payments) p;

  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 6. RLS + quyền
-- ---------------------------------------------------------------------

alter table public.expense_payments enable row level security;

create policy expense_payments_select on public.expense_payments for select to authenticated
  using (public.is_trip_member(trip_id));
create policy expense_payments_insert on public.expense_payments for insert to authenticated
  with check (public.can_edit_trip(trip_id));
create policy expense_payments_update on public.expense_payments for update to authenticated
  using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy expense_payments_delete on public.expense_payments for delete to authenticated
  using (public.can_edit_trip(trip_id));

revoke all on public.expense_payments from anon;
grant select, insert, update, delete on public.expense_payments to authenticated;

revoke execute on function public.save_expense(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_expense(jsonb, jsonb, jsonb) to authenticated;

revoke execute on function public.expense_payments_check_total() from public, anon, authenticated;
revoke execute on function public.expenses_check_amount_vs_paid() from public, anon, authenticated;
revoke execute on function public.trip_members_before_delete() from public, anon, authenticated;

commit;
