# My Trek

Web app quản lý chuyến du lịch cho cá nhân, gia đình và nhóm bạn: lịch trình theo ngày, chi tiêu đa tiền tệ, chia tiền, checklist, bản đồ, tệp đính kèm. Dùng tốt trên điện thoại và cài được như app (PWA).

- Địa chỉ: https://ducminhtran.github.io/MY-TREK/
- Repo: https://github.com/ducminhtran/MY-TREK
- Chi phí vận hành: 0đ (GitHub Pages + Supabase gói Free)

> README đang ở dạng khung (Giai đoạn 1). Hướng dẫn Supabase và checklist UAT sẽ được bổ sung ở các giai đoạn sau.

## Công nghệ

React + Vite + TypeScript · Tailwind CSS v4 · React Router · TanStack Query · Supabase (Auth, Postgres, RLS, Storage) · Leaflet + OpenStreetMap · vite-plugin-pwa · Vitest · GitHub Actions.

## 1. Đưa code lên GitHub và deploy

### 1.1 Chuẩn bị repo (làm 1 lần)

| Bước | Thao tác |
|-|-|
| 1 | Repo `MY-TREK` phải ở chế độ **Public** (GitHub Pages miễn phí không hỗ trợ repo private) |
| 2 | Settings → Pages → Source: chọn **GitHub Actions** |
| 3 | (Từ Giai đoạn 2) Settings → Secrets and variables → Actions → New repository secret: thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` |

### 1.2 Tải code lên (máy chưa cài Git)

| Bước | Thao tác |
|-|-|
| 1 | Mở https://github.com/ducminhtran/MY-TREK → **Add file → Upload files** |
| 2 | Mở thư mục `D:\Claude\quan-ly-du-lich` trong File Explorer, chọn **toàn bộ** file và thư mục bên trong (kể cả `.github`, `.gitignore`), kéo thả vào trang GitHub |
| 3 | **Không** tải lên: `node_modules`, `dist`, `.env.local` (nếu có) |
| 4 | Ghi chú commit, chọn *Commit directly to the main branch* → **Commit changes** |
| 5 | Kiểm tra repo có file `.github/workflows/deploy.yml`. Nếu thiếu (một số trình duyệt bỏ qua thư mục ẩn): **Add file → Create new file**, gõ tên `.github/workflows/deploy.yml`, dán nội dung file |
| 6 | Tab **Actions**: chờ workflow "Deploy GitHub Pages" chạy xong (dấu tích xanh) |
| 7 | Mở https://ducminhtran.github.io/MY-TREK/ |

Workflow tự chạy: cài thư viện → typecheck → unit test → build → deploy. Bước nào đỏ thì mở log của bước đó, sao chép lỗi gửi lại để sửa.

## 2. Chạy trên máy (khi đã cài Node.js LTS)

```bash
npm install
copy .env.example .env.local   # Windows; macOS/Linux dùng cp
# điền URL + anon key vào .env.local
npm run dev                    # http://localhost:5173
```

| Lệnh | Tác dụng |
|-|-|
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm test` | Chạy unit test (Vitest) |
| `npm run build` | Build ra thư mục `dist` |

## 3. Supabase

Project: `https://rpfxgqrypwsmiwzcflty.supabase.co`

### 3.1 Tạo CSDL (làm 1 lần)

| Bước | Thao tác |
|-|-|
| 1 | Supabase → **SQL Editor** → New query → dán toàn bộ `supabase/migrations/001_init.sql` → **Run**. Kết quả mong đợi: "Success. No rows returned" |
| 2 | Kiểm tra **Table Editor** có 10 bảng: profiles, trips, trip_members, trip_currencies, itinerary_items, expenses, expense_splits, settlements, checklist_items, attachments |
| 3 | Kiểm tra **Storage** có bucket `trip-files` (Private) |
| 4 | Chạy kiểm thử: New query → dán toàn bộ `supabase/tests/01_rls_scenario.sql` → **Run** (xem 3.2) |

> Migration chỉ chạy 1 lần. Chạy lại sẽ báo lỗi "already exists". Thay đổi CSDL về sau sẽ là file migration mới (`002_...sql`).

### 3.2 Đọc kết quả kiểm thử

Script kiểm thử luôn kết thúc bằng **một thông báo lỗi có chủ đích** để hoàn tác toàn bộ dữ liệu test (không để lại user hay chuyến đi giả).

| Thông báo | Ý nghĩa |
|-|-|
| `PASS – tất cả kịch bản DB-01 → DB-13 ...` | Đạt |
| `FAIL DB-xx: ...` | Không đạt – sao chép nguyên thông báo gửi lại để sửa |
| Lỗi khác | Sao chép nguyên thông báo gửi lại |

### 3.3 Cấu hình đăng nhập

| Bước | Thao tác |
|-|-|
| 1 | Authentication → **URL Configuration** → Site URL: `https://ducminhtran.github.io/MY-TREK/` |
| 2 | Cùng trang, **Redirect URLs** → Add URL: `https://ducminhtran.github.io/MY-TREK/**` và `http://localhost:5173/**` |
| 3 | Authentication → **Sign In / Providers** → Email: bật Email; độ dài mật khẩu tối thiểu = 8. "Confirm email" sẽ chốt ở Giai đoạn 3 (Q-03) |

### 3.4 Khóa cho GitHub Actions

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Name | Value |
|-|-|
| `VITE_SUPABASE_URL` | `https://rpfxgqrypwsmiwzcflty.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | publishable key (`sb_publishable_...`) ở Supabase → Project Settings → API Keys |

Chỉ dùng **publishable / anon key**. Không bao giờ dùng secret / service_role key.

## 4. Icon PWA

Icon PNG trong `public/` được tạo từ thiết kế của `public/favicon.svg` bằng script PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
```
