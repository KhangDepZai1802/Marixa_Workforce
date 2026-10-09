# Báo cáo tình trạng module Chấm công

**Ngày:** 08/10/2026  
**Nguồn:** `01-business-analysis.md` và `review-evidence.md` trong thư mục này.

> “Đã có” nghĩa là chức năng đã xuất hiện trong mã nguồn và luồng hiện tại. Báo cáo nguồn là rà soát tĩnh, chưa xác nhận trên database/hệ thống đang chạy; nhiều chức năng vẫn có lỗi hoặc giới hạn.

## 1. Chức năng đã có

| Nhóm chức năng | Hiện làm được |
| --- | --- |
| Nhân viên chấm công | Đăng nhập, chụp và tải ảnh, ghi nhận vào/ra; xem lịch sử, lịch làm và thống kê cá nhân. |
| Quản lý công | HR/Admin và Manager có thể xem, tạo, sửa, duyệt hoặc từ chối công; xem ảnh và xuất dữ liệu. Manager hiện chưa bị giới hạn đúng theo nhân viên phụ trách. |
| Nhật ký chấm công | Lưu từng lần chấm, thời gian, ảnh và một số thông tin vị trí/phương thức; Admin có API để quản lý nhật ký. |
| Ca và lịch làm | Có dữ liệu ca, ngày làm, ca đêm và phân công ca; nhân viên có thể xem lịch được phân công. |
| Nghỉ phép và ngày lễ | Có chức năng tạo/xử lý đơn nghỉ, dữ liệu ngày lễ và lịch làm bù; các phần này chưa liên thông đầy đủ với kết quả công. |
| Quy tắc chấm công | Có nơi lưu cấu hình như dung sai đi trễ, nghỉ giữa ca, GPS và yêu cầu ảnh; nhiều cấu hình chưa được áp dụng vào lúc chấm. |
| Bảng lương | Có thể tạo bảng lương theo tháng và nhập các khoản lương; hiện chưa tự lấy công đã duyệt để tính lương. |

## 2. Phần chưa hoàn chỉnh và cần bổ sung

### Ưu tiên cao — cần xử lý trước khi tin cậy số liệu công

- **Phân quyền:** API chưa luôn xác minh nhân viên đang thao tác đúng là chủ bản ghi. Manager cần chỉ xem và xử lý nhân viên mình phụ trách; actor duyệt phải lấy từ tài khoản đăng nhập.
- **Tính công:** Chưa thống nhất giờ công giữa các màn hình. Theo lịch đã xác nhận **08:00–12:00, 13:00–17:00 là 8 giờ làm**; hiện có trường hợp tính thành 9 giờ và 1 giờ tăng ca.
- **Ngày công và lượt chấm:** Chấm trước 07:00 có thể rơi vào sai ngày; lượt chấm mới có thể chưa được tính ngay; chưa kiểm soát đầy đủ thứ tự vào/ra và chấm trùng.
- **Duyệt và lịch sử sửa:** Công đã duyệt vẫn có đường khác để sửa log, đổi trạng thái hoặc xóa. Cần một quy tắc khóa/điều chỉnh thống nhất và lưu đầy đủ ai sửa, lý do, trước–sau.
- **Dữ liệu và báo cáo:** Danh sách có giới hạn số bản ghi và có thể chỉ tải trang đầu; lọc, thống kê và xuất file đôi khi không cùng phạm vi. Lỗi tải thống kê có thể bị hiển thị như số 0.
- **Tạo công thủ công:** Một số trường có trên form nhưng không được lưu khi tạo; dữ liệu đầu vào và kiểm tra hợp lệ chưa thống nhất giữa các luồng.

### Cần hoàn thiện để dùng quy trình đầy đủ

- Có luồng nhân viên báo quên chấm/sai công, quản lý xử lý và nhân viên theo dõi kết quả; hiện chưa rõ cách gửi lại công bị từ chối.
- Nối lịch ca, ngày lễ, nghỉ phép và kết quả công để cảnh báo xung đột và thống nhất ngày công.
- Nếu dùng công để trả lương, bổ sung quy trình chốt kỳ và bàn giao dữ liệu công đã duyệt; hiện bảng lương hoạt động riêng.
- Làm rõ chính sách ảnh: có bắt buộc không, xử lý khi camera lỗi, ai được xem ảnh và lưu trong bao lâu. GPS mới có dữ liệu/cấu hình, chưa phải quy trình xác minh vị trí hoàn chỉnh.

## 3. Việc cần xác nhận trước khi chốt yêu cầu

1. Trong ngày làm 08:00–12:00 và 13:00–17:00, nhân viên chấm hai lần hay chấm riêng sáng/chiều?
2. Manager được phụ trách nhân viên theo quan hệ nào; có người thay thế/ủy quyền không?
3. Công nào cần duyệt, ai được sửa công đã duyệt và cần điều kiện gì?
4. Quy tắc đi trễ, về sớm, làm bù, tăng ca và nghỉ phép được tính thế nào?
5. Module Chấm công chỉ theo dõi đi làm hay cung cấp số liệu chính thức cho tính lương?

## 4. Kết luận

Module đã có các chức năng nền tảng để chấm công, quản lý công, xem lịch và thống kê. Tuy nhiên, **chưa nên coi số liệu là kết quả công đã chốt**, do còn thiếu nhất quán về phân quyền, cách tính giờ, duyệt/sửa và tổng hợp dữ liệu. Nên ưu tiên xử lý các mục “Ưu tiên cao”, sau đó xác nhận câu hỏi nghiệp vụ trước khi mở rộng ca phức tạp hoặc tích hợp tính lương.
