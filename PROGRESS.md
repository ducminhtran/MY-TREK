# PROGRESS – My Trek

> Cập nhật: 27/11/2026. Các quyết định trong file này **ghi đè** giá trị tương ứng trong PROMPT.md.

## Trạng thái giai đoạn

|GĐ|Nội dung|Trạng thái|
|-|-|-|
|1|Khởi tạo dự án|**Hoàn thành** (28/11/2026). Đã sửa: workflow upload sai vị trí + Pages "Deploy from a branch" → chuyển sang GitHub Actions; thêm Secrets. Workflow xanh (typecheck + test + build GĐ 1–3 pass), web hiện trang Đăng nhập|
|2|CSDL|**Hoàn thành** – migration chạy trên Supabase; test SQL PASS toàn bộ (28/11/2026)|
|3|Auth + Tài khoản|Đã deploy (Actions xanh). Người dùng chuyển sang GĐ 4, **chưa xác nhận UAT 8 bước** của GĐ 3; SMTP (Gmail/Brevo) chưa chốt|
|4|Chuyến đi + Thành viên + Lời mời + Tổng quan + Cài đặt|Code xong. Người dùng chuyển sang GĐ 5, **chưa xác nhận** Actions xanh + thử 2 tài khoản|
|5|Lịch trình + Bản đồ|Code xong. Người dùng chuyển sang GĐ 6, **chưa xác nhận** Actions xanh + UAT|
|6|Chi tiêu đa tiền tệ + Chia tiền + Thanh toán|Code xong. Người dùng chuyển sang GĐ 7, **chưa xác nhận** Actions xanh + UAT|
|7|Checklist + Tệp đính kèm|Code xong. Người dùng chuyển sang GĐ 8, **chưa xác nhận** Actions xanh + UAT|
|8|Hoàn thiện PWA/offline, README, UAT|Code + tài liệu xong – chờ upload, Actions xanh, người dùng chạy [UAT.md](UAT.md)|

## Môi trường

|Mục|Giá trị|
|-|-|
|Máy dev|Không có Node/npm, Git, PostgreSQL. Người dùng chọn **không cài** → không chạy typecheck/test/build cục bộ; kiểm tra bằng GitHub Actions|
|Cách đưa code lên|Upload qua giao diện web GitHub (README mục 1.2)|
|`package-lock.json`|Chưa có (không chạy được npm). Workflow dùng `npm install` khi thiếu lock file|
|Test SQL (GĐ 2)|Không có PostgreSQL cục bộ → cần phương án khác (hỏi ở GĐ 2)|

## Quyết định đã chốt

