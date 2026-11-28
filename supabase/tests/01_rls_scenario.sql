-- =====================================================================
-- My Trek – Kiểm thử CSDL + RLS (mục 8.6)
-- Cách chạy: Supabase → SQL Editor → New query → dán TOÀN BỘ file → Run.
--
-- Toàn bộ chạy trong 1 transaction và LUÔN kết thúc bằng một lỗi có chủ đích
-- để ROLLBACK – không để lại user/dữ liệu test nào.
--   • Thành công: thông báo lỗi bắt đầu bằng "PASS"
--   • Thất bại  : thông báo lỗi bắt đầu bằng "FAIL DB-xx" kèm lý do
-- Giả lập người dùng bằng: set local role authenticated + request.jwt.claims
-- =====================================================================
do $test$
declare
  a  uuid := gen_random_uuid();   -- Owner
  b  uuid := gen_random_uuid();   -- Editor (được mời)
  v  uuid := gen_random_uuid();   -- Viewer (được mời)
  c  uuid := gen_random_uuid();   -- Người ngoài
  ea text := 'mytrek-test-a-' || a || '@example.com';
  eb text := 'mytrek-test-b-' || b || '@example.com';
  ev text := 'mytrek-test-v-' || v || '@example.com';
  ec text := 'mytrek-test-c-' || c || '@example.com';
  v_trip   uuid;
  m_a      uuid;
  m_b      uuid;
  m_v      uuid;
  m_off    uuid;   -- thành viên offline
  v_exp    uuid;
  v_exp2   uuid;
  item_v   uuid;
  item_x   uuid;
  v_cnt    int;
  v_num    numeric;
  v_txt    text;
  v_err    text;
