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

Sẽ bổ sung ở Giai đoạn 2 (chạy migration, cấu hình Auth, Storage).

## 4. Icon PWA

Icon PNG trong `public/` được tạo từ thiết kế của `public/favicon.svg` bằng script PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
```
