# Bằng chứng kiểm tra UI trong trình duyệt

Ngày kiểm tra: **08/10/2026, múi giờ Asia/Saigon**. Source tại commit `bdb4a43b0c01e331f0bde6db6e10f2693b71e10f`.

## Cách kiểm tra và giới hạn

- Chạy source React bằng Vite trên `127.0.0.1:5173`, kiểm tra bằng Chromium headless đã có trên máy; không chạy backend.
- Chặn toàn bộ API và thay bằng dữ liệu giả lập. Chỉ cho phép tài nguyên giao diện local và font Google. Không dùng tài khoản thật, không upload ảnh hay ghi công/duyệt/xóa trên server thật.
- Cố định đồng hồ trình duyệt ở **10:00 ngày 08/10/2026, giờ Việt Nam**. Dùng tên/ID nhân viên giả; không phải dữ liệu doanh nghiệp.
- Bộ kiểm tra chính dùng các role giả `Admin`, `Manager`, `HR`, `Employee` để mở các trang và đo layout. Vì vậy ảnh không chứng minh phân quyền backend đúng hoặc phạm vi dữ liệu được bảo vệ.
- Camera dùng thiết bị video giả của Chromium. Quyền camera trên Safari/iPhone, Android thật, GPS, bàn phím mềm, mức zoom hệ điều hành và thiết bị hỗ trợ đọc màn hình chưa được kiểm chứng trên thiết bị thật.
- Kết quả CSS/layout không thay thế kiểm thử API với database. Các lỗi nghiệp vụ backend trong báo cáo được đánh dấu theo bằng chứng source.

## Các lượt kiểm tra

| Đợt | Phạm vi | Dữ liệu ghi nhận |
| --- | --- | --- |
| Chính | `/login`, `/home`, `/attendance`, `/attendance-history`, `/statistics`, `/employees/attendance-history`, `/employees/work-schedule`, `/employees/statistics`, `/admin/attendance-history`, `/admin/statistics`, `/leave`, `/work` | Mỗi URL ở 320×740, 375×812, 390×844, 768×1024, 1024×768, 1366×768, 1440×900, 844×390 |
| Tương tác chính | Mở menu tài khoản/thông báo; bật camera/chụp ảnh; giả lập API thống kê lỗi 500 | 101 bản quan sát gồm 96 tổ hợp URL/viewport và 5 trạng thái bổ sung trong `runtime-observations.json`; không có lỗi JavaScript không được bắt trong đợt này |
| Mở rộng | Form thêm công HR/Admin, bảng có dữ liệu hôm nay; `/employees/leaves`, `/work?tab=invalid`, `/profile`, `/contracts`, `/salary`, `/insurance`, `/bank-accounts`, `/reports`, `/handover`, `/promotions`, `/admin/roles`, `/admin/work`, `/employees`, `/admin/employees` | `interaction-observations.json`; các trang ngoài Attendance chủ yếu kiểm tra bố cục/trạng thái rỗng bằng fixture, không kiểm hết nghiệp vụ |
| Modal chuyên sâu | Form HR/Admin: mở, Escape, lỗi lưu 400 giả lập, landscape, Tab khỏi nút lưu | `modal-observations.json` và ảnh `*-modal-viewport-*`, `*-modal-api-error-*` |

**Lưu ý chất lượng bằng chứng:** Đợt mở rộng ban đầu dùng selector modal chưa bao gồm `.att-form-modal`, nên trường `dialogs` rỗng và số đếm sau Escape trong `interaction-observations.json` không dùng để kết luận đóng/mở. Đợt modal chuyên sâu đã sửa phép đo và xác nhận Escape vẫn để modal mở. Ảnh `*-create-modal-*` chụp toàn trang khi đang cuộn là ảnh ghép cuộn; dùng ảnh `*-modal-viewport-*` để đánh giá kích thước modal thực tế.

## Các quan sát đã xác nhận

