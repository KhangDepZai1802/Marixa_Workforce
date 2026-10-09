# 01 — Phân tích nghiệp vụ hệ thống chấm công Marixa

## 1. Mục tiêu và phạm vi

Marixa cần một nguồn dữ liệu thống nhất cho công, nghỉ phép và tăng ca của **khối văn phòng dưới 15 người**. Nhân viên và HR tự chấm công bằng điện thoại hoặc trình duyệt; HR đối soát; một admin quản lý cấu hình và khóa kỳ. Giao diện và thuật ngữ đều dùng tiếng Việt, múi giờ nghiệp vụ là `Asia/Ho_Chi_Minh`.

V1 gồm hồ sơ nhân viên cơ bản, tài khoản, chấm vào/ra có ảnh và GPS, hàng đợi offline, yêu cầu sửa công, đơn nghỉ và sổ phép năm, yêu cầu tăng ca, bảng công tháng, thống kê HR, Excel bảng công và PDF đơn nghỉ. Không gồm tính lương, thuế, bảo hiểm, công nhân, công trường, điểm danh đội, kho hoặc xuất nhập khẩu. `MOTAHETHONG.docx` chỉ gợi ý nguyên tắc chống mất dữ liệu, audit, phân quyền và trải nghiệm; không dùng tên công ty, role hay module khác trong tài liệu đó làm yêu cầu của Marixa.

## 2. Người dùng và quyền

| Khả năng | Nhân viên | HR | Admin |
| --- | --- | --- | --- |
| Chấm vào/ra, xem công và hồ sơ của mình | Có | Có | Có nếu gắn hồ sơ nhân viên |
| Gửi đơn nghỉ, tăng ca, yêu cầu sửa công | Có | Có | Có nếu gắn hồ sơ nhân viên |
| Xem công, ảnh, GPS và thống kê toàn khối văn phòng | Không | Có | Có |
| Tạo/sửa hồ sơ nhân viên cơ bản, đối soát bảng công, xuất Excel | Không | Có | Có |
| Duyệt đơn/yêu cầu của nhân viên khác và của admin có hồ sơ nhân viên | Không | Có | Có, trừ của chính mình |
| Duyệt đơn/yêu cầu của HR | Không | Không | Có |
| Cấp/khóa tài khoản, đổi role, cấu hình chính sách, khóa/mở kỳ | Không | Không | Có |

Mỗi tài khoản chỉ có một trong ba role: `employee`, `hr`, `admin`. Có thể có nhiều nhân viên, nhiều HR và **đúng một tài khoản admin đang hoạt động**. Không có đăng ký tài khoản công khai. HR có thể tạo hồ sơ; admin cấp tài khoản và quyền. Không ai được duyệt yêu cầu của chính mình: nếu admin cũng có hồ sơ nhân viên và gửi đơn cá nhân, HR duyệt đơn đó; admin không thể tự duyệt. Hồ sơ nhân viên và tài khoản đăng nhập là hai đối tượng khác nhau để giữ lịch sử khi tài khoản bị khóa.

## 3. Quy tắc công chuẩn

- V1 có **một ca làm chung cho toàn bộ nhân viên** do admin quản lý. Giá trị khởi tạo là thứ 2–thứ 7, 08:00–17:00, nghỉ 12:00–13:00 và 0 phút miễn trừ đi trễ; đây là mặc định có thể chỉnh, không phải giờ cố định. Admin đặt ngày làm việc, giờ vào/ra, khoảng nghỉ trưa, phút miễn trừ đi trễ và ngày hiệu lực; mỗi lần đổi lưu phiên bản và audit. V1 không gán ca riêng cho từng nhân viên.
- Một ngày có tối đa một lượt chấm vào và một lượt chấm ra hợp lệ cho mỗi người. Chấm sớm hoặc ra muộn được ghi nhận, nhưng không tự phát sinh giờ tăng ca được trả/tính.
- Phút làm thường = phần giao của khoảng chấm vào–ra với các khoảng làm việc trước/sau nghỉ trưa của **ca chung có hiệu lực tại ngày công**, sau khi áp dụng đơn nghỉ và điều chỉnh được duyệt. Giờ ngoài ca chỉ được ghi vào tăng ca khi yêu cầu tăng ca tương ứng đã được duyệt.
- Vào sau giờ bắt đầu ca là đi trễ theo số phút miễn trừ do admin cấu hình; ra trước giờ kết thúc ca là về sớm, trừ phần có đơn nghỉ hoặc điều chỉnh được duyệt. Mặc định miễn trừ đi trễ 0 phút.
- Thiếu chấm vào hoặc ra là **công chưa hoàn chỉnh**; hệ thống không tự suy ra mốc còn thiếu. Nhân viên gửi yêu cầu sửa công, HR duyệt, riêng yêu cầu của HR do admin duyệt.
- Ngày lễ/ngày nghỉ đặc biệt được admin nhập vào lịch trước khi tính công. Không tự giả định chính sách ngày lễ hay mức trả lương.
- Mỗi lượt chấm cần ảnh camera và tọa độ GPS. Nếu người dùng từ chối quyền hoặc thiết bị không lấy được một trong hai, không gửi lượt chấm thiếu bằng chứng; màn hình hướng dẫn cấp quyền hoặc gửi yêu cầu sửa công.
- Chấm ở ngoài vị trí văn phòng **vẫn được ghi nhận** và gắn cờ `ngoài văn phòng` để HR kiểm tra. Admin nhập tọa độ/bán kính văn phòng; cờ này không tự biến lượt chấm thành vắng mặt.
- Mốc online lấy giờ máy chủ làm thời gian công; giữ giờ thiết bị để đối chiếu. Mốc offline giữ giờ thiết bị, giờ máy chủ nhận và cờ `đồng bộ trễ`; HR kiểm tra trước khi chốt kỳ.

