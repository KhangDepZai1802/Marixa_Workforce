# UI/UX Pro Max Audit

Ngày đánh giá: **08/10/2026**. Báo cáo bằng tiếng Việt; giữ tên mục theo yêu cầu. Phạm vi là giao diện web React hiện có, ưu tiên Chấm công và các luồng nhân sự liên quan. Đây là báo cáo đánh giá; không sửa source, không thiết kế lại hoặc triển khai recommendation.

**Quy ước bằng chứng:** `FACT` = đọc được từ logic source hoặc quan sát được trong kiểm thử ghi rõ điều kiện; `INFERENCE` = tác động suy ra từ bằng chứng; `ASSUMPTION` = giả định phục vụ đề xuất; `NEEDS VALIDATION` = chưa đủ dữ liệu để kết luận. Mọi đường dẫn `src/...` dưới đây đều tính từ thư mục `ChamCong/`. Số dòng dùng để tìm lại code tại thời điểm audit. Inventory và giới hạn kiểm thử ở [review-evidence.md](review-evidence.md).

**Yêu cầu được người phụ trách xác nhận — FACT:** lịch làm 08:00–12:00 và 13:00–17:00, nghỉ trưa 12:00–13:00, tổng 8 giờ/ngày. HR/Admin quản lý toàn công ty; Manager chỉ quản lý nhân viên được phân công. Mỗi doanh nghiệp triển khai hệ thống/database riêng; không coi thiếu multi-tenancy là finding. Chưa có xác nhận phải chấm 4 lượt/ngày, nên không mặc định thêm thao tác chấm trưa.

**Điều kiện kiểm thử giao diện:** Vite chạy source hiện tại, Chromium với API giả lập, dữ liệu nhân viên tổng hợp, thời điểm cố định 08/10/2026 10:00 Việt Nam; không giao dịch với backend thật. Kết quả ban đầu gồm 12 route × 8 viewport và 5 trạng thái bổ sung, lưu tại [runtime-observations.json](evidence/runtime-observations.json). Kiểm thử tương tác bổ sung tại [interaction-observations.json](evidence/interaction-observations.json) và [modal-observations.json](evidence/modal-observations.json) xác nhận lỗi export, tab không hợp lệ, focus/Escape và lỗi trong modal. Viewport CSS mô phỏng không thay thế kiểm thử điện thoại iOS/Android thật, bàn phím mềm, camera thật, VoiceOver/TalkBack hoặc mức tải production.

Skill áp dụng: **UI/UX Pro Max**, bản được cập nhật bằng CLI chính thức 2.15.0, vị trí chuẩn `C:/Users/khang/.codex/skills/ui-ux-pro-max/`. Đã đọc `SKILL.md`, dùng checklist phù hợp web và truy vấn tập trung `keyboard focus modal`, `responsive table mobile` trong domain `ux`, cùng truy vấn stack React. Không dùng các yêu cầu native như pt/dp để kết luận lỗi WCAG của web. Mốc 44 CSS px trong đề xuất là mục tiêu thuận tiện cho cảm ứng; kiểm toán tuân thủ accessibility chính thức nằm ngoài phạm vi lần này.

## 1. Executive Summary

1. Nhân viên chụp ảnh rồi bấm Vào ca/Ra ca; HR xem lịch, sửa/duyệt công; Admin có một bộ màn hình gần tương tự.
2. Desktop có bố cục rõ, màu thương hiệu tương đối thống nhất, trạng thái thường có nhãn chữ và chức năng chính dùng button thật.
3. Mobile hiện chuyển sidebar thành danh sách dài trên nội dung: ở 375 × 812, nội dung chấm công chỉ bắt đầu tại y=690.
4. Menu thông báo bị cắt bên trái, menu tài khoản làm trang rộng hơn viewport; đây là lỗi đã quan sát, không chỉ suy đoán CSS.
5. Các bảng giữ cấu trúc desktop và cuộn ngang; trên điện thoại người duyệt phải tách việc đọc tên/ngày khỏi thao tác cuối hàng.
6. Hai lịch công có lỗi khác nhau: lịch thống kê cá nhân lệch thứ, lịch HR có nhãn cuối tuần sai.
7. Thống kê cá nhân biến lỗi API thành số 0 và cảnh báo thiếu công; dữ liệu chưa tải được đang bị trình bày như dữ liệu nghiệp vụ thật.
8. Form thêm/sửa/duyệt dùng chung quá nhiều trách nhiệm; một số field được nhập nhưng không gửi trong payload tạo mới.
9. Nút Sửa/Xóa trên hàng thống kê tháng tác động bản ghi mới nhất, thay vì một ngày do người dùng chọn rõ ràng.
10. Lỗi API trong modal có thể nằm sau overlay; thiếu trạng thái đang lưu và khóa submit làm thao tác khó đoán.
11. Nên đơn giản hóa navigation, hợp nhất phạm vi lọc/xuất file, gộp số liệu trùng và tách sửa dữ liệu khỏi quyết định duyệt.
12. Năm ưu tiên đầu: mobile navigation/menu, lịch và phạm vi ngày, phản hồi lỗi/lưu, tính nhất quán form/API, lựa chọn chính xác bản ghi cần sửa.
13. Lịch 8 giờ/ngày và phạm vi Manager đã được xác nhận; còn cần chốt ngày làm trong tuần, chính sách duyệt, lý do giữ hai khu HR/Admin và khắc phục khi camera không dùng được.

## 2. Overall UX Assessment

| Khía cạnh | Đánh giá dựa trên bằng chứng | Ý nghĩa với tác vụ |
| --- | --- | --- |
| Chấm công cá nhân | Một luồng tuyến tính, camera → preview → xác nhận; CTA bị vô hiệu hóa khi chưa có ảnh | Dễ hiểu trên desktop, nhưng nhiều khoảng trống và sidebar chiếm màn hình điện thoại |
| Duyệt công | Bảng, lịch, KPI, thêm/sửa/duyệt đều có; khác biệt lớn giữa HR và Admin | Người đổi vai trò phải học lại hành vi và có thể thao tác sai bản ghi |
| Responsive | Có breakpoint, flex-wrap, overflow wrapper, modal có giới hạn cao ở một số nơi | Đã có nền tảng CSS thích ứng, chưa có cấu trúc tác vụ ưu tiên mobile |
| Trạng thái hệ thống | Login/leave có loading rõ; thống kê, ảnh lỗi, work lại có nhánh nuốt lỗi | Khó phân biệt chưa có dữ liệu với không tải được dữ liệu |
| Accessibility | Nhiều input có label, nút điều hướng tháng có tên; dialog/focus/hover còn thiếu | Người dùng bàn phím và screen reader không có trải nghiệm tương đương |
| Consistency | Cùng thương hiệu nhưng nhiều họ CSS, modal và bảng khác nhau | Chi phí bảo trì và đào tạo tăng; lỗi sửa ở một màn hình chưa chắc được sửa ở màn hình tương tự |

Không chấm điểm thẩm mỹ tổng hợp hoặc tuyên bố đạt/chưa đạt WCAG khi chưa chạy kiểm thử tương ứng. Ưu tiên vấn đề cản tác vụ và làm sai cách hiểu dữ liệu.

Build frontend đã PASS nhưng có warning CSS/bundle; không dùng kết quả build để chứng minh giao diện sử dụng tốt. Warning `header.css:115–128` do declaration đứng ngoài selector là vấn đề bảo trì mức LOW, tác động cụ thể chưa cô lập; không coi đây là nguyên nhân đã chứng minh của mọi lỗi header. Chi tiết ở nhật ký bằng chứng.

## 3. Critical Issues

Chưa có bằng chứng đủ để tuyên bố **toàn bộ luồng chấm công không thể sử dụng trên mọi thiết bị**. Không nâng mọi lỗi responsive lên CRITICAL. Có chức năng riêng bị lỗi hoặc dữ liệu trình bày sai, được xếp HIGH theo tác động và phạm vi ở mục 4. Nếu kiểm thử thiết bị thật xác nhận không thể hoàn thành check-in/checkout, hoặc backend thật ghi sai dữ liệu từ các payload đã nêu, phải nâng ưu tiên tương ứng lên P0.

Việc dùng số giờ/công chưa xác thực cho tính lương phải được đối chiếu báo cáo [Business Analysis](../modules/attendance/01-business-analysis.md); báo cáo UX này không xác nhận tính đúng của kết quả payroll.