|Mã|Quyết định|Ngày|
|-|-|-|
|Q-02|Repo `https://github.com/ducminhtran/MY-TREK` → URL `https://ducminhtran.github.io/MY-TREK/`, base path `/MY-TREK/`|27/11/2026|
|Q-04|Tên app **My Trek**, tên ngắn PWA **My Trek**. Giữ màu teal `#0f766e`. Giao diện vẫn tiếng Việt|27/11/2026|
|Icon|Tự vẽ: núi + mặt trời trên nền teal (`public/favicon.svg`); PNG tạo bằng `scripts/generate-icons.ps1` (System.Drawing)|27/11/2026|
|Thư viện|Đồng ý dùng `@tailwindcss/vite`|27/11/2026|
|Kiểm tra|Không cài Node; dựa vào GitHub Actions (R-06 không thực hiện được cục bộ)|27/11/2026|
|BR-10|Chặn đổi `base_currency` khi đã có khoản chi ở cả server (trigger `BEFORE UPDATE` trên `trips`) và UI|27/11/2026|
|Q-05|Viewer được tick xong/chưa mục checklist giao cho chính mình, qua RPC `set_checklist_done(p_item_id, p_done)` (SECURITY DEFINER, chỉ đổi `is_done`); RLS `checklist_items` giữ nguyên. Frontend dùng RPC này cho mọi vai trò|28/11/2026|
|Q-01|Supabase `https://rpfxgqrypwsmiwzcflty.supabase.co` + publishable key; lưu ở `.env.local` (không commit) và GitHub Secrets|28/11/2026|
|Test SQL|Không dùng PostgreSQL cục bộ / file stub. Chạy `supabase/tests/01_rls_scenario.sql` trực tiếp trên Supabase SQL Editor, trong 1 transaction, kết thúc bằng lỗi có chủ đích để rollback|28/11/2026|
|Q-03|**Bật** xác nhận email + SMTP riêng (README 3.5: Gmail App Password hoặc Brevo – người dùng chọn)|28/11/2026|
|Đăng xuất|`signOut({ scope: 'local' })` – chỉ đăng xuất thiết bị hiện tại, không đá phiên ở máy khác|28/11/2026|
|Q-06|Không xuất Excel/PDF ở bản đầu (mặc định – Roadmap #3)|28/11/2026|
|Hạng mục chi tiêu|Dùng chung danh mục với lịch trình (di_chuyen, luu_tru, an_uong, tham_quan, mua_sam, khac) – PROMPT không liệt kê riêng|28/11/2026|

## Giai đoạn 1 – đã làm

|Hạng mục|Trạng thái|
|-|-|
|Vite + React + TS strict, Tailwind v4, React Router (BrowserRouter + basename), React Query|Xong|
|KT-01 (404.html fallback), KT-02 (base path), KT-05 (màn hình thiếu cấu hình)|Xong|
|PWA-01 manifest, PWA-02 service worker (NetworkFirst `/rest/v1/`, CacheFirst tile OSM)|Xong (cấu hình); kiểm tra thực tế ở GĐ 8|
|Layout responsive: header sticky, thanh điều hướng dưới (mobile), menu ngang (desktop), safe-area|Xong|
|Icon PWA 192/512/maskable/apple-touch|Xong|
|`format.ts` + unit test (ngày, tiền, tên file không dấu)|Xong|
|Workflow `.github/workflows/deploy.yml`|Xong|
|README khung|Xong|

## Giai đoạn 2 – đã làm

|Hạng mục|Trạng thái|
|-|-|
|`supabase/migrations/001_init.sql`: 10 bảng, trigger, RPC, RLS, bucket + policy Storage|Xong, chưa chạy|
|Trigger bổ sung: BR-10 (khóa tiền tệ gốc), BR-14 (ngày hoạt động), chuẩn hóa email + tự suy ra trạng thái thành viên, đồng bộ email vào profiles|Xong|
|`supabase/tests/01_rls_scenario.sql`: DB-01 → DB-13 + BR-03, BR-10, BR-11, BR-14, Q-05, MEM-06|Xong, chưa chạy|

## Giai đoạn 3 – đã làm

|ID|Trạng thái|Ghi chú|
|-|-|-|
|AUTH-01 Đăng ký|Xong|Phát hiện email đã đăng ký khi bật xác nhận (identities rỗng); màn hình "Kiểm tra email"|
|AUTH-02 Đăng nhập|Xong|Có nút "Gửi lại email xác nhận" khi email chưa xác nhận|
|AUTH-03 Quên mật khẩu|Xong|`/forgot-password` → link → `/reset-password`; link hết hạn/khác trình duyệt → báo + nút gửi lại|
|AUTH-04 Tài khoản|Xong|Sửa họ tên (profiles + user_metadata), đổi mật khẩu, Cài ứng dụng (PWA-04), Đăng xuất|
|AUTH-05 Đăng xuất|Xong|Xóa cache react-query + cache SW `supabase-api` (KT-14)|
|AUTH-06 Giữ phiên|Xong|`persistSession` + `autoRefreshToken`|
|AUTH-07 Bảo vệ route|Xong|`RequireAuth` → `/login`, quay lại trang cũ sau khi đăng nhập|
|KT-03 link email|Xong|Đọc `?code`/`?error_code` lúc tải trang; mở link trên thiết bị khác → "Email đã được xác nhận. Vui lòng đăng nhập"; xóa tham số khỏi URL|
|Mục 9.4 lỗi tiếng Việt|Xong|`lib/errors.ts` + unit test|

## Giai đoạn 4 – đã làm

|ID|Trạng thái|Ghi chú|
|-|-|-|
|TRIP-01|Xong|3 nhóm Đang diễn ra / Sắp tới / Đã qua; card tên, điểm đến, khoảng ngày, số ngày, vai trò|
|TRIP-02, TRIP-03, SET-01|Xong|`TripForm` dùng chung; ngân sách nhập kiểu "15.000.000"; khóa tiền tệ gốc khi đã có khoản chi (BR-10)|
|TRIP-04, SET-03|Xong|Gõ lại tên để xác nhận; xóa file Storage trước rồi xóa trips|
|TRIP-05|Xong|Số ngày, thành viên, checklist, chi tiêu so ngân sách (đỏ khi vượt), chi theo hạng mục, 3 hoạt động sắp tới|
|TRIP-06|Xong|9 tab cuộn ngang; Lịch trình/Chi tiêu/Chia tiền/Checklist/Bản đồ/Tệp đang là "sẽ có ở bản sau"|
|MEM-01 → MEM-06|Xong|Thêm (có email = lời mời, không email = offline), sửa, xóa, sao chép lời mời, rời chuyến đi; lỗi BR-09 hiện nguyên văn từ trigger|
|MEM-03|Xong|Khối "Lời mời" ở trang chủ: Chấp nhận → mở chuyến đi; Từ chối có xác nhận|
|SET-02|Xong|Thêm/sửa/xóa tỷ giá "1 USD = 25.400 VND"|
|Unit test|Xong|`lib/trips.test.ts`: phân nhóm chuyến đi, khoảng ngày, trạng thái thành viên, text lời mời, kiểm tra form, đọc số kiểu VN|

## Giai đoạn 5 – đã làm

|ID|Trạng thái|Ghi chú|
|-|-|-|
|ITI-01|Xong|Khối "Ngày N · T7, 19/12/2026" cho mọi ngày của chuyến đi; sắp theo giờ (không giờ xếp cuối) → sort_order; nhóm "Ngoài thời gian chuyến đi" (TRIP-03)|
|ITI-02|Xong|Form modal/bottom sheet; chọn ngày trong chuyến đi (giữ ngày cũ nếu đang nằm ngoài); kiểm tra giờ, tọa độ, chi phí|
|ITI-03|Xong|Nominatim, ≤ 5 kết quả, giãn cách ≥ 1 giây/lần gọi; không thấy → báo, nhập tay|
|ITI-04|Xong|Google Maps theo tọa độ, không có thì theo tên + địa chỉ|
|ITI-05|Xong|Chi phí dự kiến theo ngày + toàn chuyến|
|MAP-01 → MAP-06|Xong|Marker đánh số (divIcon), lọc ngày, nối tuyến khi lọc 1 ngày, popup + Chỉ đường, fit bounds / mặc định Việt Nam, danh sách thiếu tọa độ, attribution OSM|
|KT-16|Xong|`MapTab` lazy-load (`React.lazy`) – Leaflet + CSS tách chunk riêng|
|Thư viện|Thêm|`leaflet`, `react-leaflet`, `@types/leaflet` (có trong mục 4.1)|
|Unit test|Xong|`lib/itinerary.test.ts`|

## Giai đoạn 6 – đã làm

|ID|Trạng thái|Ghi chú|
|-|-|-|
|EXP-01|Xong|Nhóm theo ngày (mới nhất trước), lọc hạng mục, người trả, số người chia, nguyên tệ + quy đổi, icon kẹp giấy|
|EXP-02|Xong|Tiền tệ = gốc + các tiền tệ đã khai báo; tỷ giá tự điền, sửa được; tiền tệ gốc khóa = 1|
|EXP-03 / BR-05|Xong|Chia đều theo đơn vị nhỏ nhất, phần dư cho người đầu danh sách|
|EXP-04 / BR-06|Xong|Hiện "Còn thiếu / Thừa X"; chỉ lưu khi khớp 100% (RPC kiểm tra lại)|
|EXP-05|Xong|RPC `save_expense`; lỗi giữ nguyên form|
|EXP-06|Xong|Tổng chi quy đổi, số khoản, so ngân sách|
|BAL-01 / BR-07|Xong|Đã trả · Phải chịu · Đã chuyển · Đã nhận · Còn lại; chênh lệch quy đổi dồn vào phần chia cuối (theo member_id)|
|BAL-02 / BR-08|Xong|Greedy: người nợ nhiều nhất ↔ người nhận nhiều nhất|
|BAL-03, BAL-04|Xong|Bấm "Đã trả" trên gợi ý (có xác nhận) + form thủ công; lịch sử, xóa được|
|BAL-05|Xong|Sao chép bảng chia tiền ra text|
|BAL-06|Xong|Cảnh báo nếu tổng Còn lại ≠ 0 (không bao giờ xảy ra nếu logic đúng – có unit test)|
|Unit test|Xong|`lib/split.test.ts`: chia đều VND/USD/JPY, chênh lệch, số dư có ngoại tệ, thanh toán, gợi ý chuyển tiền, text|

## Giai đoạn 7 – đã làm

|ID|Trạng thái|Ghi chú|
|-|-|-|
|CHK-01|Xong|3 nhóm Hành lý / Giấy tờ / Việc cần làm; thanh tiến độ tổng + đếm theo nhóm|
|CHK-02|Xong|Thêm nhanh trên 1 dòng (mobile tự xuống dòng): tiêu đề, nhóm, người phụ trách, hạn|
|CHK-03|Xong|Tick qua RPC `set_checklist_done` (Q-05: Viewer chỉ tick mục của mình); gạch ngang khi xong; quá hạn tô đỏ; sửa (modal), xóa|
|CHK-04|Xong|"Thêm mẫu gợi ý" 10 mục khi checklist trống|
|FILE-01|Xong|Chọn tệp hoặc "Chụp ảnh" (capture camera); ≤ 10 MB; path `<trip_id>/<uuid>-<ten-khong-dau>`; gắn tùy chọn với khoản chi/hoạt động; ghi bảng lỗi → xóa object vừa tải|
|FILE-02|Xong|Icon theo loại, tên gốc, dung lượng, ngày giờ tải, gắn với gì|
|FILE-03 / KT-15|Xong|Mở tab trống ngay khi bấm rồi gán signed URL (5 phút)|
|FILE-04|Xong|Xóa object Storage rồi xóa dòng attachments|
|Dọn dẹp|Xong|Xóa `src/pages/trip/ComingSoonTab.tsx` (mọi tab đã có)|
|Unit test|Xong|`lib/files.test.ts`|

## Giai đoạn 8 – đã làm

|Hạng mục|Trạng thái|Ghi chú|
|-|-|-|
|PWA-03 banner offline|Xong|`hooks/useOnline.ts`; banner vàng dưới header|
|PWA-03 khóa nút ghi|Xong|`canEdit` = vai trò Owner/Editor **và** online; thêm `online` vào context chuyến đi (Thành viên, Cài đặt, tick checklist); Tạo chuyến đi, Lời mời, Sửa tên, Đổi mật khẩu cũng khóa khi offline|
|PWA-03 xem dữ liệu cũ|Xong|React Query `networkMode: 'offlineFirst'` → fetch vẫn chạy khi offline để Service Worker trả bản cache (NetworkFirst `/rest/v1/`). Lời mời (RPC POST) không cache – khối Lời mời ẩn khi offline|
|README|Xong|Viết lại đầy đủ: chức năng, phân quyền, cài Supabase, deploy, cập nhật code qua web, sự cố thường gặp, giới hạn, roadmap|
|UAT|Xong|`UAT.md` – 48 mục, 7 nhóm|
|Rà soát responsive|Rà mã|Bảng cân đối cuộn ngang trên mobile; tab chuyến đi cuộn ngang; form dạng bottom sheet; vùng chạm ≥ 44px. **Chưa kiểm tra trên thiết bị thật** – thuộc UAT|
|Bundle < 300 KB gzip|Chưa đo|Không có Node cục bộ; xem log bước Build trên Actions (dòng `dist/assets/index-*.js … gzip:`)|

> 28/11/2026: người dùng báo **chưa phát hiện lỗi** trên bản deploy; lỗi phát sinh sẽ báo sau.

## Hình ảnh (28/11/2026)

|Hạng mục|Ghi chú|
|-|-|
|Nguồn|ChatGPT tạo: `assets-src/sprite-sheet.png` (8 hình, nền trong suốt) + `assets-src/app-icon.png` (1254×1254). Tách tự động bằng `assets-src/SpriteTool.cs` (C# qua PowerShell, System.Drawing)|
|Icon|`pwa-192/512` (bo góc 21,9%), `pwa-maskable-512`, `apple-touch-icon` (180), `favicon-64`. Header dùng `pwa-192.png` thay cho SVG vẽ tay|
|Minh họa|`public/illustrations/`: empty-trips, empty-expenses, empty-checklist, empty-files, email-sent, not-found, auth-hero. `EmptyState` có prop `image`|
|og-image|`public/og-image.jpg` 1200×630 (~70 KB), chèn chữ "My Trek" bằng code; thẻ `og:*` trong `index.html` (URL tuyệt đối theo repo MY-TREK)|
|PWA cache|Workbox precache thêm `png/svg/webp` (bỏ og-image) để ảnh minh họa xem được offline|
|Đã xóa|`public/favicon.svg`, `scripts/generate-icons.ps1` (thiết kế cũ)|

## Definition of Done (mục 15)

|Tiêu chí|Trạng thái|
|-|-|
|Toàn bộ ID mục 6 đạt tiêu chí|Đã code đủ; **chờ UAT**|
|Ma trận quyền đúng ở server (RLS)|Đạt – test SQL PASS (DB-01 → DB-13)|
|typecheck / test / build pass; Actions xanh|Đã xanh tới GĐ 3; GĐ 4–8 **chờ xác nhận**|
|Không có key bí mật trong repo; `.env*` bị ignore|Đạt – chỉ dùng publishable key; `.env.local` trong `.gitignore`|
|Chạy tốt 360px và 1280px; cài PWA Android + iOS|**Chờ UAT** (mục 2.8, 6.1, 6.2)|
|README tiếng Việt đủ cho người không chuyên|Đạt|
|PROGRESS.md cập nhật trạng thái cuối|Đạt|

## Ghi chú

- Ví dụ "T7, 20/12/2026" ở mục 4.3/ITI-01 của PROMPT.md: thực tế 20/12/2026 là **Chủ nhật** (CN). Test dùng 19/12/2026 = T7.
