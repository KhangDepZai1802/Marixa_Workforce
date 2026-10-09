using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.OvertimeRequestModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class OvertimeRequestService : IOvertimeRequestService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public OvertimeRequestService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<OvertimeRequestResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            IGenericRepository<OvertimeRequest> repo = _unitOfWork.GetRepository<OvertimeRequest>();

            IQueryable<OvertimeRequest> query = repo.Entities
                .Include(x => x.Employee)
                .Include(x => x.Approver)
                .Where(x => !x.DeletedTime.HasValue)
                .OrderByDescending(x => x.WorkDate);

            int totalItems = await query.CountAsync();
            List<OvertimeRequest> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new BasePaginatedList<OvertimeRequestResponseModelView>(
                items.Select(x => x.ToViewModel()).ToList().AsReadOnly(),
                totalItems, pageNumber, pageSize);
        }

        public async Task<OvertimeRequestResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<OvertimeRequest> repo = _unitOfWork.GetRepository<OvertimeRequest>();
            OvertimeRequest entity = await repo.Entities
                .Include(x => x.Employee)
                .Include(x => x.Approver)
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Overtime request not found");

            return entity.ToViewModel();
        }

        public async Task<List<OvertimeRequestResponseModelView>> ByEmployeeIdAsync(Guid employeeId)
        {
            IGenericRepository<OvertimeRequest> repo = _unitOfWork.GetRepository<OvertimeRequest>();
            List<OvertimeRequest> entities = await repo.Entities
                .Include(x => x.Employee)
                .Include(x => x.Approver)
                .Where(x => x.EmployeeId == employeeId && !x.DeletedTime.HasValue)
                .OrderByDescending(x => x.WorkDate)
                .ToListAsync();

            return entities.Select(x => x.ToViewModel()).ToList();
        }

        public async Task CreateAsync(CreateOvertimeRequestModelView model)
        {
            IGenericRepository<OvertimeRequest> repo = _unitOfWork.GetRepository<OvertimeRequest>();

            // 1) Nhân viên tồn tại
            IGenericRepository<Employee> employeeRepo = _unitOfWork.GetRepository<Employee>();
            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x => x.Id == model.EmployeeId && !x.DeletedTime.HasValue);
            if (!employeeExists)
                throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Employee not found");

            // 2) Bản ghi chấm công (nếu có) phải hợp lệ
            if (model.AttendanceId is Guid attId && attId != Guid.Empty)
            {
                IGenericRepository<Attendance> attRepo = _unitOfWork.GetRepository<Attendance>();
                bool attExists = await attRepo.Entities
                    .AnyAsync(x => x.Id == attId && !x.DeletedTime.HasValue);
                if (!attExists)
                    throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_INPUT",
                        "Attendance record not found");
            }

            // 3) Ngăn trùng: chỉ cho một yêu cầu Tăng ca đang Chờ duyệt trên cùng ngày + nhân viên
            bool duplicate = await repo.Entities.AnyAsync(x =>
                x.EmployeeId == model.EmployeeId &&
                x.WorkDate.Date == model.WorkDate.Date &&
                x.Status == OvertimeStatus.Pending &&
                !x.DeletedTime.HasValue);
            if (duplicate)
                throw new ErrorException(StatusCodes.Status400BadRequest, "DUPLICATE",
                    "Employee already has a pending overtime request for this date");

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            OvertimeRequest entity = model.ToEntity();
            entity.OvertimeHours = entity.OvertimeHours
                ?? CalcHoursFromRange(entity.StartAt, entity.EndAt);
            entity.CreatedBy = currentUser;
            entity.LastUpdatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateOvertimeRequestModelView model)
        {
            IGenericRepository<OvertimeRequest> repo = _unitOfWork.GetRepository<OvertimeRequest>();

            OvertimeRequest entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Overtime request not found");

            if (entity.Status != OvertimeStatus.Pending)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_STATE",
                    "Only pending overtime requests can be updated");

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            model.ToEntity(entity);
            entity.OvertimeHours = model.OvertimeHours
                ?? CalcHoursFromRange(entity.StartAt, entity.EndAt);
            entity.LastUpdatedBy = currentUser;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        /// <summary>
        /// Duyệt / từ chối. Tuân thủ "không ai tự duyệt yêu cầu của chính mình"
        /// (worklog V1): nếu reviewer không phải Admin/HR, phải là HR; và
        /// không được duyệt đơn của chính reviewer.
        /// </summary>
        public async Task ReviewAsync(ReviewOvertimeRequestModelView model)
        {
            IGenericRepository<OvertimeRequest> repo = _unitOfWork.GetRepository<OvertimeRequest>();

            OvertimeRequest entity = await repo.Entities
                .Include(x => x.Employee)
                .FirstOrDefaultAsync(x => x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Overtime request not found");

            if (entity.Status != OvertimeStatus.Pending)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_STATE",
                    "Overtime request is already processed");

            // Người duyệt phải tồn tại (Employee)
            IGenericRepository<Employee> employeeRepo = _unitOfWork.GetRepository<Employee>();
            bool reviewerExists = await employeeRepo.Entities
                .AnyAsync(x => x.Id == model.ApprovedBy && !x.DeletedTime.HasValue);
            if (!reviewerExists)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_INPUT",
                    "Reviewer (Employee) not found");

            // Quy tắc: không tự duyệt yêu cầu của chính mình, trừ Admin/HR toàn quyền.
            if (entity.EmployeeId == model.ApprovedBy && !IsElevated())
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN",
                    "You cannot approve your own overtime request");

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            entity.Status = model.Status;
            entity.ApprovedBy = model.ApprovedBy;
            entity.ApprovedAt = DateTime.UtcNow;
            entity.Note = model.Note;
            entity.LastUpdatedBy = currentUser;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<OvertimeRequest> repo = _unitOfWork.GetRepository<OvertimeRequest>();
            OvertimeRequest entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Overtime request not found");

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            entity.DeletedBy = currentUser;
            entity.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        // ===== Helpers =====
        private static decimal? CalcHoursFromRange(DateTimeOffset? start, DateTimeOffset? end)
        {
            if (start is null || end is null) return null;
            if (end < start) return null;
            return Math.Round((decimal)(end.Value - start.Value).TotalHours, 2);
        }

        // Admin/HR có quyền duyệt cả yêu cầu cá nhân của chính mình (HR/admin).
        private bool IsElevated()
        {
            System.Security.Claims.ClaimsPrincipal? user =
                _httpContextAccessor.HttpContext?.User;
            return user is not null &&
                   (user.IsInRole("Admin") || user.IsInRole("HR"));
        }
    }
}
