using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Serivces.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.AttendanceModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class AttendanceService : IAttendanceService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AttendanceService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<AttendanceResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            IQueryable<Attendance> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.PlannedShift)
                .Include(x => x.Approver)
                // Đồng bộ với ByEmployeeIdAsync: giờ vào/ra (CheckInTime/
                // CheckOutTime) được mapping từ AttendanceLogs, nếu thiếu
                // Include thì các trang dùng get-all (admin) hiện "— —".
                .Include(x => x.AttendanceLogs)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<Attendance> attendances = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            foreach (Attendance a in attendances)
                await EnrichAttendanceAsync(a);
            List<AttendanceResponseModelView> result = attendances
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<AttendanceResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<AttendanceResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            Attendance attendance = await repo.Entities
                .Where(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.PlannedShift)
                .Include(x => x.Approver)
                .Include(x => x.AttendanceLogs)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance not found");

            await EnrichAttendanceAsync(attendance);
            return attendance.ToViewModel();
        }

        public async Task<List<AttendanceResponseModelView>> ByEmployeeIdAsync(
            Guid employeeId)
        {
            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            List<Attendance> attendances = await repo.Entities
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.PlannedShift)
                .Include(x => x.Approver)
                .Include(x => x.AttendanceLogs)
                .OrderByDescending(x => x.AttendanceDate)
                .ToListAsync();

            foreach (Attendance a in attendances)
                await EnrichAttendanceAsync(a);
            return attendances.Select(x => x.ToViewModel()).ToList();
        }

        public async Task<CheckInAttendanceResponseModelView> CheckInAsync(
            CheckInAttendanceModelView model)
        {
            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            IGenericRepository<AttendanceLog> logRepo =
                _unitOfWork.GetRepository<AttendanceLog>();

            IGenericRepository<Employee> employeeRepo =
                _unitOfWork.GetRepository<Employee>();

            // Kiểm tra nhân viên
            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.EmployeeId &&
                    !x.DeletedTime.HasValue);

            if (!employeeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");
            }

            // Giờ log hiện tại (theo múi giờ máy chủ / VN)
            DateTime now = DateTime.UtcNow;
            DateTimeOffset logTime =
                DateTimeOffset.UtcNow;

            // Tìm bản ghi Attendance của HÔM NAY (tự tạo nếu chưa có)
            Attendance? attendance = await repo.Entities
                .Where(x =>
                    x.EmployeeId == model.EmployeeId &&
                    x.AttendanceDate.Date == now.Date &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.PlannedShift)
                .FirstOrDefaultAsync();

            bool createdToday = false;

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    EmployeeId = model.EmployeeId,
                    AttendanceDate = now.Date,
                    ApprovalStatus =
                        AttendanceApprovalStatus.Pending
                };

                attendance.CreatedBy =
                    _httpContextAccessor.HttpContext?.User?.Identity?.Name
                    ?? "System";
                attendance.CreatedTime = CoreHelper.SystemTimeNow;

                await repo.InsertAsync(attendance);
                createdToday = true;
            }

            // Kiểm tra log trùng (chấm lại cùng loại trong 2 phút -> giữ nguyên)
            bool alreadyRecorded = await logRepo.Entities
                .AnyAsync(x =>
                    x.AttendanceId == attendance.Id &&
                    x.Type == model.Type &&
                    x.LogTime >= logTime.AddMinutes(-2) &&
                    !x.DeletedTime.HasValue);

            if (alreadyRecorded)
            {
            await EnrichAttendanceAsync(attendance);
                return new CheckInAttendanceResponseModelView
                {
                    AlreadyRecorded = true,
                    Message = "Đã có lần chấm cùng loại gần đây. "
                        + "Không cần bấm lại.",
                    Attendance = attendance.ToViewModel()
                };
            }

            // Thêm log chấm công
            AttendanceLog log = new AttendanceLog
            {
                AttendanceId = attendance.Id,
                LogTime = logTime,
                Type = model.Type,
                Method = model.Method,
                PhotoUrl = model.PhotoUrl,
                Note = model.Note
            };

            log.CreatedBy =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";
            log.CreatedTime = CoreHelper.SystemTimeNow;

            await logRepo.InsertAsync(log);

            // Đồng bộ ảnh lên Attendance (log vào -> CheckInPhoto, ra -> CheckOutPhoto)
            if (!string.IsNullOrWhiteSpace(model.PhotoUrl))
            {
                if (model.Type == AttendanceLogType.CheckIn)
                    attendance.CheckInPhoto = model.PhotoUrl;
                else
                    attendance.CheckOutPhoto = model.PhotoUrl;
            }

            // Tự đánh trạng thái: có cặp vào/ra -> tính ActualHours;
            // chưa về -> Present
            List<AttendanceLog> logs = await logRepo.Entities
                .Where(x =>
                    x.AttendanceId == attendance.Id &&
                    !x.DeletedTime.HasValue)
                .ToListAsync();

            DateTime? checkIn = logs
                .Where(x => x.Type == AttendanceLogType.CheckIn)
                .Select(x => (DateTime?)x.LogTime.UtcDateTime)
                .Min();

            DateTime? checkOut = logs
                .Where(x => x.Type == AttendanceLogType.CheckOut)
                .Select(x => (DateTime?)x.LogTime.UtcDateTime)
                .Max();

            if (checkIn.HasValue && checkOut.HasValue)
            {
                // Tinh "Gio thuc" (net: da tru gio nghi trua theo AttendanceRule)
                // va "Tang ca" (phan vuot moc ra ca chuan) NGAY khi cham,
                // khong phai choi du HR dieu chinh.
                IGenericRepository<AttendanceRule> ruleRepo =
                    _unitOfWork.GetRepository<AttendanceRule>();
                AttendanceRule? activeRule = await ruleRepo.Entities
                    .Where(r => r.IsActive && !r.DeletedTime.HasValue)
                    .OrderByDescending(r => r.CreatedTime)
                    .FirstOrDefaultAsync();

                var ciUtc = new DateTimeOffset(checkIn.Value, TimeSpan.Zero);
                var coUtc = new DateTimeOffset(checkOut.Value, TimeSpan.Zero);
                var (netHours, otHours) =
                    AttendanceTimeCalculator.Compute(ciUtc, coUtc, activeRule?.BreakMinutes, activeRule?.CheckOutTime);

                attendance.ActualHours = netHours;
                attendance.OvertimeHours = otHours;
            }

            // Tự đánh trạng thái Đúng giờ / Trễ giờ theo giờ VN (UTC+7):
            // so giờ vào ca với giờ bắt đầu ca (ca gán nếu có, nếu không dùng ca hành chính).
            if (checkIn.HasValue)
            {
                DateTime checkInVn = checkIn.Value.AddHours(7);
                TimeOnly checkInVnTime =
                    new TimeOnly(checkInVn.Hour, checkInVn.Minute, checkInVn.Second);

                TimeOnly shiftStart = attendance.PlannedShift != null
                    ? attendance.PlannedShift.StartTime
                    : AttendanceStatusEvaluator.AdminShift().Start;

                if (attendance.Status == null)
                {
                    attendance.Status =
                        checkInVnTime > shiftStart
                            ? AttendanceStatus.Late
                            : AttendanceStatus.Present;
                }
            }

            if (!createdToday)
            {
                attendance.LastUpdatedBy = await ResolveEmployeeNameAsync(
                    _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System");
                attendance.LastUpdatedTime = CoreHelper.SystemTimeNow;
            // Tinh lai "Gio thuc" (net) + "Tang ca" theo AttendanceRule
            // sau khi nhap/doi gio vao-ra ca (HR chiu chinh sua).
            await EnrichAttendanceAsync(attendance);
                await repo.UpdateAsync(attendance);
            }

            await _unitOfWork.SaveAsync();

            // Trả về bản ghi mới nhất (nạp lại các điều hướng)
            Attendance refreshed = await repo.Entities
                .Where(x => x.Id == attendance.Id)
                .Include(x => x.Employee)
                .Include(x => x.PlannedShift)
                .Include(x => x.Approver)
                .Include(x => x.AttendanceLogs)
                .FirstAsync();

            await EnrichAttendanceAsync(refreshed);
            return new CheckInAttendanceResponseModelView
            {
                AlreadyRecorded = false,
                Message = model.Type == AttendanceLogType.CheckIn
                    ? "Đã ghi nhận VÀO CA."
                    : "Đã ghi nhận RA CA.",
                Attendance = refreshed.ToViewModel()
            };
        }

        public async Task CreateAsync(CreateAttendanceModelView model)
        {
            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            // Kiểm tra Employee
            IGenericRepository<Employee> employeeRepo =
                _unitOfWork.GetRepository<Employee>();

            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.EmployeeId &&
                    !x.DeletedTime.HasValue);

            if (!employeeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");
            }

            // Kiểm tra Attendance đã tồn tại trong ngày
            bool attendanceExists = await repo.Entities
                .AnyAsync(x =>
                    x.EmployeeId == model.EmployeeId &&
                    x.AttendanceDate.Date == model.AttendanceDate.Date &&
                    !x.DeletedTime.HasValue);

            if (attendanceExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Attendance already exists for this employee on this date");
            }

            // Kiểm tra PlannedShift (nếu có)
            if (model.PlannedShiftId.HasValue)
            {
                IGenericRepository<Shift> shiftRepo =
                    _unitOfWork.GetRepository<Shift>();

                bool shiftExists = await shiftRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.PlannedShiftId.Value &&
                        !x.DeletedTime.HasValue);

                if (!shiftExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Planned shift not found");
                }
            }

            // Kiểm tra Status
            if (model.Status.HasValue &&
                !Enum.IsDefined(typeof(AttendanceStatus), model.Status.Value))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Invalid attendance status");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            Attendance attendance = model.ToEntity();

            attendance.CreatedBy = currentUser;
            attendance.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(attendance);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateAttendanceModelView model)
        {
            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            Attendance attendance = await repo.Entities
                .Include(x => x.AttendanceLogs)
                .Include(x => x.Approver)
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance not found");

            if (attendance.ApprovalStatus == AttendanceApprovalStatus.Approved)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "ATTENDANCE_APPROVED",
                    "Không thể chỉnh sửa bản ghi chấm công đã được duyệt");
            }

            // Kiểm tra Employee
            IGenericRepository<Employee> employeeRepo =
                _unitOfWork.GetRepository<Employee>();

            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.EmployeeId &&
                    !x.DeletedTime.HasValue);

            if (!employeeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");
            }

            // Kiểm tra Attendance trùng
            bool attendanceExists = await repo.Entities
                .AnyAsync(x =>
                    x.Id != model.Id &&
                    x.EmployeeId == model.EmployeeId &&
                    x.AttendanceDate.Date == model.AttendanceDate.Date &&
                    !x.DeletedTime.HasValue);

            if (attendanceExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Attendance already exists for this employee on this date");
            }

            // Kiểm tra Status
            if (model.Status.HasValue &&
                !Enum.IsDefined(typeof(AttendanceStatus), model.Status.Value))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Invalid attendance status");
            }

            if ((model.ApprovalStatus == AttendanceApprovalStatus.Approved ||
                 model.ApprovalStatus == AttendanceApprovalStatus.Rejected) &&
                !model.Status.HasValue)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "ATTENDANCE_STATUS_REQUIRED",
                    "Phải chọn trạng thái chấm công trước khi duyệt hoặc từ chối.");
            }


            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            // ===== AUDIT: ghi lai noi dung da sua =====
            var oldCheckIn = GetLogCheckInTime(attendance);
            var oldCheckOut = GetLogCheckOutTime(attendance);
            var oldStatus = attendance.Status;
            var oldActualHours = attendance.ActualHours;
            var oldNote = attendance.Note;

            model.ToEntity(attendance);

            // Neu doi approvalStatus qua form sua, set ApprovedBy (Guid) + Approver.
            if ((attendance.ApprovalStatus == AttendanceApprovalStatus.Approved ||
                 attendance.ApprovalStatus == AttendanceApprovalStatus.Rejected) &&
                attendance.ApprovedBy == null)
            {
                IGenericRepository<Employee> empRepoForApprover = _unitOfWork.GetRepository<Employee>();
                var approver = await empRepoForApprover.Entities
                    .FirstOrDefaultAsync(x => !x.DeletedTime.HasValue &&
                        (x.PhoneNumber == currentUser || x.EmployeeCode == currentUser || x.Email == currentUser));
                if (approver != null)
                {
                    attendance.ApprovedBy = approver.Id;
                    attendance.Approver = approver;
                }
                attendance.ApprovedAt = DateTime.UtcNow;
            }

            // Tinh diff va luu vao ChangeSummary
            var changes = new List<string>();
            string oldInStr = FormatTime(oldCheckIn);
            string newInStr = FormatTime(attendance.CheckInTime);
            string oldOutStr = FormatTime(oldCheckOut);
            string newOutStr = FormatTime(attendance.CheckOutTime);
            if (oldInStr != newInStr)
                changes.Add($"Đã sửa vào ca ({oldInStr} -> {newInStr})");
            if (oldOutStr != newOutStr)
                changes.Add($"Đã sửa ra ca ({oldOutStr} -> {newOutStr})");
            if (oldStatus != attendance.Status)
                changes.Add($"Đã sửa trạng thái ({oldStatus?.ToString() ?? "chưa có"} -> {attendance.Status?.ToString() ?? "chưa có"})");
            if (oldActualHours != attendance.ActualHours)
                changes.Add($"Đã sửa giờ thực tế ({oldActualHours?.ToString() ?? "chưa có"} -> {attendance.ActualHours?.ToString() ?? "chưa có"})");
            if (oldNote != attendance.Note)
                changes.Add("Đã sửa ghi chú");

            attendance.ChangeSummary =
                changes.Count > 0 ? string.Join("; ", changes) : null;

            attendance.LastUpdatedBy = await ResolveEmployeeNameAsync(currentUser);
            attendance.LastUpdatedTime = CoreHelper.SystemTimeNow;

            // Tinh lai "Gio thuc" (net) + "Tang ca" theo AttendanceRule
            // sau khi nhap/doi gio vao-ra ca (HR chiu chinh sua).
            await EnrichAttendanceAsync(attendance);
            await repo.UpdateAsync(attendance);
            await _unitOfWork.SaveAsync();
        }


        // Resolve ten dang ki (Ho ten) tu username/phone
        // =========================================================
        // Enrich: tinh "Gio thuc" (net) + "Tang ca" theo AttendanceRule
        // truoc khi map ve view model -> du lieu hien thi NGAY, khong choi du HR.
        // =========================================================
        private async Task EnrichAttendanceAsync(Attendance attendance)
        {
            if (attendance == null) return;

            IGenericRepository<AttendanceRule> ruleRepo =
                _unitOfWork.GetRepository<AttendanceRule>();
            AttendanceRule? activeRule = await ruleRepo.Entities
                .Where(r => r.IsActive && !r.DeletedTime.HasValue)
                .OrderByDescending(r => r.CreatedTime)
                .FirstOrDefaultAsync();

            AttendanceTimeCalculator.Enrich(attendance, activeRule);
        }

        private async Task<string> ResolveEmployeeNameAsync(string username)
        {
            if (string.IsNullOrEmpty(username) || username == "System") return username;
            try
            {
                IGenericRepository<Employee> empRepo =
                    _unitOfWork.GetRepository<Employee>();
                var emp = await empRepo.Entities
                    .FirstOrDefaultAsync(x => !x.DeletedTime.HasValue &&
                        (x.PhoneNumber == username || x.EmployeeCode == username || x.Email == username));
                return emp?.FullName ?? username;
            }
            catch { return username; }
        }
        // Helper: lay gio goc tu log (nguyen ban, khong phai override)
        private DateTimeOffset? GetLogCheckInTime(Attendance a) =>
            a.AttendanceLogs?
                .Where(x => x.Type == AttendanceLogType.CheckIn)
                .Select(x => x.LogTime)
                .Cast<DateTimeOffset?>()
                .Min();

        private DateTimeOffset? GetLogCheckOutTime(Attendance a) =>
            a.AttendanceLogs?
                .Where(x => x.Type == AttendanceLogType.CheckOut)
                .Select(x => x.LogTime)
                .Cast<DateTimeOffset?>()
                .Max();

        // Helper: format gio VN (HH:mm)
        private static string FormatTime(DateTimeOffset? t) =>
            t.HasValue
                ? t.Value.ToOffset(TimeSpan.FromHours(7)).ToString("HH:mm")
                : "chưa có";

        public async Task ApproveAsync(ApproveAttendanceModelView model)
        {
            if (!model.Status.HasValue ||
                !Enum.IsDefined(typeof(AttendanceStatus), model.Status.Value))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "ATTENDANCE_STATUS_REQUIRED",
                    "Phải chọn trạng thái chấm công trước khi duyệt hoặc từ chối.");
            }

            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            Attendance attendance = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance not found");

            // Kiểm tra người phê duyệt tồn tại
            IGenericRepository<Employee> employeeRepo =
                _unitOfWork.GetRepository<Employee>();

            bool approverExists = await employeeRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.ApprovedBy &&
                    !x.DeletedTime.HasValue);

            if (!approverExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Approver not found");
            }

            attendance.ApprovalStatus = model.ApprovalStatus;
            attendance.Status = model.Status;
            attendance.ApprovedBy = model.ApprovedBy;
            attendance.ApprovedAt =
                model.ApprovalStatus == AttendanceApprovalStatus.Pending
                    ? null
                    : DateTime.UtcNow;

            if (model.Note != null)
            {
                attendance.Note = model.Note;
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            attendance.LastUpdatedBy = await ResolveEmployeeNameAsync(currentUser);
            attendance.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(attendance);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            Attendance attendance = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            attendance.DeletedBy = currentUser;
            attendance.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(attendance);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<Attendance> repo =
                _unitOfWork.GetRepository<Attendance>();

            Attendance attendance = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance not found");

            await repo.DeleteAsync(attendance);
            await _unitOfWork.SaveAsync();
        }
    }
}
