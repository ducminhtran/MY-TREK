-- =====================================================================
-- My Trek – 004_planned_expenses.sql
-- Dự chi: khoản SẼ chi (ước tính), chưa chốt, chưa trả (quyết định 1a 2a 3a 4a – 28/11/2026)
--   • expenses.is_planned = true  → khoản dự chi: KHÔNG có đợt thanh toán, không ảnh hưởng bảng Chia tiền
--   • Chuyển thành chi thật: save_expense với is_planned = false (+ các đợt thanh toán)
-- Chạy SAU 003. Supabase → SQL Editor → dán toàn bộ → Run.
-- =====================================================================

begin;

alter table public.expenses add column is_planned boolean not null default false;
create index expenses_trip_planned_idx on public.expenses (trip_id, is_planned);

-- ---------------------------------------------------------------------
-- 1. Không ghi nhận thanh toán cho khoản dự chi
-- ---------------------------------------------------------------------

create or replace function public.expense_payments_check_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_amount  numeric(18,2);
  v_planned boolean;
  v_paid    numeric(18,2);
begin
  select e.amount, e.is_planned into v_amount, v_planned from public.expenses e where e.id = new.expense_id for update;
  if v_planned then
    raise exception 'Khoản dự chi chưa ghi nhận thanh toán được. Hãy bấm "Đã chi" để chuyển thành khoản chi thật';
  end if;
  select coalesce(sum(p.amount), 0) into v_paid
  from public.expense_payments p
  where p.expense_id = new.expense_id and p.id is distinct from new.id;
  if v_paid + new.amount > v_amount then
    raise exception 'Tổng các đợt thanh toán vượt quá số tiền chi. Còn phải trả tối đa %', v_amount - v_paid;
  end if;
  return new;
end $$;

-- Không chuyển khoản đã có thanh toán về dự chi
create or replace function public.expenses_check_planned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_planned and exists (select 1 from public.expense_payments p where p.expense_id = new.id) then
    raise exception 'Khoản chi đã có thanh toán, không chuyển về dự chi được';
  end if;
  return new;
end $$;

create trigger expenses_check_planned
  before update of is_planned on public.expenses
  for each row execute function public.expenses_check_planned();

-- ---------------------------------------------------------------------
-- 2. RPC save_expense: thêm is_planned (giữ nguyên chữ ký 3 tham số)
-- ---------------------------------------------------------------------

-- p_expense : {id?, trip_id, title, category, amount, currency, exchange_rate, paid_by?, expense_date, due_date?,
--              split_type, note, is_planned?}
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
  v_planned  boolean := coalesce((p_expense ->> 'is_planned')::boolean, false);
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

  if p_splits is null or jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 then
    raise exception 'Khoản chi phải có ít nhất 1 người chia';
  end if;
  select coalesce(sum((s ->> 'share_amount')::numeric(18,2)), 0) into v_total from jsonb_array_elements(p_splits) s;
  if v_total <> v_amount then
    raise exception 'Tổng phần chia (%) phải bằng số tiền chi (%)', v_total, v_amount;
  end if;

  if v_planned then
    -- Dự chi: không có đợt thanh toán, không có hạn trả
    if p_payments is not null and jsonb_typeof(p_payments) = 'array' and jsonb_array_length(p_payments) > 0 then
      raise exception 'Khoản dự chi không có đợt thanh toán';
    end if;
    v_payments := '[]'::jsonb;
    v_due := null;
  elsif p_payments is null then
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

  select (p ->> 'paid_by')::uuid into v_payer
  from jsonb_array_elements(v_payments) with ordinality as t(p, i)
  order by coalesce(nullif(p ->> 'paid_on', '')::date, v_date), i
  limit 1;

  if v_id is null then
    insert into public.expenses (trip_id, title, category, amount, currency, exchange_rate,
                                 paid_by, expense_date, due_date, split_type, note, is_planned)
    values (v_trip_id, p_expense ->> 'title', coalesce(nullif(p_expense ->> 'category', ''), 'khac'),
            v_amount, v_currency, v_rate, v_payer, v_date, v_due,
            coalesce(nullif(p_expense ->> 'split_type', ''), 'equal'), nullif(p_expense ->> 'note', ''), v_planned)
    returning id into v_id;
  else
    -- Xóa các đợt cũ TRƯỚC khi đổi số tiền / trạng thái dự chi để không vướng ràng buộc
    delete from public.expense_payments where expense_id = v_id and trip_id = v_trip_id;
    update public.expenses set
      title = p_expense ->> 'title',
      category = coalesce(nullif(p_expense ->> 'category', ''), 'khac'),
      amount = v_amount, currency = v_currency, exchange_rate = v_rate,
      paid_by = v_payer, expense_date = v_date, due_date = v_due,
      split_type = coalesce(nullif(p_expense ->> 'split_type', ''), 'equal'),
      note = nullif(p_expense ->> 'note', ''),
      is_planned = v_planned
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

revoke execute on function public.save_expense(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_expense(jsonb, jsonb, jsonb) to authenticated;
revoke execute on function public.expense_payments_check_total() from public, anon, authenticated;
revoke execute on function public.expenses_check_planned() from public, anon, authenticated;

commit;