## 4. High Priority Issues

### UX-01 — Sidebar chiếm gần toàn bộ màn hình trước tác vụ chính

**Screen/component:** tất cả trang dùng AppLayout/HrAppLayout/AdminAppLayout, đặc biệt `/attendance`; **category:** NAVIGATION, MOBILE UX, INFORMATION DENSITY; **severity:** HIGH; **device:** mobile/tablet ≤900px.

- **Hiện tại — FACT:** `src/components/layout/AppLayout.jsx:10` đọc trạng thái collapsed từ localStorage, mặc định mở; `src/modules/attendance/attendance.css:1100` chuyển body thành cột và sidebar thành khối full width. `src/constants/modules.js:14` có 13 mục nhân viên. Runtime 375×812: sidebar y=65, cao625; main y=690. 844×390 cũng đưa main xuống y=690.
- **Vấn đề / lý do — INFERENCE:** người vào chấm công hằng ngày phải cuộn qua phần điều hướng ít dùng hoặc chủ động gập menu trước khi chụp. Trạng thái gập desktop được lưu và dùng lại mobile, không có mặc định theo ngữ cảnh.
- **Đề xuất:** mobile mở nội dung ngay, menu theo yêu cầu với nút có `aria-expanded`; giữ 3–5 điểm đến thường dùng nếu nghiên cứu người dùng xác nhận. Trên tablet giữ navigation gọn tùy chiều rộng nội dung, không mặc định xếp 10–13 liên kết trên đầu.
- **Bằng chứng trực quan:** [chấm công 375px](evidence/attendance-375.png), [HR 375px](evidence/employees-attendance-history-375.png).

### UX-02 — Header/menu vượt biên màn hình

**Screen/component:** Header, NotificationBell; **category:** RESPONSIVE, NAVIGATION, COMPONENT; **severity:** HIGH; **device:** mobile; breakpoint liên quan ≤900px/≤520px.

- **Hiện tại — FACT:** `src/components/layout/header.css:307` đặt account menu `right:-32px`; `:352` bell menu rộng340px, neo phải vào bell đứng trước language/avatar. Runtime375: account x171,w220 → documentWidth391; bell x−164,w340, gần nửa nội dung ngoài màn hình. Logo MARIXA cũng bị các điều khiển phải lấn trong screenshot375.
- **Vấn đề / lý do:** thông báo/tiêu đề hoặc thao tác có thể bị che cắt dù document không nhất thiết có overflow ngang (menu tràn về trái).
- **Đề xuất:** neo popup theo viewport, giới hạn width bằng chiều rộng còn lại; trên phone dùng panel vừa màn hình. Thu gọn tên thương hiệu/language có chủ đích, bảo đảm các nút chính không co bất thường.
- **Bằng chứng:** [thông báo375](evidence/menu-notifications-375.png), [tài khoản375](evidence/menu-account-375.png).

### UX-03 — Bảng công desktop làm thao tác mobile bị tách khỏi ngữ cảnh

**Screen:** self history, HR/Admin history, statistics, schedule; **category:** TABLE UX, MOBILE UX, INFORMATION DENSITY; **severity:** HIGH; **device:** phone; không có breakpoint chuyển bảng thành cấu trúc theo tác vụ.

- **Hiện tại — FACT:** `src/modules/attendance/components/HistoryTable.jsx:21` hiển thị 8 cột; HR history `:327` có 9 cột; Admin history `:277` có cột action cuối. Wrapper `attendance.css:550` chỉ cuộn ngang. Runtime375: self table620 trong parent301; Admin table883 trong parent285; HR stats529 trong285. Self/HR thường **không** làm cả document overflow — đây là cuộn trong bảng.
- **Vấn đề / lý do:** muốn duyệt một ngày phải nhớ nhân viên/ngày ở phía trái khi kéo tới action bên phải; ảnh và badge chiếm diện tích trước quyết định. Cấu trúc này vẫn chạm được nhưng chậm và dễ nhầm.
- **Đề xuất:** phone dùng danh sách theo ngày/nhân viên, hiện vào–ra, công và trạng thái, action rõ trong cùng item; ảnh/metadata mở ở chi tiết. Desktop giữ bảng, có thể cố định cột nhận diện và action khi bảng rộng. Không thay mọi bảng bằng card nếu công việc thật cần so sánh nhiều cột.
- **Bằng chứng:** [self history375](evidence/attendance-history-375.png), [Admin history375](evidence/admin-attendance-history-375.png).

### UX-04 — Lịch tháng có ngày dưới sai thứ

**Screen:** `/statistics`, `/employees/attendance-history`; **category:** COMPONENT, INTERACTION, CONSISTENCY; **severity:** HIGH; **device:** tất cả; không phụ thuộc breakpoint.

- **Hiện tại — FACT:** `src/modules/statistics/components/statUtils.js:178` tính đầu tuần nhưng bỏ các ngày ngoài tháng trước khi chia nhóm7; `StatCalendar.jsx` vẫn render hàng T2…CN. Ngày1 tháng10/2026 nằm dưới T2 trong screenshot, thực tế là T5. HR `EmployeeAttendanceHistoryPage.jsx:278` render `T2,T3,T4,T5,T6,CC,T7`, không phải T7,CN; thuật toán `calCells:89` bắt đầu tuần từ T2.
- **Vấn đề / lý do:** lịch là phương tiện chọn/hiểu ngày làm việc; lệch thứ hoặc nhãn sai khiến đối chiếu nghỉ/đi làm bị hiểu sai.
- **Đề xuất:** thống nhất mô hình ô đầu/tháng/cuối và nhãn tuần; kiểm tra tháng bắt đầu mọi thứ, tháng nhuận. Không sửa bằng cách dịch nhãn CSS.
- **Bằng chứng:** [lịch thống kê](evidence/statistics-1366.png), [lịch HR](evidence/employees-attendance-history-375.png).

### UX-05 — Đổi tháng không đổi phạm vi bảng như người dùng kỳ vọng

**Screen:** HR history; **category:** INTERACTION, TABLE UX, CONSISTENCY; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT:** `EmployeeAttendanceHistoryPage.jsx:112` đổi calMonth và xóa selectedDate; `filtered:76` chỉ lọc employee/search/selectedDate, không lọc calMonth. Export `:158` lại lọc tháng. KPI `:123` dùng hôm nay khi không chọn ngày; calendar colors `:104` lấy tất cả rows, không theo nhân viên đang lọc. Work schedule `moveMonth:89` cũng giữ selectedDate cũ nhưng có nhãn ngày đang xem riêng.
- **Vấn đề / lý do:** màn hình đồng thời có phạm vi tháng lịch, tất cả ngày ở bảng và hôm nay ở KPI; xuất file không khớp bản ghi đang nhìn. Các sự khác nhau không được giải thích đủ ngay chỗ lọc.
- **Đề xuất:** một trạng thái phạm vi rõ: ngày hoặc tháng hoặc tất cả; bảng/KPI/export nêu phạm vi đang áp dụng. Đồng bộ lịch với employee filter, hoặc ghi rõ đây là lịch toàn công ty.

### UX-06 — Lỗi tải thống kê bị biến thành số 0 và thiếu công

**Screen:** self statistics; liên quan EntityDetailPage/work; **category:** INTERACTION, VISUAL HIERARCHY, CONSISTENCY; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT:** `StatisticsPage.jsx:45` trả [] cho promise thất bại; `:53` dùng allSettled và vẫn tính/render stats. Runtime khi API500: 0h, 0/22, thiếu176h, cảnh báo6 ngày chưa có dữ liệu; không có thông báo tải lỗi. `EntityDetailPage.jsx:44` thất bại cũng setItems([]); `useWorkData.js:29` allSettled không kiểm tra rejected nên catch cuối không xử lý lỗi thường gặp.
- **Vấn đề / lý do:** người dùng có thể tưởng mất công, chưa có hợp đồng hoặc không có việc cần xử lý. Đây là sai nghĩa dữ liệu, không chỉ thiếu spinner.
- **Đề xuất:** tách loading/empty/error/partial/stale; không tính công thiếu khi nguồn attendance chưa có; retry tại vùng lỗi. Nguồn holiday/leave lỗi phải gắn cảnh báo dữ liệu chưa đầy đủ.
- **Bằng chứng:** [API failure375](evidence/statistics-api-failure-375.png).

