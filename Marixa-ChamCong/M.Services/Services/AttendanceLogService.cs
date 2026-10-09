using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Serivces.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.AttendanceLogModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class AttendanceLogService : IAttendanceLogService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AttendanceLogService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<AttendanceLogResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<AttendanceLog> repo =
                _unitOfWork.GetRepository<AttendanceLog>();

            IQueryable<AttendanceLog> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .Include(x => x.Attendance)
                .ThenInclude(a => a.Employee)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<AttendanceLog> attendanceLogs = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<AttendanceLogResponseModelView> result = attendanceLogs
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<AttendanceLogResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<AttendanceLogResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<AttendanceLog> repo =
                _unitOfWork.GetRepository<AttendanceLog>();

            AttendanceLog attendanceLog = await repo.Entities
                .Where(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Attendance)
                .ThenInclude(a => a.Employee)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance log not found");

            return attendanceLog.ToViewModel();
        }

        public async Task CreateAsync(CreateAttendanceLogModelView model)
        {
            IGenericRepository<AttendanceLog> repo =
                _unitOfWork.GetRepository<AttendanceLog>();

            // Kiểm tra Attendance
            IGenericRepository<Attendance> attendanceRepo =
                _unitOfWork.GetRepository<Attendance>();

            bool attendanceExists = await attendanceRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.AttendanceId &&
                    !x.DeletedTime.HasValue);

            if (!attendanceExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance not found");
            }

            // Kiểm tra Type
            if (!Enum.IsDefined(typeof(AttendanceLogType), model.Type))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Invalid attendance log type");
            }

            // Kiểm tra Method
            if (!Enum.IsDefined(typeof(AttendanceMethod), model.Method))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Invalid attendance method");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            AttendanceLog attendanceLog = model.ToEntity();

            attendanceLog.CreatedBy = currentUser;
            attendanceLog.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(attendanceLog);

            // Đồng bộ ảnh + giờ thực tế lên bản ghi Attendance cha
            await SyncAttendanceFromLogAsync(
                model.AttendanceId,
                model.PhotoUrl,
                model.Type);

            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateAttendanceLogModelView model)
        {
            IGenericRepository<AttendanceLog> repo =
                _unitOfWork.GetRepository<AttendanceLog>();

            AttendanceLog attendanceLog = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance log not found");

            // Kiểm tra Attendance
            IGenericRepository<Attendance> attendanceRepo =
                _unitOfWork.GetRepository<Attendance>();

            bool attendanceExists = await attendanceRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.AttendanceId &&
                    !x.DeletedTime.HasValue);

            if (!attendanceExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance not found");
            }

            // Kiểm tra Type
            if (!Enum.IsDefined(typeof(AttendanceLogType), model.Type))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Invalid attendance log type");
            }

            // Kiểm tra Method
            if (!Enum.IsDefined(typeof(AttendanceMethod), model.Method))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Invalid attendance method");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(attendanceLog);

            attendanceLog.LastUpdatedBy = currentUser;
            attendanceLog.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(attendanceLog);

            // Đồng bộ ảnh + giờ thực tế lên bản ghi Attendance cha
            await SyncAttendanceFromLogAsync(
                model.AttendanceId,
                model.PhotoUrl,
                model.Type);

            await _unitOfWork.SaveAsync();
        }

        public async Task AdjustAsync(AdjustAttendanceLogModelView model)
        {
            IGenericRepository<AttendanceLog> repo =
                _unitOfWork.GetRepository<AttendanceLog>();

            AttendanceLog attendanceLog = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance log not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            // Xử lý ngoại lệ / điều chỉnh
            attendanceLog.IsAdjusted = true;
            attendanceLog.AdjustedBy = currentUser;
            attendanceLog.AdjustedAt = CoreHelper.SystemTimeNow;
            attendanceLog.AdjustmentNote = model.AdjustedNote;

            if (!string.IsNullOrWhiteSpace(model.PhotoUrl))
                attendanceLog.PhotoUrl = model.PhotoUrl;

            if (model.Latitude.HasValue)
                attendanceLog.Latitude = model.Latitude;

            if (model.Longitude.HasValue)
                attendanceLog.Longitude = model.Longitude;

            if (!string.IsNullOrWhiteSpace(model.Note))
                attendanceLog.Note = model.Note;

            attendanceLog.LastUpdatedBy = currentUser;
            attendanceLog.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(attendanceLog);

            // Tái tính giờ thực tế sau khi điều chỉnh
            await RecalculateActualHoursAsync(attendanceLog.AttendanceId);

            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<AttendanceLog> repo =
                _unitOfWork.GetRepository<AttendanceLog>();

            AttendanceLog attendanceLog = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance log not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            attendanceLog.DeletedBy = currentUser;
            attendanceLog.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(attendanceLog);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<AttendanceLog> repo =
                _unitOfWork.GetRepository<AttendanceLog>();

            AttendanceLog attendanceLog = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance log not found");

            await repo.DeleteAsync(attendanceLog);
            await _unitOfWork.SaveAsync();
        }

        // =========================================================
        // Đồng bộ ảnh + giờ thực tế từ log lên Attendance cha
        // =========================================================
        private async Task SyncAttendanceFromLogAsync(
            Guid attendanceId,
            string? photoUrl,
            AttendanceLogType type)
        {
            if (string.IsNullOrWhiteSpace(photoUrl))
            {
                await RecalculateActualHoursAsync(attendanceId);
                return;
            }

            IGenericRepository<Attendance> attendanceRepo =
                _unitOfWork.GetRepository<Attendance>();

            Attendance? attendance = await attendanceRepo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == attendanceId &&
                    !x.DeletedTime.HasValue);

            if (attendance == null)
                return;

            // Gán ảnh theo loại log (vào / ra)
            if (type == AttendanceLogType.CheckIn)
                attendance.CheckInPhoto = photoUrl;
            else
                attendance.CheckOutPhoto = photoUrl;

            await RecalculateActualHoursAsync(attendanceId);
        }

        // =========================================================
        // Tính giờ thực tế (ActualHours) từ cặp log vào/ra
        // =========================================================
        private async Task RecalculateActualHoursAsync(Guid attendanceId)
        {
            IGenericRepository<AttendanceLog> logRepo =
                _unitOfWork.GetRepository<AttendanceLog>();

            List<AttendanceLog> logs = await logRepo.Entities
                .Where(x =>
                    x.AttendanceId == attendanceId &&
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

            IGenericRepository<Attendance> attendanceRepo =
                _unitOfWork.GetRepository<Attendance>();

            Attendance? attendance = await attendanceRepo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == attendanceId &&
                    !x.DeletedTime.HasValue);

            if (attendance == null)
                return;

            // Chỉ tính được giờ thực tế khi có đủ cặp vào - ra
            attendance.ActualHours =
                checkIn.HasValue && checkOut.HasValue
                    ? (int)Math.Round((checkOut.Value - checkIn.Value).TotalHours)
                    : null;
        }
    }
}
