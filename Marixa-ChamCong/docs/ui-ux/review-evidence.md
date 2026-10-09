# Nhật ký phạm vi và bằng chứng UI/UX

Ngày đánh giá: **08/10/2026**. Đọc trực tiếp frontend `ChamCong/src`; chỉ tạo tài liệu và artifact kiểm thử. Không sửa source, CSS, routing hoặc database. Chi tiết phương pháp trình duyệt và giới hạn ở [evidence/README.md](evidence/README.md).

## 1. Skill và cách áp dụng

- UI/UX Pro Max đã được root cập nhật qua CLI chính thức 2.15.0 và hợp nhất vào `C:/Users/khang/.codex/skills/ui-ux-pro-max/`; không tạo thêm bản active trong workspace.
- Đã đọc toàn `SKILL.md` theo các đoạn có giới hạn. Bản vừa cập nhật ban đầu ở `.agents` được đọc trước khi root chuyển về vị trí `.codex`; các truy vấn sau dùng vị trí chuẩn `.codex`.
- Python 3.13 có sẵn; không cài Python/phần mềm hệ thống.
- Truy vấn `keyboard focus modal --domain ux`: áp dụng kết quả Focus States, Focus Not Obscured với phân biệt AA/AAA; không suy ra modal đã có focus trap chỉ từ role.
- Truy vấn `responsive table mobile --domain ux`: kết quả Table Handling, Mobile First, Viewport Meta phù hợp web. Không coi mọi cuộn ngang trong bảng là lỗi document overflow.
- Truy vấn đầu `form state validation --stack react` trả các kết quả state tổng quát, chưa đủ sát vấn đề form. Đã thu hẹp một lần thành `controlled input --stack react`, nhận Forms/Controlled components và Accessibility/Label form controls. Chỉ dùng phần phù hợp hiện trạng; không dùng skill làm lý do đổi React version, TypeScript hoặc thư viện ngoài yêu cầu.
- Không tạo design-system mới vì task là audit giao diện đang tồn tại.

## 2. Cấu trúc và điểm vào

`ChamCong/package.json` khai báo React19, React Router7, Vite, Axios, ExcelJS. `src/main.jsx` gắn App/LanguageProvider; `src/App.jsx` là nguồn route đã đối chiếu. Các stylesheet là CSS global, nhiều component dùng chung class `att-*`, `admin-*`, `hr-*`; việc một page import CSS không bảo đảm style chỉ áp dụng page đó.

**Mức đọc:** `Sâu` = trace state, handler, render, API wrapper và CSS liên quan; `Mở rộng` = kiểm tra entry point, cấu trúc/render/action liên quan consistency cùng shared components; không xác nhận toàn nghiệp vụ của module ngoài Attendance; `Runtime` = có quan sát UI bằng fixture. Danh mục route toàn project đã map, nhưng không có tuyên bố đã test mọi nhánh backend thật hoặc mọi form có dữ liệu ở từng module.