### UX-07 — Form cho nhập dữ liệu rồi bỏ khỏi payload tạo mới

**Screen:** HR/Admin thêm công từ history/statistics; **category:** FORM UX, CONSISTENCY, REDUNDANCY; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT:** HR modal `AttendanceFormModal.jsx:193` có giờ vào/ra, `:200` giờ thực tế, `:212` phê duyệt. HR history `submitModal:216` gửi times/hours nhưng không approval. HR statistics `submitModal:133` chỉ gửi employee/date/status/note, bỏ cả times/hours/approval. Admin history `:168` và Admin statistics `:131` cũng bỏ hours/approval dù form hiển thị.
- **Vấn đề / lý do:** người dùng dành thời gian nhập và tưởng đã lưu/duyệt; route tạo bản ghi quyết định dữ liệu nào bị bỏ. Không cần giả định backend mới xác nhận được mismatch này.
- **Đề xuất:** chốt một contract nghiệp vụ tạo/sửa/duyệt; field nào không được lưu trong thao tác đó phải không cho nhập hoặc có giải thích rõ. Không thêm lần xác nhận để che lỗi payload.

### UX-08 — Sửa/Xóa từ thống kê tháng chọn ngầm ngày mới nhất

**Screen:** HR/Admin statistics; **category:** INTERACTION, FORM UX, INFORMATION DENSITY; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT:** `EmployeeStatisticsPage.jsx:107` tìm latestRowOf; nút Sửa `:299` dùng latest hoặc object giả ngày01 không id. Modal gửi `!!row` nên trường hợp không có dữ liệu thành update thiếu id. Admin `AdminStatisticsPage.jsx:313` tương tự; Xóa `:330` dùng latest, có window.confirm nêu ngày (đây là biện pháp giảm rủi ro hiện có).
- **Vấn đề / lý do:** hàng đang mô tả cả tháng nhưng action tác động một ngày ngầm định; người cần sửa ngày khác đi sai đường. Sửa người chưa có công không thực sự là tạo mới.
- **Đề xuất:** thống kê → chi tiết tháng → chọn ngày → sửa. Thêm công mở luồng create có employee/month được điền sẵn; không đặt Xóa bản ghi đơn lẻ ở hàng tổng hợp tháng.

### UX-09 — Phản hồi lỗi/lưu trong modal không đủ để hoàn thành tác vụ

**Screen:** HR/Admin AttendanceFormModal; **category:** FORM UX, INTERACTION, ACCESSIBILITY; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT:** modal HR `submit:96`/Admin `:77` không có saving state; nút submit không disabled. Lỗi server do page `submitModal` setError ngoài modal rồi throw; modal catch chỉ giữ form, không hiển thị server error. Kiểm thử mock400 xác nhận thông báo nằm ngoài modal sau overlay. Validation tại modal dùng một paragraph cuối form, không liên kết field/focus.
- **Vấn đề / lý do:** bấm không thấy phản hồi hoặc bấm lại nhiều lần; người dùng không biết field nào cần sửa. Trên phone khu vực lỗi ngoài viewport/overlay càng khó nhận ra.
- **Đề xuất:** busy rõ trên nút, khóa submit đang chạy, lỗi server trong dialog, giữ input, focus lỗi và kết quả thành công. Chuẩn hóa theo pattern hiện có tốt hơn của `LeavePage.jsx:82` (saving + lỗi modal).

### UX-10 — Chi tiết duyệt dựa vào hover và div có click

**Screen:** HR history ô đã duyệt/từ chối; **category:** ACCESSIBILITY, MOBILE UX, INTERACTION; **severity:** HIGH; **device:** touch và keyboard.

- **Hiện tại — FACT:** `EmployeeAttendanceHistoryPage.jsx:383` dùng div onClick, không tabIndex/keyboard handler; `employee.css:980` hover ẩn badge, `:987` ẩn “Xem chi tiết” mặc định.
- **Vấn đề / lý do:** keyboard không tới được action; touch không có gợi ý rõ badge có thể bấm. Thông tin status bị thay bằng action khi hover.
- **Đề xuất:** button/link “Chi tiết” có tên truy cập, luôn thấy; giữ status độc lập với action; dialog có đường quay lại nhất quán.

### UX-11 — Duyệt công bị trộn với sửa mọi thuộc tính của bản ghi

**Screen:** history HR/Admin; **category:** FORM UX, REDUNDANCY, CONSISTENCY; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT:** Duyệt `EmployeeAttendanceHistoryPage.jsx:151`/Admin `:114` mở form sửa gồm nhân viên, ngày, trạng thái, giờ, phê duyệt và ghi chú. HR row pending chỉ có Duyệt khi checkout; từ chối đi qua Sửa → đổi phê duyệt; Admin có nút Từ chối riêng. HR row rejected chỉ mở lịch sử, Admin rejected còn có Sửa.
- **Vấn đề / lý do:** quyết định duyệt và điều chỉnh dữ liệu lẫn nhau; người dùng có thể đổi identity/date khi chỉ định duyệt. Thao tác phản hồi đơn bị từ chối khác nhau tùy khu.
- **Đề xuất:** quyết định duyệt hiển thị employee/date/ảnh/times đọc-only và lý do khi từ chối; sửa là hành động riêng. **NEEDS VALIDATION:** có bắt buộc HR đánh giá status thủ công từng bản ghi không; chưa đề nghị bỏ approval khi chưa biết kiểm soát nghiệp vụ.

### UX-12 — KPI Admin không co cột trên mobile

**Screen:** `/admin/attendance-history`; **category:** RESPONSIVE, TYPOGRAPHY, INFORMATION DENSITY; **severity:** HIGH; **device:** phone.

- **Hiện tại — FACT:** `AdminAttendanceHistoryPage.jsx:203` inline `gridTemplateColumns:repeat(4,1fr)` vượt rule media của `.admin-kpi-row` ở `admin.css:425`. Runtime375 documentWidth401; bốn ô vẫn cùng hàng, chữ xuống nhiều dòng, ô cuối tràn. HR có bản6 KPI/3 cột khác.
- **Vấn đề / lý do:** số liệu chính khó đọc và làm phát sinh cuộn ngang document ngoài cuộn bảng.
- **Đề xuất:** bố cục2 cột hoặc summary theo mức ưu tiên trên phone; tránh inline override breakpoint. Gắn thời gian đo với KPI và đưa số cần xử lý lên trước.

### UX-13 — Một số chức năng toàn project có action hỏng hoặc báo trạng thái sai

**Screen:** `/employees/leaves`, `/work`; **category:** INTERACTION, CONSISTENCY, NAVIGATION; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT từ source và runtime:** EmployeeLeavePage `:40` không truyền title; `EmployeeListPage.jsx:67` exportCsv gọi `title.toLowerCase()` → browser đã tái hiện TypeError khi Xuất CSV. WorkPage `:66` truy cập WORK_VIEWS[tab].title không fallback; browser đã tái hiện trang trắng/TypeError với `?tab=invalid`. Work tab tasks `:141` render toàn leavesFiltered, `:147` gắn “Chờ duyệt” cố định dù pendingLeaves `:31` đã có riêng.
- **Vấn đề / lý do:** lỗi export là tác vụ không hoàn tất; liên kết tab không hợp lệ không có phục hồi; đơn đã xử lý có thể mang nhãn đang chờ trong Work.
- **Đề xuất:** tên export có default; tab invalid về tab hợp lệ; lấy đúng collection/status thật. Kiểm thử regression theo task thay vì chỉ render snapshot.
- **FACT từ trace source bổ sung:** `WorkLayout.jsx:37` dùng WorkSidebar; `WorkSidebar.jsx:13–14` dẫn tới `/work/tasks`, `/work/reports`, trong khi App chỉ có `/work` và WorkPage dùng `?tab=`. Hai đường dẫn sidebar sẽ rơi vào wildcard về Home. Chưa mô phỏng click này trong browser; kết luận dựa trên cả link và routing đã trace. Đồng bộ một dạng URL cho tất cả điểm vào.

### UX-14 — Giới hạn tập dữ liệu không được nói rõ trên giao diện

