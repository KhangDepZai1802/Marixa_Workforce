# 05 — Chiến lược kiểm thử hệ thống chấm công Marixa

## 1. Mục tiêu và mức kiểm thử

Ưu tiên kiểm chứng **không mất công, không nhân đôi công, đúng quyền và đúng số liệu**. Dùng unit test cho hàm tính công/nghỉ/phép, integration test cho API + migration/RLS, và end-to-end test cho luồng nhân viên–HR–admin trên desktop/mobile. **Không dùng Docker**: chạy Next.js/test runner bằng Node.js trên máy, integration/end-to-end test nối tới Supabase project thử nghiệm riêng với dữ liệu giả; không dùng project production hoặc ảnh/hồ sơ thật. Mọi trường hợp về ngày giờ chạy cố định múi giờ `Asia/Ho_Chi_Minh`.

## 2. Ma trận kịch bản bắt buộc

Các ví dụ 08:00–17:00 dưới đây dùng **ca chung mặc định khi khởi tạo**, không phải mốc cố định trong code. Chạy lại phép tính với ca do admin đổi và ngày hiệu lực khác nhau; mọi nhân viên cùng nhận một ca đang có hiệu lực.

| Nhóm | Kịch bản | Kết quả mong đợi |
| --- | --- | --- |
| Chấm công | Chấm vào 08:00, ra 17:00 ngày thứ 2–thứ 7 | 8 giờ thường, nghỉ trưa 1 giờ; đủ hai ảnh/GPS. |
| Cấu hình ca chung | Admin tạo phiên bản từ ngày kế tiếp: thứ 2–thứ 6, 09:00–18:00, nghỉ 12:30–13:30, miễn trừ đi trễ 10 phút | Toàn bộ nhân viên dùng ca mới từ ngày hiệu lực; ngày trước đó vẫn theo ca cũ. Chấm 09:00–18:00 được 480 phút thường; chấm 09:05 không bị tính phút đi trễ, chấm 09:11 bị tính theo quy tắc miễn trừ. |
| Ngày nghỉ với ca đã đổi | Chấm 09:00–18:00 trong ngày nghỉ sau khi ca mới có hiệu lực | 480 phút tăng ca tự động; trừ nghỉ 12:30–13:30 theo ca mới, không dùng cứng 12:00–13:00. |
| Quyền và lịch sử ca | HR/employee thử chỉnh ca; admin chọn ngày hiệu lực chồng lấn hoặc đổi ca sau khi khóa kỳ | Chỉ admin lưu được phiên bản hợp lệ; từ chối khoảng hiệu lực chồng lấn; có audit và snapshot kỳ đã khóa không đổi. |
| Giờ công | Vào 08:30, ra 17:00 | 7 giờ 30 phút thường, 30 phút đi trễ nếu không có nghỉ/điều chỉnh. |
| Giờ công | Vào 08:00, ra 12:00 | 4 giờ thường, về sớm; không trừ thêm giờ trưa. |
| Giờ công | Vào 08:00, ra 18:00, chưa có đơn tăng ca duyệt | 8 giờ thường, 0 giờ tăng ca; khoảng ngoài giờ chỉ là dữ kiện. |
| Tăng ca | Có đơn duyệt 17:00–18:00 và ra 17:30 | Tối đa 30 phút tăng ca; không tính phần chưa chấm thực tế. |
| Thiếu mốc | Chỉ có lượt vào | Ngày công chưa hoàn chỉnh; không tự sinh lượt ra. |
| Chống trùng | Retry cùng idempotency key 3 lần | Chỉ một event, cùng ID trả về. |
| Chống trùng | Hai thiết bị cùng chấm vào một ngày | Một event được giữ; thiết bị thứ hai thấy thông báo xung đột. |
| Offline | Chụp ảnh/GPS khi mất mạng, reload trang, sau đó có mạng | Queue vẫn còn; đồng bộ đúng một event và một ảnh. |
| Ảnh lỗi | Event lên server, upload ảnh thất bại | Event vẫn tồn tại, trạng thái ảnh chờ/lỗi; retry ảnh không nhân đôi event. |
| Quyền thiết bị | Từ chối camera hoặc GPS | Không tạo event thiếu bằng chứng; có hướng dẫn/đường gửi yêu cầu sửa. |
| Vị trí | GPS ngoài bán kính văn phòng | Event được nhận, gắn cờ; HR có thể xem và ghi kết quả kiểm tra. |
| Đồng hồ thiết bị | Offline với giờ thiết bị lệch đáng kể | Lưu giờ thiết bị và giờ nhận, cờ cần HR đối soát. |
| Sửa công | Nhân viên đề nghị sửa; HR duyệt | Event gốc bất biến, điều chỉnh và audit xuất hiện, bảng công tính lại. |
| Nghỉ phép | Đơn nghỉ nửa ngày được duyệt | Sổ phép trừ 0,5 đúng một lần; bảng công thể hiện nửa ngày nghỉ. |
| Nghỉ phép | Đơn nghỉ nửa ngày trùng thời gian thực chấm | Bảng công báo ngoại lệ để HR xử lý, không cộng trùng công làm và phép. |
| Nghỉ phép | Hủy đơn đã duyệt | Sổ phép phát sinh giao dịch hoàn, không xóa giao dịch trừ cũ. |
| Phê duyệt | HR tạo đơn của mình | HR khác không được duyệt; chỉ admin có quyền duyệt. |
| Phê duyệt | Admin có hồ sơ nhân viên tạo đơn của mình | HR duyệt; admin không tự duyệt dù có toàn quyền cấu hình. |
| Quyền | Nhân viên gọi API công/ảnh người khác; HR gọi API đổi role | Bị từ chối ở API và RLS, không lộ dữ liệu. |
| Tài khoản | Admin reset mật khẩu tạm; người dùng đăng nhập lần đầu | Bị chuyển đến đổi mật khẩu, không vào trang công trước khi đổi; thao tác được audit. |
| Kỳ công | HR kiểm tra, admin khóa rồi có yêu cầu sửa mới | Snapshot cũ không đổi; chỉ cập nhật sau khi admin mở lại có lý do. |
| Export | Excel kỳ mở và kỳ khóa; PDF đơn trước/sau duyệt | Excel kỳ mở ghi bản tạm; kỳ khóa dùng snapshot; PDF có đúng trạng thái/phiên bản. |
| Retention | Hết hạn ảnh | Object bị xóa, metadata đánh dấu, event và công vẫn còn; link ảnh báo hết hạn. |