begin
  -- ---------- Chuẩn bị: 4 tài khoản giả ----------
  insert into auth.users (id, email, raw_user_meta_data, aud, role) values
    (a, ea, '{"full_name":"Test A"}', 'authenticated', 'authenticated'),
    (b, eb, '{"full_name":"Test B"}', 'authenticated', 'authenticated'),
    (v, ev, '{"full_name":"Test V"}', 'authenticated', 'authenticated'),
    (c, ec, '{"full_name":"Test C"}', 'authenticated', 'authenticated');

  select count(*) into v_cnt from public.profiles where id in (a, b, v, c) and full_name like 'Test %';
  if v_cnt <> 4 then raise exception 'FAIL PROFILE: trigger tạo profiles không chạy (%/4)', v_cnt; end if;

  -- =========== DB-01: A tạo chuyến đi bằng insert ... returning ===========
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'email', ea, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.trips (name, destination, start_date, end_date)
  values ('Test Đà Lạt', 'Đà Lạt', '2026-12-19', '2026-12-21')
  returning id into v_trip;

  select id into m_a from public.trip_members where trip_id = v_trip and user_id = a and role = 'owner';
  if m_a is null then raise exception 'FAIL DB-01: không thấy A là owner trong trip_members'; end if;

  -- =========== DB-02: A thêm thành viên có user_id của người khác ===========
  v_err := null;
  begin
    insert into public.trip_members (trip_id, user_id, display_name, role) values (v_trip, c, 'C', 'editor');
  exception when others then v_err := sqlstate || ' ' || sqlerrm;
  end;
  if v_err is null or v_err not like '42501%' then
    raise exception 'FAIL DB-02: mong đợi lỗi RLS, thực tế: %', coalesce(v_err, 'thêm thành công');
  end if;

  -- A mời B (editor), V (viewer), thêm 1 thành viên offline
  insert into public.trip_members (trip_id, display_name, email, role)
  values (v_trip, 'Bạn B', upper(eb), 'editor') returning id into m_b;
  insert into public.trip_members (trip_id, display_name, email, role)
  values (v_trip, 'Bạn V', ev, 'viewer') returning id into m_v;
  insert into public.trip_members (trip_id, display_name, role)
  values (v_trip, 'Bé Na', 'viewer') returning id into m_off;

  select status into v_txt from public.trip_members where id = m_b;
  if v_txt <> 'invited' then raise exception 'FAIL MEM-02: B phải ở trạng thái invited, thực tế %', v_txt; end if;

  -- BR-03: email trùng (khác hoa/thường)
  v_err := null;
  begin
    insert into public.trip_members (trip_id, display_name, email, role) values (v_trip, 'B trùng', eb, 'viewer');
  exception when others then v_err := sqlstate || ' ' || sqlerrm;
  end;
  if v_err is null or v_err not like '%trip_members_trip_email%' then
    raise exception 'FAIL BR-03: mong đợi lỗi trùng email, thực tế: %', coalesce(v_err, 'thêm thành công');
  end if;

  -- =========== DB-04: B nhận lời mời ===========
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'email', eb, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_cnt from public.trips where id = v_trip;
  if v_cnt <> 0 then raise exception 'FAIL DB-04: B thấy chuyến đi trước khi chấp nhận'; end if;
  select count(*) into v_cnt from public.my_invitations() i where i.trip_id = v_trip;
  if v_cnt <> 1 then raise exception 'FAIL DB-04: my_invitations() của B trả % dòng', v_cnt; end if;

  perform public.accept_invitation(m_b);
  select count(*) into v_cnt from public.trips where id = v_trip;
  if v_cnt <> 1 then raise exception 'FAIL DB-04: B không thấy chuyến đi sau khi chấp nhận'; end if;

  -- C không được nhận lời mời của V
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', c, 'email', ec, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_err := null;
  begin
    perform public.accept_invitation(m_v);
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%không dành cho email%' then
    raise exception 'FAIL BR-11: C nhận được lời mời của V (%)', coalesce(v_err, 'thành công');
  end if;

  -- V nhận lời mời
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v, 'email', ev, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.accept_invitation(m_v);

  -- =========== DB-05: B (editor) save_expense chia đều VND + tùy chỉnh USD ===========
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'email', eb, 'role', 'authenticated')::text, true);
  set local role authenticated;

  v_exp := public.save_expense(
    jsonb_build_object('trip_id', v_trip, 'title', 'Ăn tối', 'category', 'an_uong', 'amount', 100000,
                       'currency', 'VND', 'exchange_rate', 1, 'paid_by', m_a, 'split_type', 'equal'),
    jsonb_build_array(
      jsonb_build_object('member_id', m_a,   'share_amount', 33334),
      jsonb_build_object('member_id', m_b,   'share_amount', 33333),
      jsonb_build_object('member_id', m_off, 'share_amount', 33333)));
  select amount_base into v_num from public.expenses where id = v_exp;
  if v_num is distinct from 100000 then raise exception 'FAIL DB-05: amount_base VND = %', v_num; end if;

  insert into public.trip_currencies (trip_id, currency, rate_to_base) values (v_trip, 'USD', 25400);

  v_exp2 := public.save_expense(
    jsonb_build_object('trip_id', v_trip, 'title', 'Vé tham quan', 'category', 'tham_quan', 'amount', 10.5,
                       'currency', 'USD', 'exchange_rate', 25400, 'paid_by', m_b, 'split_type', 'custom'),
    jsonb_build_array(
      jsonb_build_object('member_id', m_a, 'share_amount', 5.25),
      jsonb_build_object('member_id', m_b, 'share_amount', 5.25)));
  select amount_base into v_num from public.expenses where id = v_exp2;
  if v_num is distinct from 266700 then raise exception 'FAIL DB-05: amount_base USD = % (mong đợi 266700)', v_num; end if;

  -- Sửa khoản chi: thay toàn bộ phần chia
  perform public.save_expense(
    jsonb_build_object('id', v_exp, 'trip_id', v_trip, 'title', 'Ăn tối (sửa)', 'amount', 90000,
                       'currency', 'VND', 'paid_by', m_a, 'split_type', 'custom'),
    jsonb_build_array(
      jsonb_build_object('member_id', m_a,   'share_amount', 45000),
      jsonb_build_object('member_id', m_off, 'share_amount', 45000)));
  select count(*) into v_cnt from public.expense_splits where expense_id = v_exp;
  if v_cnt <> 2 then raise exception 'FAIL DB-05: sửa khoản chi còn % phần chia (mong đợi 2)', v_cnt; end if;

  -- =========== DB-06: tổng chia ≠ số tiền ===========
  v_err := null;
  begin
    perform public.save_expense(
      jsonb_build_object('trip_id', v_trip, 'title', 'Sai', 'amount', 100000, 'currency', 'VND', 'paid_by', m_a),
      jsonb_build_array(jsonb_build_object('member_id', m_a, 'share_amount', 90000)));
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like 'Tổng phần chia%' then
    raise exception 'FAIL DB-06: mong đợi lỗi tổng chia, thực tế: %', coalesce(v_err, 'lưu thành công');
  end if;

  -- BR-14: hoạt động ngoài thời gian chuyến đi
  v_err := null;
  begin
    insert into public.itinerary_items (trip_id, day_date, title) values (v_trip, '2026-12-25', 'Ngoài ngày');
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%thời gian chuyến đi%' then
    raise exception 'FAIL BR-14: %', coalesce(v_err, 'thêm được hoạt động ngoài ngày');
  end if;
  insert into public.itinerary_items (trip_id, day_date, title, category) values (v_trip, '2026-12-20', 'Đồi chè', 'tham_quan');

  -- Thanh toán: Bé Na trả A
  insert into public.settlements (trip_id, from_member, to_member, amount) values (v_trip, m_off, m_a, 45000);

  -- =========== DB-08: Editor đổi vai trò thành viên → 0 dòng ===========
  update public.trip_members set role = 'editor' where id = m_v;
  get diagnostics v_cnt = row_count;
  if v_cnt <> 0 then raise exception 'FAIL DB-08: editor đổi được vai trò (% dòng)', v_cnt; end if;

  -- =========== Checklist (Q-05) – A tạo 2 mục ===========
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'email', ea, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.checklist_items (trip_id, title, category, assignee_id)
  values (v_trip, 'Mang sạc dự phòng', 'hanh_ly', m_v) returning id into item_v;
  insert into public.checklist_items (trip_id, title, category, assignee_id)
  values (v_trip, 'Đặt phòng', 'viec_can_lam', m_b) returning id into item_x;

  -- =========== DB-07: Viewer save_expense / upload file → lỗi quyền ===========
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v, 'email', ev, 'role', 'authenticated')::text, true);
  set local role authenticated;

  v_err := null;
  begin
    perform public.save_expense(
      jsonb_build_object('trip_id', v_trip, 'title', 'Viewer', 'amount', 1000, 'currency', 'VND', 'paid_by', m_v),
      jsonb_build_array(jsonb_build_object('member_id', m_v, 'share_amount', 1000)));
  exception when others then v_err := sqlstate || ' ' || sqlerrm;
  end;
  if v_err is null or v_err not like '42501%' then
    raise exception 'FAIL DB-07: viewer lưu được khoản chi (%)', coalesce(v_err, 'thành công');
  end if;

  v_err := null;
  begin
    insert into storage.objects (bucket_id, name) values ('trip-files', v_trip || '/viewer.jpg');
  exception when others then v_err := sqlstate || ' ' || sqlerrm;
  end;
  if v_err is null or v_err not like '42501%' then
    raise exception 'FAIL DB-07: viewer upload file (%)', coalesce(v_err, 'thành công');
  end if;

  -- Q-05: viewer tick mục của mình được, mục người khác thì không
  perform public.set_checklist_done(item_v, true);
  select count(*) into v_cnt from public.checklist_items where id = item_v and is_done;
  if v_cnt <> 1 then raise exception 'FAIL Q-05: viewer không tick được mục của mình'; end if;

  v_err := null;
  begin
    perform public.set_checklist_done(item_x, true);
  exception when others then v_err := sqlstate || ' ' || sqlerrm;
  end;
  if v_err is null or v_err not like '42501%' then
    raise exception 'FAIL Q-05: viewer tick được mục của người khác (%)', coalesce(v_err, 'thành công');
  end if;
  update public.checklist_items set is_done = true where id = item_x;
  get diagnostics v_cnt = row_count;
  if v_cnt <> 0 then raise exception 'FAIL Q-05: viewer sửa trực tiếp checklist được'; end if;

  -- MEM-06: V chưa phát sinh chi tiêu → tự rời được
  delete from public.trip_members where id = m_v;
  get diagnostics v_cnt = row_count;
  if v_cnt <> 1 then raise exception 'FAIL MEM-06: viewer không rời chuyến đi được'; end if;

  -- =========== DB-09, DB-10, DB-11, DB-12, BR-10 (A – owner) ===========
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'email', ea, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- checklist giao cho V → assignee về NULL sau khi V rời
  select count(*) into v_cnt from public.checklist_items where id = item_v and assignee_id is null;
  if v_cnt <> 1 then raise exception 'FAIL CHK: assignee không về NULL khi thành viên rời'; end if;

  -- DB-09a: Owner hạ quyền chính mình
  v_err := null;
  begin
    update public.trip_members set role = 'editor' where id = m_a;
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%Chủ chuyến đi%' then
    raise exception 'FAIL DB-09: owner hạ quyền được (%)', coalesce(v_err, 'thành công');
  end if;

  -- DB-09b: Owner gắn tài khoản người khác vào thành viên offline
  v_err := null;
  begin
    update public.trip_members set user_id = c where id = m_off;
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%gắn tài khoản%' then
    raise exception 'FAIL DB-09: gắn được tài khoản người khác (%)', coalesce(v_err, 'thành công');
  end if;

  -- DB-10: Owner xóa thành viên đã có chi tiêu
  v_err := null;
  begin
    delete from public.trip_members where id = m_off;
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%đã phát sinh%' then
    raise exception 'FAIL DB-10: xóa được thành viên đã có chi tiêu (%)', coalesce(v_err, 'thành công');
  end if;

  -- DB-11: attachment có path thuộc trip khác
  v_err := null;
  begin
    insert into public.attachments (trip_id, storage_path, file_name, size_bytes)
    values (v_trip, gen_random_uuid() || '/abc-hoa-don.pdf', 'Hóa đơn.pdf', 1000);
  exception when others then v_err := sqlstate || ' ' || sqlerrm;
  end;
  if v_err is null or v_err not like '23514%' then
    raise exception 'FAIL DB-11: mong đợi lỗi CHECK, thực tế: %', coalesce(v_err, 'thêm thành công');
  end if;
  insert into public.attachments (trip_id, storage_path, file_name, size_bytes, expense_id)
  values (v_trip, v_trip || '/abc-hoa-don.pdf', 'Hóa đơn.pdf', 1000, v_exp);

  -- DB-12: Owner sửa owner_id → bị giữ nguyên
  update public.trips set owner_id = c, name = 'Test Đà Lạt 2' where id = v_trip;
  select count(*) into v_cnt from public.trips where id = v_trip and owner_id = a and name = 'Test Đà Lạt 2';
  if v_cnt <> 1 then raise exception 'FAIL DB-12: owner_id bị thay đổi'; end if;

  -- BR-10: đổi tiền tệ gốc khi đã có khoản chi
  v_err := null;
  begin
    update public.trips set base_currency = 'USD' where id = v_trip;
  exception when others then v_err := sqlerrm;
  end;
  if v_err is null or v_err not like '%tiền tệ gốc%' then
    raise exception 'FAIL BR-10: đổi được tiền tệ gốc (%)', coalesce(v_err, 'thành công');
  end if;

  -- =========== DB-03: C (không liên quan) đọc dữ liệu → 0 dòng ===========
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', c, 'email', ec, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select (select count(*) from public.trips where id = v_trip)
       + (select count(*) from public.trip_members where trip_id = v_trip)
       + (select count(*) from public.expenses where trip_id = v_trip)
       + (select count(*) from public.expense_splits where trip_id = v_trip)
       + (select count(*) from public.settlements where trip_id = v_trip)
       + (select count(*) from public.itinerary_items where trip_id = v_trip)
       + (select count(*) from public.checklist_items where trip_id = v_trip)
       + (select count(*) from public.trip_currencies where trip_id = v_trip)
       + (select count(*) from public.attachments where trip_id = v_trip)
       + (select count(*) from storage.objects where name like v_trip || '/%')
    into v_cnt;
  if v_cnt <> 0 then raise exception 'FAIL DB-03: người ngoài đọc được % dòng', v_cnt; end if;

  update public.trips set name = 'Hack' where id = v_trip;
  get diagnostics v_cnt = row_count;
  if v_cnt <> 0 then raise exception 'FAIL DB-03: người ngoài sửa được chuyến đi'; end if;

  -- =========== DB-13: Owner xóa chuyến đi có đủ dữ liệu ===========
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'email', ea, 'role', 'authenticated')::text, true);
  set local role authenticated;

  delete from public.trips where id = v_trip;
  get diagnostics v_cnt = row_count;
  if v_cnt <> 1 then raise exception 'FAIL DB-13: owner không xóa được chuyến đi'; end if;

  reset role;
  select (select count(*) from public.trip_members where trip_id = v_trip)
       + (select count(*) from public.expenses where trip_id = v_trip)
       + (select count(*) from public.expense_splits where trip_id = v_trip)
       + (select count(*) from public.settlements where trip_id = v_trip)
       + (select count(*) from public.itinerary_items where trip_id = v_trip)
       + (select count(*) from public.checklist_items where trip_id = v_trip)
       + (select count(*) from public.trip_currencies where trip_id = v_trip)
       + (select count(*) from public.attachments where trip_id = v_trip)
    into v_cnt;
  if v_cnt <> 0 then raise exception 'FAIL DB-13: còn % dòng con sau khi xóa', v_cnt; end if;

  -- ---------- Kết thúc: lỗi có chủ đích để ROLLBACK ----------
  raise exception 'PASS – tất cả kịch bản DB-01 → DB-13 (+ BR-03, BR-10, BR-11, BR-14, Q-05, MEM-06) đạt. Đây là lỗi có chủ đích để hoàn tác toàn bộ dữ liệu test.';
end
$test$;