**Screen:** HR/Admin history/statistics/schedule; **category:** TABLE UX, INTERACTION; **severity:** HIGH; **device:** tất cả; tăng theo quy mô doanh nghiệp.

- **Hiện tại — FACT:** `employeeAttendanceApi.js`/`adminAttendanceApi.js` lấy trang1, pageSize1000; history/statistics map items, không lặp các trang hoặc hiển thị totalCount; lịch sử cá nhân render tất cả rows không lọc/phân trang. Runtime dùng tập nhỏ nên chưa đo hiệu năng lớn.
- **Vấn đề / lý do — INFERENCE:** “toàn bộ”, tổng KPI và file xuất có thể chỉ phản ánh tập đã tải, trong khi người dùng không biết thiếu. Tải/render ảnh và rows nhiều trên mạng di động làm tác vụ chậm.
- **Đề xuất:** lọc tháng/ngày/nhân viên phía API, phân trang và tổng số chính xác; export xác nhận cùng phạm vi. **NEEDS VALIDATION:** số nhân viên/bản ghi thật và backend có giới hạn pageSize nào khác.

### UX-33 — Manager vào giao diện toàn công ty thay vì phạm vi được phân công

**Screen:** HR history/statistics/schedule; **category:** NAVIGATION, TABLE UX, INTERACTION; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT:** `src/constants/modules.js:51` cho Manager vào route employees; `EmployeeAttendanceHistoryPage.jsx:53` gọi attendanceAll/employeesAll và render tập tải được; `employeeAttendanceApi.js` gọi endpoint get-all. Không có bộ lọc nhân viên được phân công trong page. Đối chiếu backend/phân quyền chi tiết ở báo cáo BA.
- **Vấn đề / lý do:** yêu cầu xác nhận là Manager chỉ quản lý nhân viên được phân công. Quân số và action toàn công ty làm mờ trách nhiệm/phạm vi. Chỉ ẩn button frontend không đủ bảo vệ dữ liệu.
- **Đề xuất:** backend giới hạn dữ liệu theo người dùng; UI ghi rõ “Nhân viên tôi phụ trách”, action theo quyền thực tế. HR/Admin có ngữ cảnh toàn công ty; không bắt Manager tự chọn phạm vi bằng dropdown.

### UX-34 — Giờ công/OT không phản ánh lịch 8 giờ đã xác nhận

**Screen:** attendance và statistics; **category:** INFORMATION DENSITY, CONSISTENCY, INTERACTION; **severity:** HIGH; **device:** tất cả.

- **Hiện tại — FACT:** `statUtils.js:88` tính hoursWorked bằng elapsed check-in→check-out, `:133` coi phần vượt 8 giờ là otWeekday; card `AttendanceCard.jsx:129` không hiện lịch 08–12/13–17. Fixture 08:00→17:00 được hiển thị 9h/ngày và 1h OT, trong khi lịch xác nhận chỉ 8 giờ làm, nghỉ trưa 1 giờ. Source và screenshot statistics xác nhận cách tính/trình bày này.
- **Vấn đề / lý do:** giờ công/tăng ca không đúng policy đã biết; nhân viên có thể kỳ vọng sai thu nhập. Màn chấm công không cho biết đang áp lịch nào.
- **Đề xuất:** hiện lịch làm và khoảng nghỉ; tổng hợp theo policy/lịch hiệu lực, tách thời gian vào–ra khỏi giờ công nếu giữ cả hai. Không tự yêu cầu thêm 2 lượt chấm trưa khi số lượt punch chưa được xác nhận.

## 5. Medium / Low Issues

Mỗi hàng dưới đây là một issue riêng; bằng chứng source là `FACT`, tác động là `INFERENCE` trừ khi có runtime.

| ID / mức / loại / thiết bị | Hiện tại → Vấn đề → Tại sao → Đề xuất | Bằng chứng cụ thể |
| --- | --- | --- |
| UX-15 / MEDIUM / MOBILE UX, SPACING / phone ≤900 | 3 ô giờ/trạng thái xếp dọc và tuần min84px/ô → card rất dài, chỉ thấy3 ngày → tốn cuộn cho tác vụ mỗi ngày → gộp mốc giờ thành một summary và tuần gọn7 ngày | `attendance.css:1129`, `:1137`; [375px](evidence/attendance-375.png) |
| UX-16 / MEDIUM / FORM UX, VISUAL HIERARCHY / phone | CTA và hint ngang hàng → Vào ca bị bóp hẹp, xuống2 dòng → thông tin trợ giúp cạnh tranh với action → hint ngắn dưới action, CTA full width | `AttendanceCard.jsx:150`; `attendance.css:460`; screenshot375 |
| UX-17 / MEDIUM / INTERACTION / tất cả | Bấm Vào/Ra ca chỉ disable, chữ không đổi; done/error nằm cuối card → không rõ upload hay ghi nhận → dễ reload trên mạng chậm → phản hồi từng giai đoạn và xác nhận gần CTA | `AttendanceCard.jsx:82`, `:152`, `:228`; `AttendancePage.jsx:65` swallow lỗi refresh |
| UX-18 / MEDIUM / FORM UX, INTERACTION / phone/camera | Camera error một câu cho mọi trường hợp, active không có nút dừng/hủy, preview72px → chưa rõ khắc phục hoặc ảnh có dùng được → thêm hủy camera và hướng dẫn theo lỗi, preview đủ kiểm tra | `CameraCapture.jsx:36`, `:45`, `:127`; `attendance.css:202`; camera thật **NEEDS VALIDATION** |
| UX-19 / MEDIUM / INTERACTION, CONSISTENCY / tất cả | Ảnh tải lỗi404/mạng đổi thành “Không” → mất phân biệt không chụp với không tải được → HR có thể đánh giá sai bằng chứng → nhãn “Ảnh tải lỗi”, thử lại, giữ trạng thái có file | `PhotoCell.jsx:13`, `:27`, `:31` |
| UX-20 / MEDIUM / ACCESSIBILITY, MOBILE UX / touch | Điều hướng lịch26px, ô lịch30px, action nhỏ → cần chạm chính xác → tăng hit area và khoảng cách, đo toàn vùng có thể click | `employee.css:362`, `:401`, `:460`; header toggle/bell40px; không mặc định mọi nút<44px là vi phạm WCAG |
| UX-21 / MEDIUM / ACCESSIBILITY / keyboard | Dialog thiếu focus trap/restore/Escape; runtime mở modal vẫn focus ở +Thêm ngoài modal, Escape không đóng, Tab từ submit ra BODY; form không role dialog → đi lạc focus → chuẩn hóa vòng đời focus | `AttendanceFormModal.jsx:119`, `:129`; `AttendanceHistoryModal.jsx:16`; [modal observations](evidence/modal-observations.json); screen reader thật cần kiểm tra thêm |
| UX-22 / MEDIUM / RESPONSIVE, FORM UX / phone keyboard | `.att-form-row` giữ2 cột; input14px, modal dùng vh → cần kiểm tra date/time/bàn phím → một cột khi không đủ rộng; giữ action tới được qua vùng cuộn | `employee.css:798`, `:803`, `:561`; runtime modal vừa375 (HR335×499, Admin335×571), landscape480×294 có cuộn nội bộ; không gán lỗi modal overflow; keyboard thật **NEEDS VALIDATION** |
| UX-23 / MEDIUM / REDUNDANCY, VISUAL HIERARCHY / tất cả, rõ nhất ≤380 | Tổng giờ xuất hiện ở StatSummary và StatKpis; card dùng ký hiệu mũi tên nhưng không mở gì → số liệu trùng và affordance giả → gộp tổng giờ, chỉ giữ link có action, ưu tiên ngoại lệ | `StatSummary.jsx`, `StatKpis.jsx`; `attendance.css:1157`; [statistics375](evidence/statistics-375.png) |
| UX-24 / MEDIUM / CONSISTENCY, TABLE UX / tất cả | HR/Admin hai bộ history/form gần giống nhưng khác field/time/filter/reject/export → hành vi phân nhánh khó học → một quy ước trải nghiệm theo quyền, giữ khác biệt thật có lý do | So sánh các callsite của UX-07/08/11; App.jsx đăng ký cả hai họ route |
| UX-25 / MEDIUM / INTERACTION, NAVIGATION / tất cả | Chuông chỉ đọc/đánh dấu, không dẫn tới hồ sơ cần xử lý; fetch lỗi thành danh sách rỗng → phải tự đi tìm và hiểu nhầm hết việc → deep link bản ghi và trạng thái tải lỗi | `NotificationBell.jsx:100`, `:157`; chưa đề nghị thêm loại notification không có nghiệp vụ |
| UX-26 / MEDIUM / FORM UX / tất cả | Ngày thêm mới dùng UTC toISOString, không theo ngày đang lọc; status và actualHours có thể nhập độc lập → nhập lại hoặc chọn ngày sai buổi sáng → điền ngữ cảnh ngày/employee, thống nhất time zone và nguồn giờ | HR/Admin form `buildDraft:30/29`; HR `setTime:77` làm tròn giờ nguyên; quy tắc trả công cần BA xác nhận |
| UX-27 / MEDIUM / TYPOGRAPHY, ACCESSIBILITY / phone | Chữ phụ10–11px, `#9aa9b8` trên nền sáng; status lịch chủ yếu màu → đọc khó, khó nhận biết cho người thị lực kém → tăng cỡ/contrast và nhãn trạng thái có thể truy cập | `attendance.css:331`, `:544`, `:797`; `employee.css:394`; chưa tuyên bố contrast toàn site đạt/chưa đạt khi chưa đo từng cặp |
| UX-28 / LOW / CONSISTENCY, COMPONENT / tất cả | Emoji/Unicode xen logo ảnh, icon chữ và badge nhiều họ → hiển thị khác hệ điều hành → thống nhất icon set/token khi sửa liên quan | `CameraCapture.jsx:143`, `NotificationBell.jsx:134`, `HomePage.jsx:6`; không cần đổi icon chỉ để đẹp trước lỗi workflow |
| UX-29 / MEDIUM / NAVIGATION, INTERACTION / keyboard | Phím `[` toàn window không bỏ qua input → gõ nội dung có `[` làm sidebar đổi trạng thái → gây dịch bố cục khi nhập → bỏ qua editable/modifier và cung cấp shortcut discoverable | `AppLayout.jsx:31`, `HrAppLayout.jsx:30`; cùng pattern Admin/Work layouts |
| UX-30 / LOW / FORM UX, CONSISTENCY / người dùng cuối | Login mất mạng nói bật backend/kiểm tra VITE_API_BASE_URL → hướng dẫn kỹ thuật không giúp nhân viên → lời nhắn thử lại/liên hệ hỗ trợ; log kỹ thuật ngoài luồng người dùng | `LoginForm.jsx:43` |
| UX-31 / MEDIUM / NAVIGATION, INFORMATION DENSITY / phone | Home có16 tile kể cả kích hoạt tài khoản; mobile1 cột min148px → danh mục dài với chức năng không phải hàng ngày → nhóm theo tần suất và vai trò, đưa “hôm nay” lên trước | `HomePage.jsx:6`, `home.css:83`; `/home` vẫn có CTA bắt đầu chấm công, không phải hoàn toàn thiếu shortcut |
| UX-32 / MEDIUM / FORM UX, INTERACTION / tất cả | Công tác Admin lưu localStorage, lỗi lưu bị nuốt, UI trông như dữ liệu dùng chung → đổi máy không thấy nội dung → nói rõ trạng thái lưu và xác nhận hệ thống lưu dùng chung theo nghiệp vụ | `AdminWorkPage.jsx:10`, `:43`, `:47`, `:98`; không tự triển khai backend trong audit |