## 3. Kiểm thử quyền và dữ liệu

Chạy test RLS cho cả `anon`, nhân viên A/B, HR và admin trên bảng hồ sơ, event, ảnh, đơn, ledger, snapshot, audit và settings. Test cả `SELECT`, `INSERT`, `UPDATE`, `DELETE` để chứng minh không có đường ghi trực tiếp ngoài API. Kiểm tra không tạo được admin thứ hai và không vô hiệu hóa được admin đang hoạt động cuối cùng. Kiểm tra đường ảnh private không truy cập được khi chưa đăng nhập hoặc đã hết quyền. Kiểm tra `service_role` không nằm trong bundle client hoặc output build.

Kiểm tra tính nguyên tử khi hai reviewer bấm duyệt cùng lúc: chỉ một quyết định có hiệu lực và chỉ một giao dịch phép/tăng ca. Kiểm tra đổi chính sách giờ làm không sửa lại số liệu kỳ đã khóa. Áp dụng migration có version vào project thử nghiệm sạch bằng công cụ PostgreSQL cài trực tiếp, kiểm tra schema/RLS rồi mới áp dụng production; dữ liệu test phải có cách dọn/reset riêng. Seed admin an toàn, không chứa mật khẩu mặc định trong repo. Không yêu cầu `supabase start` hoặc `supabase test db` vốn phụ thuộc local stack.

## 4. Kiểm thử giao diện và thiết bị

- Mobile ở 375px và 768px: nút chấm rõ, chụp/preview/chụp lại dùng được, không cuộn ngang, status offline/sync dễ hiểu; đủ vùng chạm cho người dùng.
- Desktop ở 1024px và 1440px: HR lọc theo ngày/trạng thái/phòng ban, xem ảnh lightbox, đối soát và xuất file; refresh/Back/Forward giữ route và filter.
- Dùng bàn phím cho đăng nhập, form, bảng, lightbox và hộp thoại; focus rõ; thông báo trạng thái được đọc bởi screen reader; màu không là dấu hiệu duy nhất.
- Thử mạng chậm, ngắt mạng giữa upload, đóng/mở tab, đồng bộ lặp; kiểm tra Safari iOS và Chrome Android/desktop trong phạm vi thiết bị hỗ trợ.
- Thử ảnh lớn và ảnh xoay: nén/định hướng đúng, file nằm dưới giới hạn cấu hình nhưng mặt người vẫn nhận diện được khi HR mở.

## 5. Cổng chấp nhận trước dùng thật

Không đưa vào sử dụng nếu còn lỗi làm mất/nhân đôi event, vượt quyền, tính sai công/phép, khóa kỳ không ổn định, hoặc ảnh/GPS bắt buộc có thể bị bỏ qua. Đạt toàn bộ kịch bản trong ma trận, kiểm tra dung lượng theo dữ liệu giả dưới 15 người, thử backup/restore ít nhất một lần, xác nhận admin đã nhập địa điểm văn phòng, lịch ngày nghỉ, số phép và thời hạn lưu ảnh. Các cảnh báo về hạn mức/điều kiện gói Free trong [06-deployment-vercel-supabase.md](06-deployment-vercel-supabase.md) phải được bàn giao rõ.
