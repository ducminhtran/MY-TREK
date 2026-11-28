-- =====================================================================
-- My Trek – 002_date_format_messages.sql
-- Đổi định dạng ngày trong thông báo lỗi BR-14 sang dd-MM-yyyy (đồng bộ giao diện).
-- Chỉ thay nội dung hàm trigger; KHÔNG đổi kiểu dữ liệu – cột ngày vẫn lưu kiểu date (YYYY-MM-DD).
-- Chạy 1 lần: Supabase → SQL Editor → dán toàn bộ → Run.
-- =====================================================================

create or replace function public.itinerary_items_check_day()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_start date;
  v_end   date;
begin
  if tg_op = 'INSERT' or new.day_date is distinct from old.day_date then
    select t.start_date, t.end_date into v_start, v_end from public.trips t where t.id = new.trip_id;
    if new.day_date < v_start or new.day_date > v_end then
      raise exception 'Ngày của hoạt động phải nằm trong thời gian chuyến đi (% → %)',
        to_char(v_start, 'DD-MM-YYYY'), to_char(v_end, 'DD-MM-YYYY');
    end if;
  end if;
  return new;
end $$;

-- create or replace giữ nguyên quyền; thu hồi lại cho chắc (hàm trigger không gọi trực tiếp)
revoke execute on function public.itinerary_items_check_day() from public, anon, authenticated;
