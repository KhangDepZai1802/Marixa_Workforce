# Attendance review — evidence inventory

Ngày: 2026-10-08. Chủ đề: source audit, không chạy backend/migration hoặc ghi dữ liệu thật.

## Kế hoạch đọc và đối chiếu

- [x] Đọc Business Analyst SKILL.md và các reference spec-principles, tc-format, sdd-artifact-contract. Áp dụng quy tắc evidence; không nhập nghiệp vụ EasyPlatform.
- [x] Trace entry point → Attendance controller/service/model/mapping.
- [x] Trace raw log, rules, employee, shift, assignment, leave, holiday, payroll.
- [x] Đối chiếu schema/migrations/permission/validation/jobs/tests/docs.
- [x] Đối chiếu frontend gọi API và trạng thái người dùng (kết hợp kết quả frontend review).
- [x] Hoàn tất báo cáo 13 phần; kiểm tra lại ví dụ tái hiện và source citations.

## File-read inventory

Ghi theo nhóm đọc; số dòng trong báo cáo trỏ bản source tại thời điểm audit. Source đọc tĩnh không chứng minh hành vi database đã triển khai.

| Nhóm | File đã đọc | Phạm vi |
| --- | --- | --- |
| Skill | `.agents/skills/business-analyst/SKILL.md` | Toàn bộ 701 dòng; đọc lại từng đoạn 1–240,241–480,481–701 để khép phần output ban đầu quá dài |
| Skill references | `references/spec-principles.md` (62), `tc-format.md` (319), `sdd-artifact-contract.md` (588) trong thư mục BA | Đã đọc toàn bộ; sdd chia 1–140,141–220,221–300,301–450,451–588; tc đầu/tail đọc chồng để không bỏ phần bị output truncate. Chỉ áp dụng nguyên tắc evidence, không nhận nghiệp vụ upstream |
| Task context | `docs/audit-worklog.md` | Toàn bộ; parent quản lý task plan và cài skill |
| Controller chính | `M.API/Controllers/AttendanceController.cs`, `AttendanceLogController.cs`, `UploadController.cs` | Toàn bộ; entry/auth/operation/request-response |
| Service chính | `M.Services/Services/AttendanceService.cs` (645), `AttendanceLogService.cs` (371), `AttendanceRuleService.cs` (160), `AttendanceStatusEvaluator.cs` (17) | Toàn bộ bằng các đoạn nhỏ |
| Dependency services | `EmployeeShiftService.cs`, `ShiftService.cs`, `HolidayCalendarService.cs`, `LeaveRequestService.cs`, `PayrollService.cs` trong `M.Services/Services` | Toàn bộ; không chạy service |
| Entity/domain | `Attendance.cs`, `AttendanceLog.cs`, `AttendanceRule.cs`, `Shift.cs`, `EmployeeShift.cs`, `HolidayCalendar.cs`, `LeaveRequest.cs`, `Payroll.cs` trong `M.Contract.Repositories/Entities`; `M.Core/Base/BaseEntity.cs` | Toàn bộ; Employee.cs đọc các field UserId/ManagerId/StartDate/Status/UsePhoneAttendance và quan hệ DB |
| DTO/validation | `M.ModelViews/AttendanceModelView.cs`, `AttendanceLogModelView.cs`, `ShiftModelView.cs`, `EmployeeShiftModelView.cs`, `AttendanceRuleModelView.cs` | Toàn bộ; các annotation và kiểu nullable/enum |
| Mapping | `M.Services/Mapping/AttendanceMapping.cs`, `AttendanceLogMapping.cs`, `LeaveRequestMapping.cs`, `PayrollMapping.cs` | Toàn bộ; các mapping rule/shift dùng search consumer chính xác |
| Persistence | `M.Repositories/UOW/GenericRepository.cs`, `UnitOfWork.cs`, `M.Repositories/Context/DatabaseContext.cs` | Toàn bộ; xác nhận AddAsync không Save, query DbSet, SaveChanges, không global soft-delete filter |
| Schema/migration | `DatabaseContextModelSnapshot.cs` Attendance/AttendanceLog sections 25–177, các relation/index liên quan; `20261007062006_AddAttendanceCheckInTimes.cs` | Snapshot đọc đoạn liên quan; migration bổ sung đọc toàn bộ; initialCreate tìm kiếm các bảng/index/FK Attendance; không apply |
| Dependency permission | `M.API/Controllers/EmployeeShiftController.cs`, `ShiftController.cs`, `HolidayCalendarController.cs`, `AttendanceRuleController.cs`, `LeaveRequestController.cs`, `PayrollController.cs` | Đọc các attribute route/http/authorize và đối chiếu service; không khẳng định đọc toàn body của controller ngoài phạm vi |
| Frontend self flow | `ChamCong/src/modules/attendance/pages/AttendancePage.jsx`, `api/relatedApi.js`, `components/AttendanceCard.jsx`, `CameraCapture.jsx` | Toàn bộ; CameraCapture source thực chất151 dòng, lệnh đọc tới165 cho dòng rỗng sau EOF |
| Frontend stats | `ChamCong/src/modules/statistics/components/statUtils.js`, `pages/StatisticsPage.jsx:38–76`, `components/StatCalendar.jsx` grid/weekday render | statUtils toàn bộ; các source khác đọc đoạn thực thi + search liên quan |
| Frontend management | `ChamCong/src/modules/employees/attendance/api/employeeAttendanceApi.js`, `pages/EmployeeWorkSchedulePage.jsx`, `pages/EmployeeStatisticsPage.jsx:1–175`; `components/AttendanceFormModal.jsx:1–121` + input render search | API/schedule toàn bộ; stats/modal đoạn xử lý và UI inputs được trace |
| Frontend management continued | `pages/EmployeeAttendanceHistoryPage.jsx` filter/calendar/load/approve/export/submit/approval render; `ChamCong/src/modules/admin/attendance/pages/AdminAttendanceHistoryPage.jsx:100–181` | Đọc nhánh mutation/approval; frontend agent bổ sung route/full UI; root kiểm lại payload mất field |
| Roles/frontend routing | `ChamCong/src/services/auth/permission.js`, `constants/modules.js`; `App.jsx` route được frontend agent/root đọc và đối chiếu | permission/modules toàn bộ; App reviewed trong wave frontend |
| Docs/tests/jobs | `ChamCong/README.md`, `ChamCong/package.json`, `M.BE.sln`; dependency registrations search | Không tìm thấy test project/script/test artifact hoặc Attendance job trong phạm vi tìm bên dưới. Không suy ra công ty chưa test thủ công |