## 4. Nghỉ phép, tăng ca và chỉnh công

Đơn nghỉ có loại nghỉ do admin cấu hình, ngày bắt đầu/kết thúc, lựa chọn cả ngày hoặc nửa ngày, lý do và trạng thái `nháp → chờ duyệt → đã duyệt/từ chối/hủy`. HR duyệt đơn của nhân viên và đơn cá nhân của admin; admin duyệt đơn của HR. Đơn đang chờ không trừ phép chính thức. Đơn nghỉ phép năm đã duyệt sinh giao dịch trừ trong sổ phép; hủy hợp lệ sinh giao dịch hoàn, không sửa số dư trực tiếp. Số phép được cấp/chuyển năm do admin hoặc HR nhập bằng giao dịch có lý do; V1 không tự đặt số ngày phép theo luật hay hợp đồng. Không cho duyệt vượt số dư, trừ khi admin thực hiện điều chỉnh sổ phép có lý do trước.

Yêu cầu tăng ca nêu ngày, giờ bắt đầu/kết thúc và lý do. HR duyệt yêu cầu của nhân viên và yêu cầu cá nhân của admin; admin duyệt của HR. Chấm ra muộn chỉ là dữ kiện kiểm tra, không thay thế phê duyệt tăng ca. Yêu cầu sửa công nêu mốc đúng đề nghị và lý do; khi duyệt tạo bản điều chỉnh riêng, giữ nguyên sự kiện chấm gốc, ảnh và lịch sử.

## 5. Bảng công và báo cáo

Kỳ công tính theo tháng, có trạng thái `mở → HR đã kiểm tra → admin đã khóa`. HR phải xử lý hoặc ghi chú rõ mọi dòng thiếu công, ảnh lỗi, đồng bộ trễ và ngoài văn phòng trước khi đánh dấu đã kiểm tra. Khóa kỳ tạo snapshot không thay đổi. Muốn sửa dữ liệu kỳ đã khóa, admin phải mở lại kèm lý do, hệ thống tính lại và lưu phiên bản/audit. Excel xuất từ kỳ đã khóa hoặc được ghi rõ **bản tạm** nếu kỳ còn mở. PDF đơn nghỉ phản ánh phiên bản và trạng thái tại thời điểm xuất, không là nguồn dữ liệu chuẩn.

Dashboard HR ưu tiên số người đã chấm vào, người chưa chấm, thiếu công, đi trễ, lượt ngoài văn phòng, đơn chờ duyệt, ảnh/đồng bộ lỗi và tình trạng kỳ công. Nhân viên chỉ thấy dữ liệu của mình. Báo cáo không hiển thị ảnh hàng loạt; ảnh mở theo yêu cầu và kiểm tra quyền.

## 6. Điều kiện nghiệm thu nghiệp vụ

1. Nhân viên và HR chấm vào/ra với ảnh/GPS; tải lại trang không làm mất lượt offline còn trong thiết bị, và đồng bộ lặp không tạo bản ghi trùng.
2. Lượt ngoài văn phòng vẫn tồn tại, được gắn cờ rõ; HR xem được bằng chứng và ghi kết quả kiểm tra.
3. Đơn nghỉ, tăng ca và sửa công đi đúng người duyệt; HR không duyệt hồ sơ của chính mình.
4. Bảng công áp dụng giờ chuẩn, nghỉ trưa, đơn đã duyệt và điều chỉnh; thiếu một mốc được báo là chưa hoàn chỉnh.
5. Admin khóa kỳ và có thể mở lại có lý do; Excel và PDF đúng quyền, kỳ và phiên bản dữ liệu.
6. Hệ thống giữ nhật ký cho thay đổi công, phép, role, cấu hình và kỳ công.

Xem mô hình dữ liệu tại [02-database-design.md](02-database-design.md), luồng tại [03-workflow.md](03-workflow.md) và thiết kế giao diện tại [07-ui-design-system.md](07-ui-design-system.md).