| Route/nhóm route từ App.jsx | Page/component thực tế | Phạm vi bằng chứng |
| --- | --- | --- |
| `/`, `/home`, wildcard | Navigate → HomePage | Sâu; runtime Home8 viewport; wildcard dùng để đối chiếu link sai |
| `/login` | LoginPage → LoginForm | Sâu; runtime8 viewport |
| `/kich-hoat` | ActivatePage/ActivateForm | Đọc form/policy/label/loading; không kích hoạt tài khoản thật |
| `/unauthorized` | UnauthorizedPage | Đọc recovery/navigation; không gọi số hỗ trợ |
| `/attendance` | AttendancePage → AttendanceCard → CameraCapture | Sâu; runtime8 viewport + camera giả + menu |
| `/attendance-history` | AttendanceHistoryPage → HistoryTable/PhotoCell | Sâu; runtime8 viewport |
| `/statistics` | StatisticsPage → StatKpis/Calendar/DetailTable/Warnings/Summary/statUtils | Sâu; runtime8 viewport + API500 |
| `/employees/attendance-history` | EmployeeAttendanceHistoryPage → AttendanceFormModal/HistoryModal | Sâu; runtime8 viewport + populated/modal/mock400/focus |
| `/employees/work-schedule` | EmployeeWorkSchedulePage | Sâu; runtime8 viewport |
| `/employees/statistics` | EmployeeStatisticsPage → AttendanceFormModal/DetailModal | Sâu; runtime8 viewport |
| `/admin/attendance-history`, `/admin/employees/attendance-history` | AdminAttendanceHistoryPage, hrMode theo route | Sâu; route chính runtime8 viewport + modal; alias map từ App |
| `/admin/statistics`, `/admin/employees/statistics` | AdminStatisticsPage, hrMode theo route | Sâu; route chính runtime8 viewport; alias map từ App |
| `/leave` | LeavePage/Create/Details/Calendar | Sâu luồng form/API/render; runtime8 viewport; không gửi đơn thật |
| `/employees/leaves` | EmployeeLeavePage → EmployeeListPage/ApproveButtons | Sâu cấu hình/list/export; runtime375 xác nhận export lỗi |
| `/admin/leaves`, `/admin/employees/leaves` | LeaveAdminPage → AdminListPage | Đọc wrapper, status/action và shared list; chưa duyệt/từ chối trên backend |
| `/work` | WorkPage → WorkLayout/WorkSidebar/useWorkData | Sâu; runtime8 viewport + invalid query gây lỗi |
| `/reports` | MyReportsPage | Mở rộng; runtime375 fixture; không upload/download thật |
| `/employees/reports`, `/admin/reports`, `/admin/employees/reports` | ReportsPage từ employees/hr, có prop admin | Mở rộng entry/render/actions/modal; chưa audit end-to-end toàn vòng báo cáo |
| `/employees`, `/admin/employees` | Hai HrPage riêng; các Filter/KPI/Table/Pagination/AddForm | Mở rộng layout/list/form/import-export boundary; runtime375 fixture; không import Excel thật |
| `/employees/payroll` | Navigate → `/employees` | Route alias/redirect; không xem là một payroll page riêng |
| `/admin` | AdminHomepage | Entry/navigation/dashboard; style dùng cùng shell |
| `/admin/payroll`, `/admin/resigned` | PayrollAdminPage, ResignedPage trong PayrollResignedReport | Đọc cấu hình cột/filter/fetcher/shared list; không xác nhận tính lương |
| `/contracts`, `/salary`, `/insurance`, `/bank-accounts` | Các wrapper → EntityDetailPage | Sâu shared loading/error/table + toàn cấu hình cột; runtime375 fixture |
| `/profile` | ProfilePage → AvatarBlock | Sâu ProfilePage/state/fields; runtime375; avatar chỉ liên quan local UI |
| `/employees/contracts`, `/admin/contracts`, `/admin/employees/contracts` | EmployeeContractPage wrapper → AdminContractPage | Mở rộng boundary tìm/search/create modal; chưa tạo hợp đồng |
| `/employees/accounts`, `/admin/accounts`, `/admin/employees/accounts` | Hai AccountIssuancePage, hrMode khác | Map route, điều hướng/cùng CSS account; các nhánh cấp/kích hoạt cần kiểm thử staging riêng |
| `/promotions`, `/employees/promotions`, `/admin/employees/promotions` | PromotionsPage với selfMode và bản Admin | Đọc logic/render/form/review scope; runtime self375 fixture; không thay chức vụ/quyền |
| `/handover`, `/employees/handover`, `/admin/employees/handover` | HandoverPage với self/reviewMode/admin | Mở rộng wizard/table/actions/role/dialog; runtime self375; không chuyển nhân viên nghỉ việc |
| `/admin/work` | AdminWorkPage | Sâu localStorage/save/filter/form; runtime375 |
| `/admin/roles` | AdminRolesPage | Mở rộng role cards/tables/actions/drag/modal; runtime375 fixture; không đổi quyền thật |
| `/admin/block-accounts` | AdminBlockAccountPage | Mở rộng action/filter/table; không chặn/mở tài khoản thật |

Không suy ra code chết chỉ vì không import trực tiếp trong App: EmployeeListPage được EmployeeLeavePage sử dụng. Ngược lại `PayrollResignedReport.ReportPage` không phải ReportsPage được route hiện tại dùng; không lấy phép tổng hợp ở component này làm behavior của `/admin/reports`.

## 3. File/chức năng đã trace sâu cho Attendance

| Lớp | File/chức năng |
| --- | --- |
| Shell/route | `App.jsx`, `AppLayout.jsx`, `Sidebar.jsx`, `Header.jsx`, `NotificationBell.jsx`, `ChangePasswordModal.jsx`, `GuideModal.jsx`, HrAppLayout/HrSidebar, AdminSidebar, WorkLayout/WorkSidebar |
| Quyền frontend | `constants/modules.js`, `services/auth/permission.js`, RequireModule callsites; frontend role gate không thay thế quyền API |
| Chấm công | `AttendancePage.loadAttendance/handleChecked`, `AttendanceCard.check/buildWeek`, `CameraCapture.start/capture/retake/stop`, `relatedApi.checkin/uploadPhoto` |
| Lịch sử | Self HistoryTable/PhotoCell; Employee/AdminHistory load/filter/calendar/KPI/approve/export/submitModal |
| Modal | Employee/AdminAttendanceFormModal buildDraft/setTime/submit; AttendanceDetailModal/HistoryModal |
| Thống kê | Self StatisticsPage allSettled/monthRows/byDate; statUtils computeStats/dayStatusOf/buildCalendar/buildWarnings; StatKpis/Summary/Warnings/Calendar/DetailTable; Employee/AdminStatistics perEmployee/latestRowOf/submitModal/doDelete |
| Lịch làm | EmployeeWorkSchedulePage scheduleForDate/monthDates/attendanceByEmployee/moveMonth |
| API wrapper | relatedApi, employeeAttendanceApi, adminAttendanceApi; request paging, payload create/update, upload, photo URL/time formatting |
| CSS liên quan | attendance.css, employee.css, admin.css, header.css; breakpoint/layout/dialog/table/calendar; home/login/leave/work CSS cho consistency |
| Dependency nghỉ phép/công việc | LeavePage load/createRequest/LeaveFormModal/LeaveCalendar; EmployeeLeave/AdminLeave wrappers; EmployeeList/AdminList exportCsv/act/render; WorkPage/useWorkData |

