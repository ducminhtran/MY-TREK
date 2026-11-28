# UAT – My Trek

Checklist kiểm thử chấp nhận trước khi đưa vào dùng thật.

| Mục | Giá trị |
|-|-|
| Địa chỉ | https://ducminhtran.github.io/MY-TREK/ |
| Thiết bị | ① Điện thoại thật (Android Chrome **và/hoặc** iPhone Safari) ② Máy tính (Chrome/Edge, cửa sổ ≥ 1280px) |
| Tài khoản | **A** (chủ chuyến đi) và **B** (được mời) – 2 email thật khác nhau |
| Chuẩn bị | SMTP đã cấu hình, "Confirm email" đã bật (README mục 3.2–3.3) |

Cách ghi: điền **Đạt / Lỗi** vào cột Kết quả; nếu lỗi, ghi ngắn hiện tượng và chụp màn hình.

## 1. Tài khoản

| # | Thao tác | Kết quả mong đợi | Kết quả |
|-|-|-|-|
| 1.1 | Điện thoại: mở địa chỉ app | Trang Đăng nhập, chữ không bị tràn ngang | |
| 1.2 | Đăng ký A: họ tên, email, mật khẩu 7 ký tự | Báo "Mật khẩu cần ít nhất 8 ký tự" | |
| 1.3 | Đăng ký A với mật khẩu ≥ 8 ký tự | Màn hình "Kiểm tra email" | |
| 1.4 | Mở email xác nhận trên **cùng trình duyệt**, bấm link | Tự đăng nhập, vào "Chuyến đi của tôi" | |
| 1.5 | Đăng xuất → đăng nhập sai mật khẩu | "Email hoặc mật khẩu không đúng" | |
| 1.6 | Quên mật khẩu → mở link email → đặt mật khẩu mới → đăng nhập lại | Thành công | |
| 1.7 | Tài khoản → sửa họ tên | Báo "Đã lưu họ tên"; máy tính: tên mới ở góc phải header | |
| 1.8 | Đóng hẳn trình duyệt, mở lại app | Vẫn đăng nhập | |
| 1.9 | Đăng ký B (trình duyệt khác / ẩn danh) | Thành công như 1.3–1.4 | |

## 2. Chuyến đi và thành viên

| # | Thao tác | Kết quả mong đợi | Kết quả |
|-|-|-|-|
| 2.1 | A: Tạo chuyến đi (ngày kết thúc trước ngày bắt đầu) | Báo lỗi ngày | |
| 2.2 | A: Tạo chuyến đi hợp lệ, ngân sách `5.000.000` | Mở trang chi tiết, tab Tổng quan | |
| 2.3 | Tab Thành viên → thêm B (email của B, "Được chỉnh sửa") | Trạng thái "Đang chờ" | |
| 2.4 | Thêm "Bé Na" không email | Trạng thái "Không dùng app" | |
| 2.5 | Thêm lại email của B (viết hoa) | Báo "Email này đã có trong danh sách thành viên" | |
| 2.6 | Bấm "Sao chép lời mời" → dán vào Zalo | Có tên chuyến, link app, email của B | |
| 2.7 | B: trang chủ hiện khối "Lời mời" → Chấp nhận | Mở được chuyến đi, vai trò "Được chỉnh sửa" | |
| 2.8 | Màn hình 360px: thanh tab của chuyến đi | Cuộn ngang được, không vỡ bố cục | |

## 3. Lịch trình và bản đồ

| # | Thao tác | Kết quả mong đợi | Kết quả |
|-|-|-|-|
| 3.1 | B: Lịch trình → Thêm hoạt động "Chợ Đà Lạt" → **Tìm tọa độ** → chọn kết quả | Vĩ độ / kinh độ được điền | |
| 3.2 | Thêm 3 hoạt động cùng 1 ngày, giờ khác nhau (1 hoạt động không có giờ) | Sắp theo giờ, hoạt động không giờ nằm cuối; tổng chi phí dự kiến đúng | |
| 3.3 | Bấm "Chỉ đường" | Mở Google Maps đúng địa điểm | |
| 3.4 | Tab Bản đồ | Marker có số; bấm marker hiện popup | |
| 3.5 | Lọc 1 ngày | Các điểm được nối bằng đường thẳng theo thứ tự giờ | |

## 4. Chi tiêu và chia tiền