Auth/startup/photo storage/shared UI được parent review; kết quả runtime layout được ghi ở [UI evidence](../../ui-ux/evidence/README.md). Báo cáo BA không trình bày các probe UI dữ liệu giả thành E2E production.

## Chuẩn tọa độ và lỗi kiểm chứng đã sửa

`EmployeeAttendanceHistoryPage.jsx` có CRCRLF: PowerShell Get-Content đếm thành921, trong khi LF/rg là461. Đã thay mọi citation của file này bằng số dòng LF (approve151, export158, submit181, create216, approval367). Không normalize/sửa file source. Quy tắc đọc cuối: `Path(path).read_bytes().decode('utf-8-sig').split('\n')` và strip CR khi in; dùng `rg -n` để cross-check. Bài học kiểm chứng: kiểm line-ending trước khi xuất citation; kiểm caller thực tế trước khi suy endpoint từ tên wrapper. Nhánh admin approve cũng mở modal/update, không gọi wrapper approve như nhận định sơ bộ; báo cáo đã sửa theo source.

## Lệnh khảo sát absence/consumer

Chạy từ workspace root. Exit1 của search không có match được hiểu là không tìm thấy trong phạm vi đó, không phải chứng minh tuyệt đối không tồn tại trong hệ thống bên ngoài.

```powershell
rg --files -g '*[Tt]est*' -g '*[Ss]pec*' -g '*.md' -g '*.sln' -g '*.csproj' -g '!node_modules/**' -g '!**/obj/**' -g '!**/bin/**' -g '!ChamCong/node_modules/**' -g '!docs/**'
rg -n 'BackgroundService|IHostedService|AddHostedService|Hangfire|Quartz|IRequestHandler|EventHandler' M.API M.Services M.Contract.Serivces -g '*.cs' -g '!**/obj/**' -g '!**/bin/**'
rg -n 'AttendanceRule|LateGraceMinutes|BreakMinutes|GpsRequired|PhotoRequired|IsNight|WorkDays' M.Services M.API -g '*.cs' -g '!**/obj/**' -g '!**/bin/**'
rg -n 'Authorize|Http(Get|Post|Put|Delete)' M.API/Controllers/EmployeeShiftController.cs M.API/Controllers/ShiftController.cs M.API/Controllers/HolidayCalendarController.cs M.API/Controllers/AttendanceRuleController.cs M.API/Controllers/LeaveRequestController.cs M.API/Controllers/PayrollController.cs
```