**Số dòng:** dùng dòng phân tách LF như `rg -n`. `EmployeeAttendanceHistoryPage.jsx` có CRCRLF; PowerShell Get-Content/Python universal-newline có thể đếm gần gấp đôi. Không normalize file source trong audit. Các mốc chuẩn: `filtered:76`, `calCells:89`, `dayStatus:104`, `shiftCalendar:112`, `kpi:123`, `approve:151`, `exportMonth:158`, `submitModal:181`, `create:216`, weekday labels`:278`, table`:327`, pending`:367`, detail`:383`. AccountIssuancePage của employees cũng có CRCRLF, cần cùng quy tắc khi kiểm tra tiếp.

## 4. Bằng chứng trình duyệt

- Bộ chính: [runtime-observations.json](evidence/runtime-observations.json), 101 quan sát; 12 route ×8 viewport +5 interaction/error states.
- Bộ mở rộng: [interaction-observations.json](evidence/interaction-observations.json); các route ngoài Attendance chủ yếu layout/empty fixture, không đầy đủ form/data/permission branches.
- Bộ modal chính xác: [modal-observations.json](evidence/modal-observations.json); dùng ảnh viewport-only `hr-modal-viewport-*`, `admin-modal-viewport-*`. Không dùng selector thiếu `.att-form-modal` hoặc ảnh cuộn ghép đợt đầu để kết luận modal mất chức năng.
- Đã xem trực tiếp các screenshot quan trọng: attendance375/1366; employee history375; admin history375; stats375 và API500; notification375. Kết quả khác có số đo trong JSON và ghi nhận kiểm thử của root.
- Không gán lỗi tất cả bảng cuộn ngang thành page-wide overflow. Self history375 có table620 trong301 nhưng document375. Admin history375 document401 là hiện tượng riêng, cùng KPI4 cột giữ inline style.
- Không gọi target<44px là tự động vi phạm WCAG. Check hit area/label/exception trước đánh giá formal.

## 5. Kiểm tra build và hạn chế còn lại

Build frontend **PASS** (Vite6.4.3, 236 module), output riêng `.agnes/work/ui-audit/build`, không thay build trong source. Build có warning cú pháp CSS tại `header.css:115–128`: các declaration nằm ngoài selector sau khi `.app-header-user` đóng; ảnh hưởng cụ thể của phần CSS bị parser bỏ qua chưa được cô lập, nên chỉ là lỗi bảo trì/style mức LOW, không tự quy mọi vấn đề header cho warning này. Bundle main804,41kB gzip234,93kB; ExcelJS940,37kB gzip271,39kB. Đây là dung lượng build, chưa phải đo tốc độ tải/CPU/Core Web Vitals điện thoại.

Chưa kiểm chứng trên thiết bị thật: Safari/iOS camera/permissions/keyboard, Android back/keyboard, screen reader, zoom hệ điều hành, offline/reconnect đúng trình duyệt, dataset lớn/mạng chậm. Không sửa code để tạo test mirroring implementation. Không chạy mutation vào hệ thống thật. API/DB/permission nghiệp vụ được đánh giá riêng ở [Business Analysis](../modules/attendance/01-business-analysis.md).

## 6. Xác nhận nghiệp vụ ảnh hưởng UX

- **FACT từ người phụ trách:** lịch08–12/13–17, nghỉ trưa12–13,8 giờ/ngày; Manager chỉ nhân viên được phân công; HR/Admin toàn công ty; mỗi doanh nghiệp một hệ thống/database riêng.
- **NEEDS VALIDATION:** ngày làm trong tuần, tolerance đi trễ/về sớm, cách tính công nửa ngày/OT, số lượt punch và ngoại lệ camera, có bắt buộc duyệt mọi công hay chỉ ngoại lệ, lý do duy trì hai khu HR/Admin.
- Không ghi lại lịch làm hay mô hình tenant như câu hỏi chưa được trả lời; không tự thêm GPS/offline queue/lunch punches khi chưa có business reason được xác nhận.
