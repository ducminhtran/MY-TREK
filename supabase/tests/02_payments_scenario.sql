-- =====================================================================
-- My Trek – Kiểm thử đặt cọc / thanh toán nhiều đợt (migration 003)
-- Chạy SAU khi đã chạy 003_expense_payments.sql.
-- Cách chạy giống 01: SQL Editor → dán TOÀN BỘ → Run.
-- Luôn kết thúc bằng lỗi có chủ đích để ROLLBACK: "PASS…" = đạt, "FAIL PAY-xx…" = không đạt.
-- =====================================================================
do $test$
declare
  a  uuid := gen_random_uuid();   -- Owner
  b  uuid := gen_random_uuid();   -- Editor
  v  uuid := gen_random_uuid();   -- Viewer
  c  uuid := gen_random_uuid();   -- Người ngoài
  ea text := 'mytrek-pay-a-' || a || '@example.com';
  eb text := 'mytrek-pay-b-' || b || '@example.com';
  ev text := 'mytrek-pay-v-' || v || '@example.com';
  ec text := 'mytrek-pay-c-' || c || '@example.com';
  v_trip uuid; m_a uuid; m_b uuid; m_v uuid; m_off uuid; m_x uuid;
  v_hotel uuid; v_tmp uuid;
  v_cnt int; v_num numeric; v_err text; v_payer uuid; v_due date;
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role) values
    (a, ea, '{"full_name":"Pay A"}', 'authenticated', 'authenticated'),
    (b, eb, '{"full_name":"Pay B"}', 'authenticated', 'authenticated'),
    (v, ev, '{"full_name":"Pay V"}', 'authenticated', 'authenticated'),
    (c, ec, '{"full_name":"Pay C"}', 'authenticated', 'authenticated');

  -- ---------- A tạo chuyến đi + thành viên ----------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'email', ea, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.trips (name, start_date, end_date) values ('Test cọc', '2026-12-19', '2026-12-21') returning id into v_trip;
  select id into m_a from public.trip_members where trip_id = v_trip and user_id = a;
  insert into public.trip_members (trip_id, display_name, email, role) values (v_trip, 'B', eb, 'editor') returning id into m_b;
  insert into public.trip_members (trip_id, display_name, email, role) values (v_trip, 'V', ev, 'viewer') returning id into m_v;
  insert into public.trip_members (trip_id, display_name, role) values (v_trip, 'Bé Na', 'viewer') returning id into m_off;
  insert into public.trip_members (trip_id, display_name, role) values (v_trip, 'Ông X', 'viewer') returning id into m_x;

  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'email', eb, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.accept_invitation(m_b);
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v, 'email', ev, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.accept_invitation(m_v);

  -- ---------- PAY-01: B tạo khoản 5.000.000, mới cọc 1.000.000 (A trả), hạn trả còn lại ----------
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'email', eb, 'role', 'authenticated')::text, true);
  set local role authenticated;

  v_hotel := public.save_expense(
    jsonb_build_object('trip_id', v_trip, 'title', 'Khách sạn', 'category', 'luu_tru', 'amount', 5000000,
                       'currency', 'VND', 'expense_date', '2026-12-01', 'due_date', '2026-12-19', 'split_type', 'equal'),
    jsonb_build_array(
      jsonb_build_object('member_id', m_a,   'share_amount', 1666667),
      jsonb_build_object('member_id', m_b,   'share_amount', 1666667),
      jsonb_build_object('member_id', m_off, 'share_amount', 1666666)),
    jsonb_build_array(jsonb_build_object('paid_by', m_a, 'amount', 1000000, 'paid_on', '2026-12-01', 'note', 'Cọc')));

  select coalesce(sum(amount), 0), count(*) into v_num, v_cnt from public.expense_payments where expense_id = v_hotel;
  if v_num <> 1000000 or v_cnt <> 1 then raise exception 'FAIL PAY-01: đợt cọc sai (% / % đợt)', v_num, v_cnt; end if;
  select paid_by, due_date into v_payer, v_due from public.expenses where id = v_hotel;
  if v_payer is distinct from m_a or v_due <> '2026-12-19' then raise exception 'FAIL PAY-01: paid_by/due_date sai'; end if;

  -- ---------- PAY-02: RPC – tổng các đợt vượt số tiền ----------
  v_err := null;
  begin
    perform public.save_expense(
      jsonb_build_object('trip_id', v_trip, 'title', 'Vượt', 'amount', 100000, 'currency', 'VND'),
      jsonb_build_array(jsonb_build_object('member_id', m_a, 'share_amount', 100000)),
      jsonb_build_array(jsonb_build_object('paid_by', m_a, 'amount', 150000, 'paid_on', '2026-12-01')));
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%vượt quá%' then
    raise exception 'FAIL PAY-02: %', coalesce(v_err, 'lưu được khoản trả vượt');
  end if;

  -- ---------- PAY-03: ghi nhận thêm đợt trực tiếp; đợt vượt phần còn lại bị chặn ----------
  insert into public.expense_payments (expense_id, trip_id, paid_by, amount, paid_on)
  values (v_hotel, v_trip, m_b, 3000000, '2026-12-10');
  v_err := null;
  begin
    insert into public.expense_payments (expense_id, trip_id, paid_by, amount) values (v_hotel, v_trip, m_b, 2000000);
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%vượt quá%' then
    raise exception 'FAIL PAY-03: %', coalesce(v_err, 'ghi nhận được đợt vượt phần còn lại');
  end if;

  -- ---------- PAY-04: giảm tổng tiền xuống dưới số đã trả (4.000.000) bị chặn ----------
  v_err := null;
  begin
    update public.expenses set amount = 3000000 where id = v_hotel;
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%không được nhỏ hơn số đã thanh toán%' then
    raise exception 'FAIL PAY-04: %', coalesce(v_err, 'giảm được tổng tiền');
  end if;

  -- ---------- PAY-05: khoản chưa trả đồng nào (p_payments = []) ----------
  v_tmp := public.save_expense(
    jsonb_build_object('trip_id', v_trip, 'title', 'Vé xe chưa trả', 'amount', 600000, 'currency', 'VND'),
    jsonb_build_array(jsonb_build_object('member_id', m_a, 'share_amount', 600000)),
    '[]'::jsonb);
  select count(*) into v_cnt from public.expense_payments where expense_id = v_tmp;
  select paid_by into v_payer from public.expenses where id = v_tmp;
  if v_cnt <> 0 or v_payer is not null then raise exception 'FAIL PAY-05: khoản chưa trả có % đợt', v_cnt; end if;

  -- ---------- PAY-06: gọi kiểu cũ (2 tham số) = trả đủ 1 đợt ----------
  v_tmp := public.save_expense(
    jsonb_build_object('trip_id', v_trip, 'title', 'Ăn sáng', 'amount', 200000, 'currency', 'VND',
                       'paid_by', m_b, 'expense_date', '2026-12-19'),
    jsonb_build_array(jsonb_build_object('member_id', m_b, 'share_amount', 200000)));
  select coalesce(sum(amount), 0) into v_num from public.expense_payments where expense_id = v_tmp and paid_by = m_b;
  if v_num <> 200000 then raise exception 'FAIL PAY-06: gọi kiểu cũ không tạo đợt trả đủ (%)', v_num; end if;

  -- ---------- PAY-07: sửa qua RPC – giảm tổng tiền + thay toàn bộ các đợt ----------
  perform public.save_expense(
    jsonb_build_object('id', v_hotel, 'trip_id', v_trip, 'title', 'Khách sạn (sửa)', 'amount', 4500000, 'currency', 'VND',
                       'expense_date', '2026-12-01', 'split_type', 'custom'),
    jsonb_build_array(
      jsonb_build_object('member_id', m_a, 'share_amount', 2250000),
      jsonb_build_object('member_id', m_b, 'share_amount', 2250000)),
    jsonb_build_array(
      jsonb_build_object('paid_by', m_b, 'amount', 500000, 'paid_on', '2026-12-05'),
      jsonb_build_object('paid_by', m_a, 'amount', 1000000, 'paid_on', '2026-12-01')));
  select coalesce(sum(amount), 0), count(*) into v_num, v_cnt from public.expense_payments where expense_id = v_hotel;
  select paid_by, due_date into v_payer, v_due from public.expenses where id = v_hotel;
  if v_num <> 1500000 or v_cnt <> 2 then raise exception 'FAIL PAY-07: các đợt sau khi sửa sai (% / %)', v_num, v_cnt; end if;
  if v_payer is distinct from m_a then raise exception 'FAIL PAY-07: paid_by phải là người trả đợt sớm nhất'; end if;
  if v_due is not null then raise exception 'FAIL PAY-07: due_date phải được xóa'; end if;

  -- ---------- PAY-08: Viewer ghi nhận thanh toán → lỗi quyền ----------
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v, 'email', ev, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_err := null;
  begin
    insert into public.expense_payments (expense_id, trip_id, paid_by, amount) values (v_hotel, v_trip, m_v, 1000);
  exception when others then v_err := sqlstate || ' ' || sqlerrm;
  end;
  if v_err is null or v_err not like '42501%' then
    raise exception 'FAIL PAY-08: viewer ghi nhận được thanh toán (%)', coalesce(v_err, 'thành công');
  end if;
  select count(*) into v_cnt from public.expense_payments where expense_id = v_hotel;
  if v_cnt <> 2 then raise exception 'FAIL PAY-08: viewer không đọc được các đợt (% dòng)', v_cnt; end if;

  -- ---------- PAY-09: thành viên chỉ có 1 đợt thanh toán (không có phần chia) → không xóa được ----------
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'email', eb, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.expense_payments (expense_id, trip_id, paid_by, amount) values (v_hotel, v_trip, m_x, 100000);

  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'email', ea, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_err := null;
  begin
    delete from public.trip_members where id = m_x;
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%đã phát sinh%' then
    raise exception 'FAIL PAY-09: xóa được thành viên đã trả tiền (%)', coalesce(v_err, 'thành công');
  end if;

  -- ---------- PAY-10: người ngoài không thấy các đợt ----------
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', c, 'email', ec, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_cnt from public.expense_payments where trip_id = v_trip;
  if v_cnt <> 0 then raise exception 'FAIL PAY-10: người ngoài đọc được % đợt', v_cnt; end if;

  -- ---------- PAY-11: Owner xóa chuyến đi → các đợt cũng bị xóa ----------
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'email', ea, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.trips where id = v_trip;
  reset role;
  select count(*) into v_cnt from public.expense_payments where trip_id = v_trip;
  if v_cnt <> 0 then raise exception 'FAIL PAY-11: còn % đợt sau khi xóa chuyến đi', v_cnt; end if;

  raise exception 'PASS – tất cả kịch bản PAY-01 → PAY-11 đạt. Đây là lỗi có chủ đích để hoàn tác toàn bộ dữ liệu test.';
end
$test$;
