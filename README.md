# My Trek

Web app quản lý chuyến du lịch cho cá nhân, gia đình và nhóm bạn đi chung. Dùng tốt trên điện thoại và cài được như một ứng dụng (PWA).

| | |
|-|-|
| Địa chỉ | https://ducminhtran.github.io/MY-TREK/ |
| Repo | https://github.com/ducminhtran/MY-TREK |
| Chi phí vận hành | 0đ (GitHub Pages + Supabase gói Free) |
| Kiểm thử chấp nhận | [UAT.md](UAT.md) |

## Mục lục

1. [Chức năng](#1-chức-năng)
2. [Công nghệ và cấu trúc](#2-công-nghệ-và-cấu-trúc)
3. [Cài đặt Supabase (làm 1 lần)](#3-cài-đặt-supabase-làm-1-lần)
4. [Deploy lên GitHub Pages](#4-deploy-lên-github-pages)
5. [Cập nhật code về sau](#5-cập-nhật-code-về-sau)
6. [Chạy trên máy (tùy chọn)](#6-chạy-trên-máy-tùy-chọn)
7. [Sự cố thường gặp](#7-sự-cố-thường-gặp)
8. [Giới hạn và lưu ý](#8-giới-hạn-và-lưu-ý)
9. [Hướng phát triển](#9-hướng-phát-triển)

---

## 1. Chức năng

| Nhóm | Nội dung |
|-|-|
| Tài khoản | Đăng ký (xác nhận email), đăng nhập, quên mật khẩu, đổi họ tên / mật khẩu, cài ứng dụng, đăng xuất |
| Chuyến đi | Danh sách theo nhóm Đang diễn ra / Sắp tới / Đã qua; tạo, sửa, xóa; tab Tổng quan (chi so với ngân sách, chi theo hạng mục, checklist, hoạt động sắp tới) |
| Thành viên | Vai trò Chủ chuyến đi / Được chỉnh sửa / Chỉ xem; mời bằng email (sao chép lời mời gửi Zalo); thành viên không dùng app (trẻ em, ông bà…) |
| Lịch trình | Hoạt động theo từng ngày, giờ, địa điểm; tìm tọa độ; chỉ đường Google Maps; chi phí dự kiến |
| Bản đồ | Các điểm đánh số, lọc theo ngày, nối tuyến trong ngày |
| Chi tiêu | Đa tiền tệ, tỷ giá chốt theo từng khoản; chia đều hoặc tùy chỉnh |
| Chia tiền | Bảng cân đối, gợi ý ai chuyển cho ai (ít giao dịch nhất), ghi nhận đã trả, sao chép kết quả |
| Checklist | Hành lý / Giấy tờ / Việc cần làm; giao người phụ trách, hạn; mẫu gợi ý |
| Tệp | Ảnh, PDF… tối đa 10 MB; chụp ảnh trực tiếp trên điện thoại; gắn với khoản chi / hoạt động |
| Offline | Xem lại dữ liệu đã mở khi mất mạng; tự khóa các nút ghi dữ liệu |

### Phân quyền

| Chức năng | Chủ chuyến đi | Được chỉnh sửa | Chỉ xem |
|-|:-:|:-:|:-:|
| Xem toàn bộ | ✔ | ✔ | ✔ |
| Sửa thông tin, tỷ giá, lịch trình, chi tiêu, thanh toán, checklist, tệp | ✔ | ✔ | ✘ |
| Tick checklist được giao cho mình | ✔ | ✔ | ✔ |
| Thêm / sửa / xóa thành viên | ✔ | ✘ | ✘ |
| Xóa chuyến đi | ✔ | ✘ | ✘ |
| Rời chuyến đi | ✘ | ✔ | ✔ |

Quyền được kiểm soát ở máy chủ (Row Level Security của Supabase), không chỉ ẩn nút trên giao diện.

---

## 2. Công nghệ và cấu trúc

React + Vite + TypeScript · Tailwind CSS v4 · React Router · TanStack Query · Supabase (Auth, Postgres, RLS, Storage) · Leaflet + OpenStreetMap · vite-plugin-pwa · Vitest · GitHub Actions.

```text
├─ .github/workflows/deploy.yml   # build + deploy tự động khi push nhánh main
├─ public/                        # favicon, icon PWA
├─ scripts/generate-icons.ps1     # tạo lại icon PNG từ thiết kế favicon
├─ supabase/
│  ├─ migrations/001_init.sql     # CSDL: bảng, RLS, RPC, Storage
│  └─ tests/01_rls_scenario.sql   # kiểm thử quyền (chạy trên SQL Editor)
├─ src/
│  ├─ lib/        # logic thuần: định dạng, chia tiền, cân đối, lỗi… (+ unit test *.test.ts)
│  ├─ hooks/      # truy vấn dữ liệu (TanStack Query)
│  ├─ auth/       # phiên đăng nhập, bảo vệ route
│  ├─ components/ # thành phần giao diện dùng chung
│  └─ pages/      # các màn hình; pages/trip/ = các tab của chuyến đi
├─ PROMPT.md      # yêu cầu gốc
├─ PROGRESS.md    # tiến độ và quyết định đã chốt
└─ UAT.md         # checklist kiểm thử chấp nhận
```

---

## 3. Cài đặt Supabase (làm 1 lần)

Project hiện tại: `https://rpfxgqrypwsmiwzcflty.supabase.co` (đã cài đặt). Mục này dùng khi tạo project mới.

### 3.1 Tạo CSDL

| Bước | Thao tác |
|-|-|
| 1 | Tạo project tại supabase.com, region **Singapore** |
| 2 | **SQL Editor** → New query → dán toàn bộ `supabase/migrations/001_init.sql` → **Run**. Đúng: "Success. No rows returned" |
| 3 | **Table Editor** có 10 bảng: profiles, trips, trip_members, trip_currencies, itinerary_items, expenses, expense_splits, settlements, checklist_items, attachments |
| 4 | **Storage** có bucket `trip-files` (Private) |
| 5 | Kiểm thử: New query → dán toàn bộ `supabase/tests/01_rls_scenario.sql` → **Run** |

> Migration chỉ chạy 1 lần; chạy lại sẽ báo "already exists". Thay đổi CSDL về sau là file mới `002_...sql`.

Kết quả kiểm thử luôn hiện dưới dạng **thông báo lỗi có chủ đích** để hoàn tác dữ liệu test:

| Thông báo | Ý nghĩa |
|-|-|
| `PASS – tất cả kịch bản DB-01 → DB-13 ...` | Đạt |
| `FAIL DB-xx: ...` hoặc lỗi khác | Không đạt – sao chép nguyên thông báo để xử lý |

### 3.2 Cấu hình đăng nhập

| Bước | Thao tác |
|-|-|
| 1 | Authentication → **URL Configuration** → Site URL: `https://ducminhtran.github.io/MY-TREK/` |
| 2 | Cùng trang → **Redirect URLs** → thêm `https://ducminhtran.github.io/MY-TREK/**` và `http://localhost:5173/**` |
| 3 | Authentication → **Sign In / Providers** → Email: bật Email, **bật "Confirm email"**, độ dài mật khẩu tối thiểu = 8 |
| 4 | Cấu hình SMTP riêng (mục 3.3) |

### 3.3 Gửi email bằng SMTP riêng

SMTP mặc định của Supabase chỉ gửi vài email mỗi giờ. Khi bật "Confirm email" cần SMTP riêng để người dùng nhận được email xác nhận và đặt lại mật khẩu.

Authentication → **Emails** → **SMTP Settings** → bật **Enable custom SMTP**:

| Mục | Cách A – Gmail | Cách B – Brevo (300 email/ngày) |
|-|-|-|
| Chuẩn bị | Gmail đã bật xác minh 2 bước → myaccount.google.com → Bảo mật → **Mật khẩu ứng dụng** → tạo mật khẩu 16 ký tự | brevo.com → Senders → xác minh email gửi → SMTP & API → tạo **SMTP key** |
| Sender email | Địa chỉ Gmail | Email đã xác minh |
| Sender name | `My Trek` | `My Trek` |
| Host / Port | `smtp.gmail.com` / `587` | `smtp-relay.brevo.com` / `587` |
| Username | Địa chỉ Gmail | SMTP login (dạng `xxxx@smtp-brevo.com`) |
| Password | Mật khẩu ứng dụng | SMTP key |

Sau đó: Authentication → **Rate Limits** → tăng "Rate limit for sending emails" (VD 30/giờ).

---

## 4. Deploy lên GitHub Pages

### 4.1 Chuẩn bị repo (làm 1 lần)

| Bước | Thao tác |
|-|-|
| 1 | Repo ở chế độ **Public** (GitHub Pages miễn phí không hỗ trợ repo private) |
| 2 | Settings → **Pages** → Source: **GitHub Actions** (không chọn "Deploy from a branch") |
| 3 | Settings → **Secrets and variables → Actions** → tab **Secrets** → New repository secret: |
| | `VITE_SUPABASE_URL` = `https://rpfxgqrypwsmiwzcflty.supabase.co` |
| | `VITE_SUPABASE_ANON_KEY` = publishable key (`sb_publishable_...`) ở Supabase → Project Settings → API Keys |

Chỉ dùng **publishable / anon key**. Không bao giờ dùng secret / service_role key.

### 4.2 Workflow

Mỗi lần có commit vào `main`, workflow **Deploy GitHub Pages** tự chạy: cài thư viện → typecheck → unit test → build → deploy. Xem ở tab **Actions**; dấu tích xanh là xong, sau 1–2 phút trang web cập nhật.

Chạy lại bằng tay: Actions → Deploy GitHub Pages → **Run workflow**.

---

## 5. Cập nhật code về sau

Máy dev không cài Git, code được tải lên qua giao diện web GitHub:

| Bước | Thao tác |
|-|-|
| 1 | Repo → **Add file → Upload files** |
| 2 | Kéo thả các file / thư mục đã thay đổi vào **đúng thư mục tương ứng** trên repo (file trùng tên sẽ bị ghi đè) |
| 3 | **Không** tải lên: `.env.local`, `node_modules`, `dist` |
| 4 | Commit thẳng vào `main` → chờ Actions xanh |

**Lưu ý thư mục ẩn:** kéo thả trên trình duyệt có thể làm mất thư mục bắt đầu bằng dấu chấm (`.github`). Khi cần sửa workflow: mở file trên GitHub → biểu tượng bút chì → dán nội dung mới; hoặc **Add file → Create new file** và gõ đúng đường dẫn `.github/workflows/deploy.yml`.

**Xóa file:** mở file trên GitHub → menu **⋯** → **Delete file**.

---

## 6. Chạy trên máy (tùy chọn)

Cần Node.js LTS.

```bash
npm install
copy .env.example .env.local   # Windows; macOS/Linux dùng cp
# điền URL + publishable key vào .env.local
npm run dev                    # http://localhost:5173
```

| Lệnh | Tác dụng |
|-|-|
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm test` | Unit test (Vitest) |
| `npm run build` | Build ra thư mục `dist` |

Tạo lại icon PWA sau khi sửa `public/favicon.svg`: `powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1`

---

## 7. Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|-|-|
| Trang trắng, chỉ có tiêu đề "My Trek" | Pages đang ở "Deploy from a branch" hoặc thiếu `.github/workflows/deploy.yml` → xem mục 4.1 bước 2 và mục 5 |
| Hiện "Chưa cấu hình Supabase" | Thiếu / sai tên 2 secret, hoặc workflow chạy trước khi thêm secret → kiểm tra mục 4.1 bước 3 rồi **Run workflow** |
| Workflow đỏ | Mở lần chạy → job **build** → bước có dấu ✗ → đọc log lỗi |
| Không nhận được email xác nhận / đặt lại mật khẩu | Chưa cấu hình SMTP (mục 3.3) hoặc email vào mục Spam |
| Bấm link email nhưng không tự đăng nhập | Link phải mở trên **cùng trình duyệt** đã đăng ký / yêu cầu. Mở chỗ khác: email vẫn đã xác nhận, chỉ cần đăng nhập lại |
| Thấy giao diện cũ sau khi deploy | App là PWA: đóng hẳn rồi mở lại, hoặc **Ctrl + F5** |
| Không xóa được thành viên / không rời được chuyến đi | Thành viên đã có khoản chi, phần chia hoặc thanh toán (quy tắc BR-09) |
| Không đổi được tiền tệ gốc | Chuyến đi đã có khoản chi (tỷ giá đã chốt theo từng khoản) |
| Project Supabase "Paused" | Gói Free tạm dừng sau 7 ngày không dùng → vào supabase.com bấm **Restore project** |

---

## 8. Giới hạn và lưu ý

| Mục | Giới hạn |
|-|-|
| Supabase Free | 500 MB CSDL, 1 GB Storage, project tạm dừng sau 7 ngày không có truy cập |
| GitHub Pages | Repo phải public |
| Tệp đính kèm | ≤ 10 MB / tệp |
| Offline | Chỉ **xem** dữ liệu đã mở trước đó; không ghi được khi mất mạng |
| Lời mời | App chưa tự gửi email mời – dùng nút "Sao chép lời mời" rồi gửi qua Zalo/Messenger |
| Tìm tọa độ | Dịch vụ miễn phí Nominatim (OpenStreetMap), tối đa 1 lần/giây |

---

## 9. Hướng phát triển

Đồng bộ realtime · ghi dữ liệu khi offline · xuất Excel/PDF · tự lấy tỷ giá · gửi email mời tự động · chuyển quyền Chủ chuyến đi · kéo-thả sắp xếp lịch trình · đăng nhập Google · đọc hóa đơn bằng OCR · đóng gói app native · thông báo nhắc lịch · đa ngôn ngữ.