| # | Thao tác | Kết quả mong đợi | Kết quả |
|-|-|-|-|
| 4.1 | Cài đặt → thêm tỷ giá USD = `25.400` | Hiện "1 USD = 25.400 VND" | |
| 4.2 | Chi tiêu → 300.000 VND, A trả, chia đều A, B, Bé Na | Mỗi người 100.000 ₫ | |
| 4.3 | 10 USD, B trả, chia đều 3 người | 3,34 / 3,33 / 3,33 US$; danh sách hiện "≈ 254.000 ₫" | |
| 4.4 | 500.000 VND chia tùy chỉnh, nhập lệch | Hiện "Còn thiếu…" hoặc "Thừa…", không lưu được; sửa khớp thì lưu được | |
| 4.5 | Tab Chia tiền | Tổng cột "Còn lại" = 0; có gợi ý chuyển tiền | |
| 4.6 | Bấm "Đã trả" cho từng gợi ý | Mọi số dư về 0; "không ai nợ ai" | |
| 4.7 | "Sao chép bảng chia tiền" → dán Zalo | Văn bản đọc được, đúng số | |
| 4.8 | Tổng quan | Tổng chi, chi theo hạng mục, so với ngân sách đúng | |
| 4.9 | Cài đặt → đổi tiền tệ gốc | Ô bị khóa, ghi chú "đã có khoản chi" | |
| 4.10 | Thành viên → A xóa "Bé Na" | Bị chặn, báo "đã phát sinh chi tiêu…" | |
| 4.11 | Thêm "Khách sạn" 5.000.000, chia đều 5 người → **Đặt cọc / nhiều đợt** → Đợt 1: 1.000.000, A trả; hạn trả = ngày nhận phòng | Nhãn "Đã cọc"; "Đã trả 1.000.000 · còn 4.000.000"; mục **Sắp phải trả** có khoản này | |
| 4.12 | Tab Chi tiêu – ô tổng hợp | Tổng chi phí = Đã thực chi + Còn phải trả | |
| 4.13 | Tab Chia tiền ngay sau khi cọc | Mỗi người chỉ chịu 200.000 (20% phần của mình); tổng "Còn lại" = 0 | |
| 4.14 | Bấm **Ghi nhận thanh toán** trên khoản khách sạn → B trả 4.000.000 | Nhãn "Đã trả đủ"; biến mất khỏi Sắp phải trả; Chia tiền: mỗi người chịu đủ 1.000.000 | |
| 4.15 | Ghi nhận thanh toán vượt phần còn lại | Báo lỗi, không lưu | |
| 4.16 | Thêm khoản "Vé xe" → Đặt cọc / nhiều đợt → xóa hết đợt (chưa trả) | Nhãn "Chưa trả"; không ảnh hưởng bảng Chia tiền | |
| 4.17 | Tab Tổng quan | Có Đã thực chi / Còn phải trả / Dự chi, Sắp phải trả, dòng "Dự kiến từ lịch trình" (nếu lịch trình có chi phí dự kiến) | |
| 4.18 | Chi tiêu → mục **Dự chi** → **Thêm dự chi** "Ăn uống ngày 2" ~1.500.000 | Hiện trong mục Dự chi (nhãn xám, "~1.500.000 ₫"); **không** nằm trong danh sách chi thật | |
| 4.19 | Ô tổng hợp | Tổng dự kiến = Đã thực chi + Còn phải trả + Dự chi; dòng "Ngân sách … còn lại … sau dự kiến" (vượt thì đỏ) | |
| 4.20 | Tab Chia tiền sau khi thêm dự chi | Không thay đổi | |
| 4.21 | Bấm **Đã chi** trên khoản dự chi → sửa số tiền thực tế 1.350.000, trả đủ 1 lần | Biến khỏi mục Dự chi, vào danh sách chi thật (nhãn Đã trả đủ); Chia tiền cập nhật | |

## 5. Checklist và tệp

| # | Thao tác | Kết quả mong đợi | Kết quả |
|-|-|-|-|
| 5.1 | Checklist trống → "Thêm mẫu gợi ý" | 10 mục chia 3 nhóm | |
| 5.2 | Thêm nhanh 1 việc, giao cho B, hạn hôm qua | Hiện tên B, hạn tô đỏ "(quá hạn)" | |
| 5.3 | Tick vài mục | Gạch ngang, thanh tiến độ tăng | |
| 5.4 | A đổi B thành "Chỉ xem" → B tick mục của mình / mục người khác | Mục của mình tick được; mục khác bị khóa | |
| 5.5 | Điện thoại: Tệp → Tải lên → **Chụp ảnh** hóa đơn, gắn với 1 khoản chi | Tải lên thành công; khoản chi có icon kẹp giấy | |
| 5.6 | Bấm mở tệp (iPhone: dùng Safari) | Ảnh mở ở tab mới | |
| 5.7 | Chọn tệp > 10 MB | Báo lỗi, không tải lên | |
| 5.8 | Xóa tệp | Tệp biến mất | |

## 6. PWA và offline

| # | Thao tác | Kết quả mong đợi | Kết quả |
|-|-|-|-|
| 6.1 | Android: Tài khoản → **Cài ứng dụng** | Icon My Trek trên màn hình chính, mở toàn màn hình | |
| 6.2 | iPhone Safari: Chia sẻ → Thêm vào MH chính | Như trên | |
| 6.3 | Mở 1 chuyến đi và các tab → bật Chế độ máy bay → đóng hẳn app → mở lại | Banner "Bạn đang offline…"; vẫn xem được các tab đã mở | |
| 6.4 | Khi offline | Không thấy nút thêm / sửa / xóa; Tạo chuyến đi báo cần mạng | |
| 6.5 | Bật mạng lại | Banner biến mất, các nút hiện lại | |
| 6.6 | Đăng xuất | Về trang Đăng nhập; đăng nhập tài khoản khác không thấy dữ liệu cũ | |

## 7. Dọn dẹp

| # | Thao tác | Kết quả mong đợi | Kết quả |
|-|-|-|-|
| 7.1 | B: Rời chuyến đi (khi chưa có chi tiêu liên quan – dùng chuyến đi khác để thử) | Chuyến đi biến mất khỏi danh sách của B | |
| 7.2 | A: Cài đặt → Xóa chuyến đi → gõ lại tên | Chuyến đi bị xóa, tệp đính kèm cũng bị xóa | |

## Kết luận

| Mục | Ghi nhận |
|-|-|
| Người thực hiện | |
| Ngày | |
| Số mục Đạt / Tổng | / 59 |
| Lỗi cần sửa | |