## 6. Mobile Audit

Đã quan sát viewport 320×740, 375×812, 390×844 và landscape 844×390 bằng Chromium. Vấn đề nặng nhất là **thứ tự ưu tiên nội dung và hành động**, không phải chỉ width của container.

| Tác vụ thực tế | Hiện trạng phone | Kết quả mong muốn |
| --- | --- | --- |
| Vào ca ngay sau mở trang | Menu13 mục trước card; camera mở được trong môi trường giả lập; cần cuộn/gập menu | Ngày, ca và CTA thấy ngay; camera mở/chụp/xác nhận có phản hồi rõ |
| Xem vì sao công bị từ chối | Bảng cần cuộn ngang; self history không có note/lý do; HR detail ẩn affordance sau hover | Status + lý do/đường xem chi tiết nằm trong cùng item ngày |
| HR duyệt một bản ghi | Lịch/KPI trước bảng; tên nhân viên và action tách hai đầu bảng | Danh sách cần xử lý, một item chứa đủ ngữ cảnh và action |
| Chọn ngày để xem lịch | Nút/ô lịch nhỏ, lịch HR có nhãn sai; schedule có aria-label ngày và số người tốt hơn | Ngày được chọn rõ, có date picker trực tiếp; không bắt phóng to để bấm |
| Tạo đơn nghỉ | Form có loading/save/error tại modal tốt hơn attendance; filter/list vẫn nhiều control | Giữ pattern phản hồi tốt, kiểm tra bàn phím mềm và chuyển hàng form |
| Đọc thông báo | Panel bên trái bị cắt tại375 | Panel vừa viewport, mỗi mục mở đúng tác vụ |

**Không được suy diễn:** camera giả lập không chứng minh camera iPhone/Android hoạt động; desktop emulation không mở bàn phím mềm; không có GPS trong `AttendanceCard`/`relatedApi.checkin`, vì vậy “GPS unavailable” không phải một luồng đang tồn tại cần UI sửa. Nếu nghiệp vụ yêu cầu GPS, đó là yêu cầu cần BA xác nhận, không phải lỗi responsive.

Mạng chậm/offline: source có catch nhưng không có chế độ offline cho chấm công; cần hiển thị chưa gửi/chưa xác nhận và đường thử lại. Không đề nghị tự động queue offline check-in khi chưa có policy về thời gian đáng tin cậy và ảnh. Chưa đo cache/service worker hoặc phục hồi network thực tế ngoài fixture API failure.

## 7. Desktop / Laptop Audit

Ở1366×768, card chấm công có khoảng trắng tốt, action/3 mốc thời gian đọc được và7 ngày nằm trọn một hàng. Bảng phục vụ so sánh nhiều nhân viên phù hợp hơn phone. Các lỗi ngày, scope, payload, action chọn ngầm bản ghi và phản hồi lỗi **vẫn hiện hữu ở desktop**; tăng width không giải quyết được.

Điểm cần cải thiện cho laptop: sidebar234px cộng padding main80px làm giảm diện tích bảng; ảnh + nhiều action lặp kéo dài hàng. Nên ưu tiên cột tên/ngày/giờ/trạng thái, mở ảnh hoặc lịch sử ở detail có ngữ cảnh. Toolbar admin vừa select nhân viên vừa search có thể hợp nhất thành một picker có tìm kiếm nếu không có lý do dùng hai điều kiện độc lập. Không mặc định bỏ mọi filter: bộ lọc trạng thái hoặc thời gian có giá trị khi giải quyết ngoại lệ.

Desktop có thể giữ mật độ cao hơn mobile; nên có sort/date-range đúng phạm vi, số lượng kết quả và trạng thái export rõ. Không đề xuất thay toàn bộ bằng dashboard/card nếu HR cần đối chiếu hàng loạt.

## 8. Tablet Audit

Ở768px, breakpoint≤900 vẫn xếp sidebar trên content như phone dù có thể còn đủ diện tích cho rail/menu ngắn. Ở1024px, sidebar giữ234px, main giảm thêm padding; bảng có thể cuộn cục bộ. Đây là hai chế độ chuyển đột ngột chưa dựa vào chiều rộng tối thiểu của tác vụ.

Đề nghị kiểm tra riêng tablet portrait768/820 và landscape1024: điều hướng gọn, bảng chính có cột nhận diện cố định, panel chi tiết mở cùng ngữ cảnh khi đủ rộng. Không áp chuẩn mouse-only cho tablet; hover detail UX-10 phải sửa trên mọi kích thước. Bàn phím rời và cảm ứng cùng tồn tại nên cần cả focus và target thuận tiện.

## 9. Responsive Issues

