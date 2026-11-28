-- =====================================================================
-- My Trek – Kiểm thử Dự chi (migration 004). Chạy SAU 004_planned_expenses.sql.
-- Cách chạy như 01/02. "PASS…" = đạt, "FAIL PLAN-xx…" = không đạt (luôn rollback).
-- =====================================================================
do $test$
declare
  a  uuid := gen_random_uuid();
  ea text := 'mytrek-plan-a-' || a || '@example.com';
  v_trip uuid; m_a uuid; v_plan uuid;
  v_cnt int; v_bool boolean; v_err text;
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (a, ea, '{"full_name":"Plan A"}', 'authenticated', 'authenticated');

  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'email', ea, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.trips (name, start_date, end_date) values ('Test dự chi', '2026-12-19', '2026-12-21') returning id into v_trip;
  select id into m_a from public.trip_members where trip_id = v_trip and user_id = a;

  -- PLAN-01: tạo dự chi → không có đợt thanh toán, paid_by trống, is_planned = true
  v_plan := public.save_expense(
    jsonb_build_object('trip_id', v_trip, 'title', 'Ăn uống ngày 2', 'amount', 1500000, 'currency', 'VND',
                       'expense_date', '2026-12-20', 'is_planned', true, 'paid_by', m_a),
    jsonb_build_array(jsonb_build_object('member_id', m_a, 'share_amount', 1500000)),
    '[]'::jsonb);
  select is_planned into v_bool from public.expenses where id = v_plan and paid_by is null;
  select count(*) into v_cnt from public.expense_payments where expense_id = v_plan;
  if v_bool is distinct from true or v_cnt <> 0 then raise exception 'FAIL PLAN-01: dự chi lưu sai (% / % đợt)', v_bool, v_cnt; end if;

  -- PLAN-02: RPC dự chi kèm đợt thanh toán → lỗi
  v_err := null;
  begin
    perform public.save_expense(
      jsonb_build_object('trip_id', v_trip, 'title', 'Sai', 'amount', 100000, 'currency', 'VND', 'is_planned', true),
      jsonb_build_array(jsonb_build_object('member_id', m_a, 'share_amount', 100000)),
      jsonb_build_array(jsonb_build_object('paid_by', m_a, 'amount', 100000, 'paid_on', '2026-12-20')));
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%dự chi không có đợt thanh toán%' then
    raise exception 'FAIL PLAN-02: %', coalesce(v_err, 'lưu được dự chi có thanh toán');
  end if;

  -- PLAN-03: ghi nhận thanh toán trực tiếp vào dự chi → lỗi
  v_err := null;
  begin
    insert into public.expense_payments (expense_id, trip_id, paid_by, amount) values (v_plan, v_trip, m_a, 100000);
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%dự chi%' then
    raise exception 'FAIL PLAN-03: %', coalesce(v_err, 'ghi nhận được thanh toán cho dự chi');
  end if;

  -- PLAN-04: "Đã chi" – chuyển thành chi thật với số tiền thực tế + 1 đợt trả đủ
  perform public.save_expense(
    jsonb_build_object('id', v_plan, 'trip_id', v_trip, 'title', 'Ăn uống ngày 2', 'amount', 1350000, 'currency', 'VND',
                       'expense_date', '2026-12-20', 'is_planned', false),
    jsonb_build_array(jsonb_build_object('member_id', m_a, 'share_amount', 1350000)),
    jsonb_build_array(jsonb_build_object('paid_by', m_a, 'amount', 1350000, 'paid_on', '2026-12-20')));
  select is_planned into v_bool from public.expenses where id = v_plan;
  select count(*) into v_cnt from public.expense_payments where expense_id = v_plan;
  if v_bool or v_cnt <> 1 then raise exception 'FAIL PLAN-04: chuyển thành chi thật sai'; end if;

  -- PLAN-05: khoản đã có thanh toán không chuyển về dự chi bằng UPDATE trực tiếp
  v_err := null;
  begin
    update public.expenses set is_planned = true where id = v_plan;
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%không chuyển về dự chi%' then
    raise exception 'FAIL PLAN-05: %', coalesce(v_err, 'chuyển được về dự chi');
  end if;

  raise exception 'PASS – tất cả kịch bản PLAN-01 → PLAN-05 đạt. Đây là lỗi có chủ đích để hoàn tác toàn bộ dữ liệu test.';
end
$test$;