Kết quả: solution có production projects; package frontend không test script; search job patterns không match; rule fields chỉ xuất hiện CRUD/mapping/registration, không consumer tính công trong AttendanceService. Đã mở source chính để xác nhận thay vì kết luận chỉ bằng không match.

## Probe nghiệp vụ thuần JavaScript — 08/10/2026

Không tạo request HTTP, không ghi database, không thay source. Chạy `node --input-type=module` qua stdin từ workspace root bằng PowerShell here-string. Toàn bộ input là fixture giả. Mẫu8h là control để xác nhận hàm không luôn trả OT.

```javascript
import { computeStats, buildCalendar, dayStatusOf }
  from './ChamCong/src/modules/statistics/components/statUtils.js';
const row=(d,out='09:00')=>({attendanceDate:d,
  checkInTime:d+'T01:00:00Z',checkOutTime:d+'T'+out+':00Z',
  status:1,approvalStatus:1});
const standard=computeStats([row('2026-10-08','10:00')],[],[],{},{y:2026,m:9});
const ordinary=computeStats([row('2026-10-08')],[],[],{},{y:2026,m:9});
const rows=[{...row('2026-10-06'),approvalStatus:2},
  {...row('2026-10-10'),approvalStatus:2}];
const holidayMap={'2026-10-06':2,'2026-10-10':3};
const holiday=computeStats(rows,[],[],holidayMap,{y:2026,m:9});
const cal=buildCalendar({y:2026,m:9},()=> 'nodata');
console.log(JSON.stringify({
  lunchPolicy:{hoursWorked:standard.hoursWorked/60,otWeekday:standard.otWeekday/60},
  control8Hours:{hoursWorked:ordinary.hoursWorked/60,otWeekday:ordinary.otWeekday/60},
  holiday:{otWeekday:holiday.otWeekday,otWeekend:holiday.otWeekend,
    otHoliday:holiday.otHoliday,daysWorked:holiday.daysWorked,hoursWorked:holiday.hoursWorked,
    dayStatus:dayStatusOf(new Date(2026,9,6),{
      byDate:{'2026-10-06':rows[0]},holidayMap,stats:holiday,todayKey:'2026-10-08'})},
  calendar:{firstDay:cal[0][0].date.getDate(),actualWeekday:cal[0][0].date.getDay(),position:0},
  statusWithTwoHours:dayStatusOf(new Date(2026,9,8),{
    byDate:{'2026-10-08':row('2026-10-08','03:00')},holidayMap:{},stats:ordinary,todayKey:'2026-10-08'})
},null,2));
```

Đã đọc kết quả thực tế:

```json
{
  "lunchPolicy": {"hoursWorked": 9, "otWeekday": 1},
  "control8Hours": {"hoursWorked": 8, "otWeekday": 0},
  "holiday": {
    "otWeekday": 0, "otWeekend": 0, "otHoliday": 480,
    "daysWorked": 2, "hoursWorked": 960, "dayStatus": "rest"
  },
  "calendar": {"firstDay": 1, "actualWeekday": 4, "position": 0},
  "statusWithTwoHours": "full"
}
```

Diễn giải: ngày chuẩn 08–17 có 1h nghỉ nhưng được tính 9h và 1h OT; MakeUpWork trở thành OT lễ; PublicHoliday có công vẫn rest; Rejected vẫn tính; 01/10/2026 thứ Năm bị đưa vào vị trí đầu lưới T2; chỉ 2h có đủ cặp được gọi full. Đây là kiểm hàm hiện hành, không xác nhận phần tính lương hay chính sách OT được trả.

## Xác nhận nghiệp vụ trong hội thoại

- Người dùng: hiện dùng cho doanh nghiệp mình; sau này mỗi doanh nghiệp một hệ thống/database riêng.
- Người dùng: 08:00–12:00, 13:00–17:00; nghỉ trưa 12:00–13:00; một ngày chuẩn 8h.
- Người dùng: HR/Admin toàn công ty, Manager chỉ người phụ trách.
- Chưa xác nhận số lượt chấm trưa, tự duyệt, grace/rounding, workdays, khóa kỳ/payroll scope. Báo cáo không điền các khoảng trống này bằng suy đoán.

## Giới hạn

- Không có bộ yêu cầu nghiệp vụ đã được chủ nghiệp vụ duyệt được cung cấp.
- Không xác nhận chính sách doanh nghiệp bằng việc implementation đang thực hiện nó.
- Không thực thi tác vụ sửa công, duyệt đơn, tạo bảng lương hoặc cập nhật schema.