| Breakpoint / selector | FACT | Rủi ro hoặc quan sát |
| --- | --- | --- |
| `attendance.css:1100`, max900 | Body thành cột; sidebar full width | Main xuống y690 ở375 và844 landscape |
| `attendance.css:1129` | Hero times1 cột | Card kéo dài; snapshot mobile xác nhận |
| `attendance.css:1137` | 7 cột tối thiểu84px | Nội dung tuần cuộn ngang có chủ ý CSS, nhưng không cần thiết cho chỉ7 số ngày |
| `header.css:307`, max900 | Account right−32 | Runtime375 document391 |
| `header.css:352` | Bell width340 không media riêng | Runtime x−164 tại375 |
| `AdminAttendanceHistoryPage.jsx:203` | Inline4 cột KPI | Vượt media CSS, document401 tại375 |
| `employee.css:464`, max640 | KPI6→3 cột; schedule header wrap | Có xử lý reflow, vẫn mật độ chữ cao |
| `employee.css:803` | Form row2 cột không breakpoint tương ứng | Date/time cần kiểm tra mobile narrow và keyboard; không kết luận mất nút nếu chưa đo |
| `attendance.css:1151/1157` | Statistics2 cột≤560,1 cột≤380 |375 có7 tile dọc, calendar/detail xuống xa |
| `home.css:70/74/83` | Home4→3→2→1 cột | Không vỡ grid nhưng danh mục rất dài trên phone |

Phân biệt **document overflow**, **cuộn trong bảng** và **popup bị cắt bên trái**: cả ba có nguyên nhân và cách sửa khác nhau. Dùng `overflow-x:hidden` trên body để che lỗi sẽ làm mất nội dung chứ không hoàn tất mobile usability.

## 10. Component Consistency

| Thành phần | Khác biệt hiện tại | Hướng thống nhất có cơ sở |
| --- | --- | --- |
| Button | `admin-link-btn` nền tối, view-link viền, leave-btn/promotion-primary riêng; action công nhỏ hơn create leave | Token theo primary/secondary/danger + size desktop/touch; cùng action cùng ý nghĩa |
| Modal | guide/form/detail/history/leave/work/promotion khác width/padding/role/close | Một quy tắc tiêu đề, close, focus, busy, error, scroll; kích thước theo lượng dữ liệu, không ép mọi modal cùng width |
| Calendar | Self tháng sai offset; HR sai label; schedule đúng placeholder + aria-label hơn | Cùng tính ngày/tuần, cùng selected/today/accessibility; khác dữ liệu ô theo tác vụ |
| Table | History compact riêng; Admin thêm ảnh badge Có; self không filter; leave có pagination | Chính sách cột, empty/loading/error/pagination và cách đổi sang phone |
| Status | Status và approval riêng là có ý nghĩa; HR/Admin thao tác khác; Work gán pending cố định | Từ điển status có nghĩa nghiệp vụ, text+tone+action hợp lệ |
| Notification | Login/leave busy rõ; attendance chỉ disable; list dùng alert; work download catch im lặng | Phản hồi gần tác vụ, live region, retry; không biến lỗi thành empty |
| Typography | Arial global; shell Be Vietnam Pro; header/title Montserrat; text10–14 nhiều cấp | Thang typography theo title/body/helper; giữ đọc được trên phone |

Đừng coi hai trạng thái `status` và `approvalStatus` là dư chỉ vì có hai badge: một cái mô tả công, một cái mô tả xét duyệt. Chỉ hợp nhất cách trình bày khi vẫn bảo toàn ý nghĩa.

## 11. Navigation & Information Architecture

Route thực tế có ba không gian: self `/attendance*`, HR `/employees/*`, Admin `/admin/*` cùng alias `/admin/employees/*`. `/home` là launcher, `/work` lại tổng hợp báo cáo/nghỉ phép, `/reports` là nơi tạo báo cáo. Các layout dựng sidebar riêng và lưu collapse riêng; Header brand dùng `<a href>` về home.

Các vấn đề IA chính: (a) chức năng hằng ngày và ít dùng ngang cấp trong sidebar13 mục; (b) tạo/sửa công có ở cả history và statistics với logic khác; (c) thông báo không mở bản ghi; (d) “Báo cáo công việc” trong Admin attendance thực ra là tổng giờ công tháng, trong khi Reports/Work quản lý báo cáo tài liệu. Đổi tên cụ thể “Tổng giờ công tháng” sẽ giảm nhập nhằng mà không cần thêm chức năng.

**NEEDS VALIDATION:** Admin có thật sự cần dùng song song `/employees` và `/admin/employees`, hay đó là hai bản giao diện cùng quyền? Chưa đề nghị xóa route khi chưa có dữ liệu sử dụng/bookmark và vai trò cụ thể. Khi hợp nhất có cơ sở, nên giữ redirect/link cũ và phạm vi quyền backend.

## 12. Form UX

Tác vụ đã trace:

| Task / điểm bắt đầu | Bước/tap tối thiểu trong trang, không tính gõ từng ký tự | Friction / bước có thể giảm |
| --- | --- | --- |
| Chấm công, camera đã được cấp quyền | 3: Chụp ảnh → Chụp → Vào/Ra ca; từ Home thêm1 | Không mặc định bỏ preview/xác nhận: ảnh là bằng chứng. Có thể đổi label “Chụp và tiếp tục” nhưng chỉ sau xác nhận policy. Mobile thêm cuộn hoặc1 tap gập sidebar |
| HR duyệt row đã có status/checkout | 2: Duyệt → Xác nhận duyệt; nếu chưa status thêm chọn status | Tách modal quyết định để không phải rà lại8 field sửa; có bỏ bước xác nhận hay không cần kiểm soát nghiệp vụ |
| HR từ chối qua giao diện hiện có | Sửa → Phê duyệt → Từ chối → nhập lý do → Lưu; status có thể cần chọn | Nút Từ chối trực tiếp + lý do; không qua luồng sửa identity/time |
| Sửa một ngày trong thống kê | Hiện1 tap Sửa chọn ngày mới nhất; muốn ngày khác còn chỉnh trong form | Tap ít nhưng chọn sai ngữ cảnh. TO-BE chọn ngày cụ thể trước sửa có thể nhiều1 bước nhưng giảm lỗi |
| Tạo công cho ngày đang lọc | Thêm → tìm/chọn NV → chọn ngày/giờ/status → Thêm mới | Điền sẵn ngày đang xem/employee đã lọc; không cho chọn approval nếu create bỏ field đó |
| Tạo nghỉ phép | Tạo đơn → chọn loại/khoảng/ngày hoặc nửa ngày → lý do → gửi | Có tính số ngày tự động và saving tốt; không bắt user gõ lại totalDays |

Số tap này lấy từ control/action trong source, không phải thời gian hoàn thành tác vụ đã đo trên nhóm người dùng. Native select và OS permission có thể thêm thao tác tùy thiết bị.

Validation: giữ field required có lý do nghiệp vụ; không yêu cầu user nhập lại dữ liệu đã chọn. History HR đang cộng ngày khi giờ ra nhỏ hơn giờ vào, còn statistics không cộng. Với lịch hành chính đã xác nhận, cần báo rõ khoảng giờ không hợp lệ; chỉ hiển thị “ra ngày hôm sau” nếu nghiệp vụ ca qua ngày được xác nhận sau này. Lỗi cần gắn field và không mất input khi server từ chối. Draft autosave không được mặc định thêm cho mọi form ngắn; chỉ cân nhắc với form dài và có bằng chứng mất dữ liệu.

## 13. Table / Data-heavy UX

Self history không có date range/search/pagination, nên khó tìm tháng cũ trong một tập dài. HR history có lịch, search và export nhưng không filter riêng pending; KPI “chờ duyệt” chưa trở thành điểm vào hàng đợi xử lý. Admin có nhân viên select + search, month input; có thể gộp tìm nhân viên để giảm hai điều kiện chồng nhau. Stats “ngày đã làm X/Y” dùng Y là số bản ghi, khác chỉ tiêu ngày chuẩn ở self; cần nhãn mẫu số rõ để người dùng không so sánh sai.

Đề xuất theo task: nhân viên → ngày gần đây và điều bất thường trước; người duyệt → bản ghi cần xử lý, đủ dữ liệu đối chiếu, chi tiết ảnh theo yêu cầu; quản trị tổng hợp → bảng có range, pagination/total và export cùng scope. Không tải toàn bộ ảnh lịch sử ngay khi chỉ cần tổng số giờ.