| Quan sát | Bằng chứng trực tiếp | Kết luận có thể dùng |
| --- | --- | --- |
| Nội dung tự chấm bị đẩy xuống | `/attendance 375x812`: main bắt đầu y=690; mặc định sidebar mở. Landscape 844×390 cũng y=690 | Người dùng phải cuộn hoặc gập menu trước khi tiếp cận thao tác chính; không phải lỗi tràn toàn trang |
| Menu tài khoản tràn phải | `/attendance menu-account 375`: x=171, width=220, cạnh phải=391 | Trang rộng 391px khi viewport 375px, vượt 16px |
| Menu thông báo bị cắt trái | `/attendance menu-notifications 375`: x=-164, width=340 | Tiêu đề/nội dung bên trái không đọc được đầy đủ |
| Bảng cá nhân còn pattern desktop | `/attendance-history 375x812`: table 620px, vùng chứa 301px | Cần cuộn ngang trong bảng; chiều rộng document vẫn 375px |
| Bảng admin nén nhiều cột | `/admin/attendance-history 375x812`: table 883px trong vùng 285px với fixture 5 bản ghi | Thao tác duyệt nằm xa ngoài vùng nhìn đầu tiên; cần đổi cách ưu tiên nội dung trên mobile |
| Trang lịch sử admin tràn ngang | `/admin/attendance-history 375x812`: documentWidth 401px; bốn KPI giữ bố cục bốn cột | Đây là tràn toàn trang riêng với cuộn ngang bên trong bảng; đã đối chiếu JSON và kích thước ảnh |
| Lịch thống kê sai thứ | Ảnh `statistics-375.png`: ngày 1/10/2026 nằm dưới T2; ngày thật là T5 | Lỗi thuật toán sắp ô, xuất hiện cả desktop và mobile |
| API lỗi bị hiển thị như thiếu công | `statistics-api-failure-375.png`, API Attendance trả 500 giả lập | UI vẫn hiển thị tổng 0 và thiếu công thay vì trạng thái tải lỗi |
| Modal nằm trong viewport | HR 375px: rộng 335px, cao khoảng 499px; landscape 844×390: rộng 480px, cao 294px, nội dung cuộn bên trong | Không kết luận modal mất chức năng do vượt chiều cao; bàn phím mềm cần kiểm chứng riêng |
| Modal thiếu quản lý focus | `modal-observations.json`: focus vẫn ở `+ Thêm` khi mở, Escape không đóng, Tab từ submit ra ngoài; không có role/aria-modal | Khó dùng bằng bàn phím/trình đọc màn hình |
| Lỗi lưu không hiển thị trong form | API POST trả 400 giả lập; `.att-error` ngoài modal chứa thông báo, nội dung modal không có thông báo | Người dùng không biết vì sao lưu không thành công |
| Xuất CSV nghỉ phép lỗi | `/employees/leaves`, bấm nút xuất: `Cannot read properties of undefined (reading 'toLowerCase')` | Lỗi JavaScript đã tái hiện bằng thao tác UI; không phải API lỗi |
| URL tab không hợp lệ làm Work lỗi | `/work?tab=invalid`: `Cannot read properties of undefined (reading 'title')` | Cần fallback/validation tab; trang trống đã tái hiện |

Các mục `overflows` trong JSON liệt kê cả con nằm ngoài vùng nhìn của container có cuộn ngang hợp lệ; **không tự động đồng nghĩa lỗi tràn trang**. Các mục `smallTargets` là phép đo dưới mục tiêu thiết kế 44px, không phải tự động kết luận vi phạm WCAG.

## Kiểm tra build

Chạy `npm.cmd run build -- --outDir ../.agnes/work/ui-audit/build` từ `ChamCong`: **PASS**, Vite 6.4.3, 236 module. Source và build được commit trong `M.API/wwwroot` không bị thay đổi.

Build có cảnh báo cú pháp CSS (`position: relative`, whitespace/unexpected semicolon) và kích thước chunk. Kích thước ghi nhận: main JS 804,41kB (gzip 234,93kB); ExcelJS 940,37kB (gzip 271,39kB); CSS 139,14kB (gzip 25,37kB). Đây là bằng chứng dung lượng bundle, chưa phải phép đo tốc độ mạng hay Core Web Vitals trên thiết bị thật.

## Tái hiện

1. Chạy frontend local, sử dụng tài khoản/dữ liệu kiểm thử trong môi trường test hoặc mock API tương ứng.
2. Mở route và viewport ghi ở bảng trên. Với sidebar, bắt đầu bằng localStorage chưa lưu lựa chọn gập menu.
3. So sánh ảnh và các tọa độ trong JSON; không sử dụng production để thử thao tác ghi/xóa.
4. Với lỗi API, giả lập đúng mã lỗi 500 khi tải công hoặc 400 khi lưu; kiểm tra thông báo và dữ liệu còn hiển thị.
