# 07 — Design system và giao diện chấm công Marixa

## 1. Hướng thiết kế

Thiết kế dựa trên logo **Marixa** người dùng đã cung cấp: chữ M xanh lam chuyển cyan và ngôi sao vàng ở giữa. Skill `ui-ux-pro-max` được dùng để kiểm tra tính nhất quán, khả năng tiếp cận, vùng chạm và bố cục dashboard. Logo gốc hiện chưa là file trong workspace; các mã màu dưới đây là **màu thiết kế chọn từ ảnh xem trước**, cần đối chiếu với file logo gốc khi phát triển UI. Giao diện sản phẩm ưu tiên nền sáng, bảng rõ, ít trang trí; hiệu ứng chuyển sắc dành cho logo/điểm nhấn thương hiệu, không phủ nền lên bảng dữ liệu.

Nguyên tắc: một màn hình một hành động chính trên điện thoại; HR desktop thấy ngoại lệ và việc cần xử lý trước biểu đồ; mọi trạng thái phải có chữ giải thích. Không dùng màu hoặc icon đơn lẻ để thông báo thành công/lỗi. Giao diện tiếng Việt, ngày `dd/MM/yyyy`, giờ 24h, số phút/giờ hiển thị nhất quán.

## 2. Design tokens V1

| Token | Giá trị | Cách dùng |
| --- | --- | --- |
| `brand.primary` | `#1647C8` | Nút chính, link, focus, mục menu đang chọn. |
| `brand.cyan` | `#00BFD0` | Điểm nhấn phụ, đồ họa nhẹ; không dùng làm chữ nhỏ trên nền trắng. |
| `brand.gold` | `#F3B928` | Dấu nhấn thương hiệu và biểu tượng chú ý; không dùng làm màu chữ trạng thái. |
| `text.primary` | `#172033` | Nội dung chính. |
| `text.secondary` | `#526174` | Nội dung phụ, nhãn mô tả. |
| `surface.page` | `#F7F9FC` | Nền trang. |
| `surface.card` | `#FFFFFF` | Bảng, form, thanh trạng thái. |
| `border.default` | `#DCE3EC` | Viền bảng/form. |
| `state.success` | `#167347` | Đã đồng bộ/đã duyệt, luôn kèm chữ. |
| `state.warning` | `#9A5A00` | Chờ đồng bộ/ngoài văn phòng, luôn kèm chữ. |
| `state.error` | `#B42318` | Lỗi upload/từ chối, luôn kèm hướng xử lý. |
| `focus.ring` | `#1647C8` | Viền focus rõ trên nền sáng. |

Chữ dùng `Be Vietnam Pro` (hoặc font sans hệ thống nếu font không tải được) để hỗ trợ tiếng Việt. Cỡ chữ: nội dung 16 px, nhãn phụ 14 px, tiêu đề trang 24 px, tiêu đề section 18–20 px; dữ liệu thời gian dùng chữ số tabular. Thang khoảng cách 4/8/12/16/24/32 px; bo góc 8 px cho input/nút, 12 px cho card; bóng đổ chỉ ở menu/hộp nổi. Phần tử chạm chính tối thiểu 44×44 px, khoảng cách giữa hai nút chạm tối thiểu 8 px. Đảm bảo độ tương phản chữ thông thường tối thiểu 4,5:1 và focus hiển thị rõ.

## 3. Cấu trúc điều hướng

### Nhân viên và HR trên mobile

Bottom navigation tối đa bốn mục: **Hôm nay**, **Công của tôi**, **Đơn của tôi**, **Tài khoản**. HR có lối vào **Quản lý HR** từ trang tài khoản hoặc header; không nhồi bảng HR vào bottom nav. Ở `/today`, phần trên hiển thị ngày, giờ và trạng thái hiện tại; giữa màn hình là một nút chính **Chấm vào** hoặc **Chấm ra**; dưới là hai mốc công hôm nay, ảnh/GPS và thông báo đồng bộ. Chỉ hiện một CTA chính tại một thời điểm.

### HR và admin trên desktop

Sidebar gồm Tổng quan, Nhân viên, Chấm công, Đơn/yêu cầu, Bảng công, Báo cáo; admin có thêm Cấu hình, Tài khoản, Nhật ký. Header gọn với tên màn hình, kỳ/ngày đang xem, thông báo quan trọng và tài khoản. Bảng HR có search, filter, sorting, phân trang, cột trạng thái dễ quét; filter quan trọng nằm trong URL. Form hồ sơ/đơn dài chia section, thao tác duyệt có hộp xác nhận kèm lý do khi từ chối. Không dùng modal cho một quy trình dài.

## 4. Màn hình và trạng thái chính