Empty state: hiện nhiều màn hình chỉ “Không có bản ghi phù hợp”; nên phân biệt chưa có dữ liệu và filter không khớp, đưa “Xóa bộ lọc” khi có filter. Không hiện nút tạo nếu actor không có quyền hoặc dữ liệu là hệ thống sinh. Loading/error phải riêng như UX-06.

## 14. Accessibility

Điểm tốt: login label liên kết id, autocomplete username/password, toggle mật khẩu có aria-label; calendar month arrows có label; một số dialog leave có role/aria-labelledby; status thường có chữ ngoài màu; sidebar dùng NavLink.

Thiếu đã thấy từ source: div mở chi tiết không keyboard; form dialog không role/name/focus/Escape; toast/error phần lớn không live region; combobox có role nhưng chưa đầy đủ keyboard behavior; calendar màu pending/done thiếu tên đầy đủ cho ngày và trạng thái selected; Header menu role menu chưa có điều hướng phím tương ứng. Shortcut `[` cần tránh input. Một số filter dựa placeholder/option thay label riêng.

Đánh giá touch target cần tính cả label/hit area, không kết luận checkbox13px thất bại khi label mở rộng vùng click. Test screen reader, tab order, zoom200%, high contrast, reduced-motion, date input iOS và focus khi keyboard mở là **NEEDS VALIDATION**. Không có cơ sở yêu cầu dark mode mới; nếu sản phẩm có cam kết dark mode mới cần audit theme đó.

## 15. Redundancy & Unnecessary Interactions

| Hiện tại | Vì sao có thể rườm rà | Bằng chứng / tác động | Khuyến nghị |
| --- | --- | --- | --- |
| Tổng giờ và giờ làm ở hai tile | Cùng hoursWorked | StatSummary + StatKpis, screenshot statistics; chiếm màn hình | Một số chính, detail cơ sở tính |
| Thêm/sửa ở history và statistics | Cùng entity nhưng contract khác | UX-07/08; nhiều điểm học và lỗi | Statistics dẫn tới ngày, CRUD công một luồng |
| Nhân viên select + search Admin | Hai cách thu hẹp cùng nhân viên | AdminHistory:230/249 | Picker tìm tên/mã, giữ advanced filter nếu có nhu cầu khác |
| Duyệt mở toàn bộ form edit | Người dùng không cần đổi tất cả field khi ra quyết định | UX-11 | Form quyết định tối thiểu, nút chỉnh sửa riêng |
| “Có” dưới ảnh đang hiện | Ảnh đã chứng minh có ảnh | PhotoCell hideYesBadge HR có, Admin chưa dùng | Bỏ badge Có; giữ “chưa có” khác “tải lỗi” |
| Xóa ảnh + Chụp lại | Chụp lại đã gọi remove rồi start | CameraCapture:85 | Giữ Chụp lại; “Hủy ảnh” chỉ khi người dùng cần rời flow. Không coi đây là thừa tuyệt đối |
| Ngày/nhân viên nhập lại | Context đã biết từ filter/row | buildDraft default | Prefill, thể hiện rõ nguồn và cho sửa khi nghiệp vụ cho phép |
| Home và sidebar danh mục phẳng dài | Lặp lựa chọn trong task thường xuyên | HomePage/MODULES | Home cho đổi module, trong attendance cho tác vụ ngày; kiểm chứng tần suất |

Không tự động xóa confirm của hành động phá hủy, không bỏ approval chỉ để giảm click. Số bước ít hơn không tốt nếu làm mờ bản ghi bị tác động như UX-08.

## 16. Recommended TO-BE Improvements

**Nhân viên:** vào Chấm công → thấy ngày/ca phù hợp và trạng thái cuối đã được server xác nhận → chụp → xem ảnh → xác nhận → kết quả giờ ghi nhận ngay tại card. Có lỗi camera/mạng thì biết điều gì chưa hoàn tất và cách thử lại; không báo thành công nếu chỉ upload ảnh xong. Lịch sử là danh sách theo ngày, đọc được lý do từ chối/điều chỉnh và đường khắc phục đã được nghiệp vụ cho phép.

**HR/Manager:** vào danh sách cần xử lý với phạm vi ngày/tháng rõ → chọn một nhân viên/ngày → xem times/ảnh/trạng thái → duyệt hoặc từ chối có lý do; sửa riêng khi cần. Bảng/list/export cùng phạm vi; đã xử lý có lịch sử và action hợp lệ theo quyền. Chỉ bổ sung duyệt hàng loạt khi chủ nghiệp vụ xác nhận được kiểm soát và có khối lượng thực tế; chưa mặc định thêm.

**Admin/thống kê:** tổng hợp là read-only theo mặc định; đi từ tổng số đến danh sách ngày rồi chọn record. Một mô hình status, time zone và nguồn giờ công được dùng nhất quán. Lịch xác nhận 08–12/13–17 phải được phản ánh, không gọi giờ nghỉ trưa là OT. Ngày làm trong tuần/phép còn lại vẫn cần policy, không suy ra chỉ từ thứ2–6. Manager xem nhân viên được phân công; HR/Admin xem toàn công ty.

**Điều kiện nghiệm thu đề xuất:**375px không cuộn ngang document; popup hoàn toàn trong viewport; task chấm công không phải cuộn qua navigation; ngày đúng thứ; filter/export đồng phạm vi; payload giữ đúng dữ liệu cho phép nhập; duplicate click đang save bị chặn; API failure không biến thành zero business data; thao tác chính dùng được keyboard.

## 17. Priority Roadmap

| Ưu tiên | Hạng mục | Lý do / tiêu chí xong |
| --- | --- | --- |
| P0 — sửa ngay trước nghiệm thu | UX-04/05/06/07/08/09/33/34; action hỏng UX-13 | Sai ngày, sai scope, sai nghĩa số liệu, bỏ input hoặc nhắm sai record trực tiếp ảnh hưởng tin cậy dữ liệu. Dùng các tình huống tái hiện cụ thể nêu trên |
| P1 — nên sửa sớm | UX-01/02/03/10/11/12/14 | Mobile navigation/menu/table và khả năng duyệt đúng ngữ cảnh; kiểm thử375,768,1024,1366 cùng touch/keyboard |
| P2 — cải thiện sau | UX-15…27,29,31,32 | Tối ưu nội dung, camera recovery, form context, notification, dữ liệu lớn; chốt policy trước những thay đổi nghiệp vụ |
| P3 — polish | UX-28/30 và token/spacing còn lại | Icon, thông điệp và nhất quán thị giác sau khi flow đúng |

Severity mô tả tác động hiện tại; P0…P3 mô tả thứ tự triển khai. Một lỗi HIGH có thể P0 vì liên quan dữ liệu mà không có nghĩa toàn hệ thống tê liệt. Báo cáo không ước lượng số ngày sửa khi chưa có team capacity và phạm vi được duyệt.

## 18. Issue Matrix