| Màn hình | Ưu tiên nội dung | Trạng thái cần thiết |
| --- | --- | --- |
| Đăng nhập | Logo Marixa, email, mật khẩu, nút đăng nhập, link hướng dẫn liên hệ admin khi quên mật khẩu | Loading, sai thông tin, tài khoản bị khóa, lỗi mạng, bắt đổi mật khẩu tạm. |
| Hôm nay | Giờ và trạng thái, nút chấm lớn, preview camera, thông tin ảnh/GPS | Chưa chấm, đã vào, đã ra, xin quyền, đang lưu, local offline, đang đồng bộ, đã đồng bộ, ảnh lỗi, ngoài văn phòng. |
| Công của tôi | Lịch tháng, từng ngày, giờ vào/ra, công/ngoại lệ, nút yêu cầu sửa | Chưa có dữ liệu, thiếu mốc, đơn chờ, kỳ đã khóa. |
| Đơn của tôi | Đơn nghỉ, tăng ca, sửa công; tạo đơn; số phép còn lại | Nháp, chờ duyệt, đã duyệt, từ chối, hủy. |
| HR tổng quan | Việc cần xử lý, số người đã/chưa chấm, đơn chờ, kỳ công | Loading, không có ngoại lệ, lỗi tải, cảnh báo storage. |
| HR chấm công | Bảng có lọc, chi tiết event, ảnh lightbox, GPS dễ hiểu, ghi kết quả kiểm tra | Ngoài văn phòng, đồng bộ trễ, ảnh chờ/lỗi, thiếu mốc. |
| Bảng công | Kỳ tháng, ngoại lệ, xem từng ngày, đánh dấu kiểm tra, xuất Excel | Mở, HR đã kiểm tra, admin đã khóa, bản tạm. |
| Admin cấu hình ca chung | Danh sách phiên bản, ca đang áp dụng, ngày làm trong tuần, giờ vào/ra, nghỉ trưa, phút miễn trừ đi trễ, ngày hiệu lực; nút lưu phiên bản mới | Kiểm tra thứ tự giờ/khoảng hiệu lực, xem trước ca sau đổi, xác nhận lưu, lỗi lưu, lịch sử và audit. Không có thao tác gán ca riêng theo nhân viên trong V1. |
| Admin cấu hình khác | Ngày nghỉ/làm bù, vị trí, loại nghỉ, phép, retention, tài khoản | Cấu hình chưa đủ, thay đổi có hiệu lực, lỗi lưu, nhật ký. |

Không hiện tọa độ thô trên danh sách HR; dùng “Trong văn phòng”, “Ngoài văn phòng — cần kiểm tra”, “Không đủ độ chính xác” và chi tiết khoảng cách khi mở record. Ảnh chấm công chỉ tải khi người có quyền mở chi tiết; lightbox có tên, ngày giờ, trạng thái và nút đóng/điều hướng bằng bàn phím. Nếu ảnh đã hết hạn, hiển thị “Ảnh đã hết thời hạn lưu” và vẫn giữ thông tin event.

## 5. Nội dung thông báo mẫu

| Tình huống | Câu hiển thị |
| --- | --- |
| Lưu offline thành công | “Đã lưu trên thiết bị. Ứng dụng sẽ đồng bộ khi có mạng.” |
| Server xác nhận, ảnh còn chờ | “Đã ghi nhận giờ chấm. Ảnh đang được đồng bộ.” |
| Đồng bộ hoàn tất | “Chấm công đã đồng bộ lúc 08:01.” |
| Ngoài văn phòng | “Đã ghi nhận vị trí ngoài văn phòng. HR sẽ kiểm tra.” |
| Camera/GPS bị chặn | “Cần quyền camera và vị trí để chấm công. Hãy cấp quyền hoặc gửi yêu cầu sửa công.” |
| Thiếu chấm ra | “Ngày công chưa hoàn chỉnh. Hãy chấm ra hoặc gửi yêu cầu sửa công.” |
| Upload ảnh lỗi | “Giờ chấm đã được ghi nhận. Ảnh chưa tải lên; hãy giữ ứng dụng và thử lại khi có mạng.” |

Không dùng “thành công” cho dữ liệu mới nằm trong queue local. Nút đang gửi phải khóa tạm và có phản hồi trong thời gian ngắn; không khiến người dùng bấm lặp vì không rõ trạng thái.

## 6. Tiếp cận, responsive và kiểm tra thiết kế

Kiểm tra ở 375, 768, 1024 và 1440 px; không cuộn ngang ở mobile. Tôn trọng safe area điện thoại, không che CTA bằng bottom nav. Input có nhãn thật và thông báo lỗi cạnh trường; dialog có nút hủy, phím Escape và focus hợp lý. Bảng HR có tiêu đề cột và trạng thái diễn đạt bằng chữ. Ưu tiên tải ít ảnh và có chỗ giữ kích thước để tránh nhảy bố cục. Tôn trọng `prefers-reduced-motion`; chuyển động chỉ dùng để thể hiện kết quả thao tác, không cản thao tác. Dùng một bộ icon SVG nhất quán thay cho emoji.

Khi triển khai UI, kiểm tra lại màu logo từ asset gốc, test tương phản từng cặp chữ/nền, và làm ít nhất một vòng thử thao tác chấm công trên điện thoại thật ngoài môi trường văn phòng. Luồng nghiệp vụ đối chiếu với [03-workflow.md](03-workflow.md); quyền màn hình đối chiếu với [01-business-analysis.md](01-business-analysis.md).