| ID | Screen | Issue | Category | Severity | Device | Evidence | Recommendation |
| -- | ------ | ----- | -------- | -------- | ------ | -------- | -------------- |
| UX-01 | Shared/attendance | Navigation trước task | NAVIGATION, MOBILE UX | HIGH | ≤900 | AppLayout:10; attendance.css:1100; y690 | Menu theo yêu cầu |
| UX-02 | Header | Popup bị cắt/tràn | RESPONSIVE, COMPONENT | HIGH | Phone | header.css:307/352; x−164/account391 | Neo viewport |
| UX-03 | History/stats | Cuộn bảng tách action/ngữ cảnh | TABLE UX, MOBILE UX | HIGH | Phone | HistoryTable:21; table620/parent301 | List theo record |
| UX-04 | Calendar | Sai thứ/ngày | COMPONENT, CONSISTENCY | HIGH | All | statUtils:178; HRhistory:278 | Mô hình lịch chuẩn |
| UX-05 | HR history | Bảng/KPI/export khác scope | INTERACTION, CONSISTENCY | HIGH | All | filtered:76; shiftCalendar:112; export:158 | Scope thống nhất |
| UX-06 | Self stats/detail/work | API failure thành0/empty | INTERACTION | HIGH | All | StatisticsPage:45; fixture500 | Error/partial riêng |
| UX-07 | Create attendance | Input bị bỏ payload | FORM UX, REDUNDANCY | HIGH | All | HRstats:133; AdminHistory:168 | Contract form/API |
| UX-08 | Monthly stats | Sửa/Xóa latest ngầm | INTERACTION, FORM UX | HIGH | All | HRstats:299; AdminStats:313 | Chọn ngày rõ |
| UX-09 | Attendance modal | Không busy; lỗi ngoài overlay | FORM UX, ACCESSIBILITY | HIGH | All | HRmodal:96; page submitModal | Feedback tại modal |
| UX-10 | HR history | Hover/div-only details | ACCESSIBILITY, MOBILE UX | HIGH | Touch/keys | HRhistory:383; employee.css:980 | Button luôn thấy |
| UX-11 | Approval | Duyệt lẫn sửa | FORM UX, REDUNDANCY | HIGH | All | HRhistory:151; AdminHistory:114 | Quyết định riêng |
| UX-12 | Admin history |4 KPI ép phone | RESPONSIVE, TYPOGRAPHY | HIGH | Phone | AdminHistory:203; doc401 | Grid2 cột |
| UX-13 | Leaves/work | Export/tab/status lỗi | INTERACTION, NAVIGATION | HIGH | All | EmployeeList:67; WorkPage:66/141 | Fallback/đúng status |
| UX-14 | HR/Admin datasets | Tổng không biết bị giới hạn | TABLE UX | HIGH | All | attendanceApi page1,size1000 | Server filter/total |
| UX-15 | Attendance | Card dài/tuần cuộn | SPACING, MOBILE UX | MEDIUM | Phone | attendance.css:1129/1137 | Summary gọn |
| UX-16 | Attendance | Hint bóp CTA | VISUAL HIERARCHY | MEDIUM | Phone | AttendanceCard:150 | Hint dưới nút |
| UX-17 | Attendance | Thiếu tiến trình/chưa sync | INTERACTION | MEDIUM | All | AttendanceCard:82/228 | Feedback gần action |
| UX-18 | Camera | Recovery/hủy chưa rõ | MOBILE UX, INTERACTION | MEDIUM | Phone | CameraCapture:36/127 | Hủy/hướng dẫn lỗi |
| UX-19 | PhotoCell | Lỗi ảnh thành Không | CONSISTENCY | MEDIUM | All | PhotoCell:27/31 | Phân biệt tải lỗi |
| UX-20 | Calendar/actions | Target nhỏ | MOBILE UX, ACCESSIBILITY | MEDIUM | Touch | employee.css:362/401/460 | Hit area tốt |
| UX-21 | Modal/combobox | Focus/keyboard thiếu | ACCESSIBILITY | MEDIUM | Keys/SR | HRmodal:119/129 | Focus lifecycle |
| UX-22 | Forms |2 cột/vh trên phone | RESPONSIVE, FORM UX | MEDIUM | Phone | employee.css:798/803 |1 cột/keyboard test |
| UX-23 | Self stats | Trùng giờ/arrow giả | REDUNDANCY | MEDIUM | All | StatKpis/StatSummary | Gộp/link thật |
| UX-24 | HR/Admin | Pattern rẽ nhánh | CONSISTENCY | MEDIUM | All | Hai họ route/form | Chung theo quyền |
| UX-25 | Bell | Không dẫn tới việc/lỗi rỗng | NAVIGATION | MEDIUM | All | NotificationBell:100/157 | Deep link/error |
| UX-26 | Attendance form | Context/time zone nhập lại | FORM UX | MEDIUM | All | buildDraft:30; setTime:77 | Prefill/date chuẩn |
| UX-27 | Helper/calendar | Chữ nhỏ/màu yếu | TYPOGRAPHY, ACCESSIBILITY | MEDIUM | Phone | attendance.css:331/797 | Type/contrast/label |
| UX-28 | Shared | Icon khác phong cách | CONSISTENCY | LOW | All | Home/Camera/Bell | Icon token |
| UX-29 | Layout | `[` chạy khi gõ input | INTERACTION | MEDIUM | Keys | AppLayout:31 | Guard editable |
| UX-30 | Login | Lỗi nói biến môi trường | FORM UX | LOW | All | LoginForm:43 | Recovery cho user |
| UX-31 | Home | Launcher dài trên phone | INFORMATION DENSITY | MEDIUM | Phone | home.css:83 | Nhóm task/role |
| UX-32 | Admin work | Lưu local không rõ | INTERACTION | MEDIUM | All | AdminWork:43/47 | Trạng thái lưu rõ |
| UX-33 | Manager | Giao diện toàn công ty vượt phạm vi phụ trách | TABLE UX, INTERACTION | HIGH | All | MODULES:51; HRhistory:53 | Scope backend + ngữ cảnh UI |
| UX-34 | Attendance/stats |9h/1h OT thay8h có nghỉ trưa | CONSISTENCY, INTERACTION | HIGH | All | statUtils:88/133; policy xác nhận | Giờ công theo lịch áp dụng |

# TOP 10 CHANGES

1. Đưa tác vụ chấm công lên vùng nhìn đầu tiên của phone; navigation mở theo yêu cầu.
2. Giữ account/notification panel hoàn toàn trong viewport; sửa header co chật.
3. Sửa lịch lệch thứ và đồng bộ phạm vi ngày/tháng của lịch, bảng, KPI và file xuất.
4. Tách API failure khỏi “0 công”, “chưa có dữ liệu” và “không có thông báo”.
5. Đồng bộ form với payload, giờ công 8 giờ có nghỉ trưa và phạm vi Manager; không nhận input mà thao tác lưu bỏ qua.
6. Chọn record/ngày rõ trước Sửa/Xóa; bỏ quyết định ngầm dùng latest.
7. Chuẩn hóa modal busy/error/focus, chống bấm lặp khi đang gửi.
8. Cho mobile danh sách công với tên/ngày/trạng thái/action trong cùng item; desktop giữ bảng so sánh.
9. Tách sửa dữ liệu khỏi quyết định duyệt/từ chối, giữ lý do nghiệp vụ của approval.
10. Gộp số liệu giờ công trùng, tăng target/typography và hiện action chi tiết không phụ thuộc hover.

# MOBILE-FIRST RECOMMENDATIONS

| Màn hình desktop-heavy | Mô hình phone đề xuất | Vì sao có cơ sở |
| --- | --- | --- |
| Sidebar13 mục | Navigation thu gọn, tác vụ hằng ngày gần tay, module khác mở khi cần | Thao tác check-in lặp hằng ngày, runtime chứng minh task bị đẩy xuống |
| Bảng lịch sử8–9 cột | Item ngày/nhân viên với vào–ra, công và status; detail chứa ảnh/audit | Giảm ghi nhớ ngữ cảnh khi cuộn ngang |
| Duyệt công | Hàng đợi bản ghi cần xử lý + màn/detail quyết định | Loại bỏ việc mở form sửa mọi field để duyệt |
| Thống kê tháng | Summary công/giờ/ngoại lệ; lịch và chi tiết có thể mở tiếp | Hiện có7 tile, giờ trùng, calendar xuống sâu |
| Form sửa công | Một cột, employee/date rõ, date/time phù hợp bàn phím, action/lỗi trong vùng cuộn | Dữ liệu giờ/ngày quan trọng hơn giữ bố cục2 cột |
| Notification popup | Panel theo viewport, nội dung + link đến hồ sơ | Popup hiện bị cắt, user phải tự tìm tác vụ |
| Camera | Preview đủ kiểm tra, hủy/chụp lại, “Đang gửi ảnh/Đang ghi nhận”, kết quả rõ | Ảnh bắt buộc; network là một phần của việc hoàn tất chấm công |

**Kết luận:** UI tốt nhất ở cấu trúc desktop của chấm công, nền tảng component/label và phản hồi submit ở login/leave. Yếu nhất là mobile navigation/menu/table và độ tin cậy của thông tin ngày/phạm vi/lỗi. Visual issues là mật độ, chữ phụ, icon và spacing; UX issues là feedback, input bị bỏ, action chọn ngầm record; IA issues là ba không gian gần trùng, reporting nhập nhằng và navigation phẳng; responsive/mobile issues là sidebar dài, popup vượt biên, KPI ép4 cột, table desktop và hover-only detail. Năm thay đổi nên làm đầu tiên chính là các mục1–5 của TOP10; riêng lỗi thao tác nhắm sai record UX-08 cần xử lý cùng đợt dữ liệu để không còn nguy cơ sửa nhầm.
