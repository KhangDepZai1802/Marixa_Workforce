using M.Contract.Repositories.Entities;
using M.Contract.Repositories.Entity;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.LeaveLedgerModelView;
using ModelViews.LeaveRequestModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    /// <summary>
    /// Nghiệp vụ nghỉ phép theo docs Marixa V1:
    ///  - Không ai được duyệt yêu cầu của chính mình.
    ///  - HR duyệt nhân viên + admin có hồ sơ; Admin duyệt HR.
    ///  - Đơn nghỉ phép có hạn mức (LeaveType.MaxDays != null): khi được
    ///    DUYỆT sinh giao dịch Deduct idempotent trong LeaveLedger (theo
    ///    LeaveRequestId + Year). Khi HỦY hợp lệ sinh Refund.
    ///  - Chỉ đơn Pending được sửa/hủy; Approved/Rejected/Canceled đóng băng.
    /// </summary>
    public class LeaveRequestService : ILeaveRequestService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public LeaveRequestService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        // =====================================================================
        // 1. TRUY VẤN
        // =====================================================================

        public async Task<BasePaginatedList<LeaveRequestResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            pageNumber = pageNumber < 1 ? 1 : pageNumber;
            pageSize = pageSize < 1 ? 10 : Math.Min(pageSize, 200);

            IQueryable<LeaveRequest> query = repo.Entities
                .Include(x => x.Employee)
                .Include(x => x.LeaveType)
                .Include(x => x.Approver)
                .Where(x => !x.DeletedTime.HasValue)
                .OrderByDescending(x => x.FromDate)
                .ThenByDescending(x => x.CreatedTime);

            int totalItems = await query.CountAsync();
            List<LeaveRequest> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<LeaveRequestResponseModelView> result = items.Select(x => x.ToViewModel()).ToList();
            return new BasePaginatedList<LeaveRequestResponseModelView>(result.AsReadOnly(), totalItems, pageNumber, pageSize);
        }

        public async Task<LeaveRequestResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            LeaveRequest entity = await repo.Entities
                .Include(x => x.Employee).Include(x => x.LeaveType).Include(x => x.Approver)
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave request not found");
            return entity.ToViewModel();
        }

        public async Task<List<LeaveRequestResponseModelView>> ByEmployeeIdAsync(Guid employeeId)
        {
            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            List<LeaveRequest> entities = await repo.Entities
                .Where(x => x.EmployeeId == employeeId && !x.DeletedTime.HasValue)
                .Include(x => x.Employee).Include(x => x.LeaveType).Include(x => x.Approver)
                .OrderByDescending(x => x.FromDate)
                .ToListAsync();
            return entities.Select(x => x.ToViewModel()).ToList();
        }

        /// <summary>
        /// Số dư sổ phép (theo năm) của một nhân viên:
        /// TotalGranted = SUM(Grant) + SUM(Adjust dương)
        /// TotalUsed    = SUM(Deduct dương)
        /// Remaining    = TotalGranted - TotalUsed
        /// </summary>
        public async Task<List<LeaveLedgerSummaryModelView>> LedgerSummaryAsync(Guid employeeId, int year)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();
            IQueryable<LeaveLedger> q = repo.Entities
                .Where(x => x.EmployeeId == employeeId && x.Year == year);

            decimal totalGranted = await q
                .Where(x => x.EntryType == LeaveLedgerEntryType.Grant ||
                            (x.EntryType == LeaveLedgerEntryType.Adjust && x.Days > 0))
                .SumAsync(x => x.Days);
            decimal totalUsed = await q
                .Where(x => x.EntryType == LeaveLedgerEntryType.Deduct)
                .SumAsync(x => x.Days);

            // Hoàn (Refund) giảm số đã dùng
            decimal totalRefund = await q
                .Where(x => x.EntryType == LeaveLedgerEntryType.Refund)
                .SumAsync(x => x.Days);
            decimal effectiveUsed = totalUsed - totalRefund;

            return new List<LeaveLedgerSummaryModelView>
            {
                new()
                {
                    EmployeeId = employeeId,
                    Year = year,
                    TotalGranted = totalGranted,
                    TotalUsed = Math.Max(0, effectiveUsed),
                    Remaining = totalGranted - Math.Max(0, effectiveUsed),
                }
            };
        }

        // =====================================================================
        // 2. TẠO / SỬA
        // =====================================================================

        public async Task<Guid> CreateAsync(CreateLeaveRequestModelView model, Guid requesterEmployeeId)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            IGenericRepository<Employee> empRepo = _unitOfWork.GetRepository<Employee>();
            IGenericRepository<LeaveType> typeRepo = _unitOfWork.GetRepository<LeaveType>();

            // Validate owner
            Employee owner = await empRepo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.EmployeeId && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Employee not found");

            // Only active employee can file leave
            if (owner.Status is not (EmployeeStatus.Probation or EmployeeStatus.Working or EmployeeStatus.OnLeave))
            {
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_STATUS",
                    "Employee is not in a valid status to request leave.");
            }

            // Validate leave type (active only)
            LeaveType leaveType = await typeRepo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.LeaveTypeId && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave type not found");
            if (!leaveType.IsActive)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INACTIVE_LEAVE_TYPE",
                    "Leave type is inactive.");

            // Validate dates
            if (model.ToDate.Date < model.FromDate.Date)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_INPUT",
                    "ToDate must be greater than or equal to FromDate.");

            // Only the owner or an approver with authority may create
            var roleInfo = await ResolveRolesAsync(requesterEmployeeId);
            bool isAdmin = roleInfo.IsAdmin;
            bool isHr = roleInfo.IsHr;
            bool isMgr = roleInfo.IsMgr;
            bool ownerSelf = requesterEmployeeId == model.EmployeeId;
            bool authorisedByRole = isAdmin || isHr || isMgr;
            if (!ownerSelf && !authorisedByRole)
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN",
                    "You can only create leave requests for yourself.");

            // Prevent overlap with other open (Pending/Approved) requests
            bool overlap = await repo.Entities.AnyAsync(x =>
                x.EmployeeId == model.EmployeeId &&
                !x.DeletedTime.HasValue &&
                (x.Status == LeaveRequestStatus.Pending || x.Status == LeaveRequestStatus.Approved) &&
                x.FromDate.Date <= model.ToDate.Date &&
                x.ToDate.Date >= model.FromDate.Date);
            if (overlap)
                throw new ErrorException(StatusCodes.Status400BadRequest, "OVERLAP",
                    "Employee already has an open or approved leave request overlapping the specified period.");

            // For limited leave types, ensure projected remaining >= TotalDays
            decimal totalDays = model.TotalDays
                ?? (decimal)(model.ToDate.Date - model.FromDate.Date).TotalDays + 1m;
            if (leaveType.MaxDays.HasValue)
            {
                int year = model.FromDate.Year;
                decimal alreadyUsedInYear = await UsedInYearAsync(owner.Id, year, leaveType.Id);
                if (alreadyUsedInYear + totalDays > leaveType.MaxDays.Value)
                    throw new ErrorException(StatusCodes.Status400BadRequest, "INSUFFICIENT_BALANCE",
                        $"Not enough {leaveType.Name} balance. Used: {alreadyUsedInYear}, requested: {totalDays}, limit: {leaveType.MaxDays}.");
            }

            string currentUser = CurrentUserName();
            LeaveRequest entity = model.ToEntity();
            entity.TotalDays = totalDays;
            entity.Status = LeaveRequestStatus.Pending;
            entity.CreatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;
            entity.LastUpdatedBy = currentUser;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
            return entity.Id;
        }

        public async Task UpdateAsync(UpdateLeaveRequestModelView model, Guid requesterEmployeeId)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            IGenericRepository<Employee> empRepo = _unitOfWork.GetRepository<Employee>();
            IGenericRepository<LeaveType> typeRepo = _unitOfWork.GetRepository<LeaveType>();

            LeaveRequest entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave request not found");

            // Only editable while Pending
            if (entity.Status != LeaveRequestStatus.Pending)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_STATUS",
                    "Only pending leave requests can be modified.");

            // Only owner or authorised approver can edit
            bool ownerSelf = entity.EmployeeId == requesterEmployeeId;
            (bool isAdmin, bool isHr, bool isMgr, _) = await ResolveRolesAsync(requesterEmployeeId);
            if (!ownerSelf && !(isAdmin || isHr || isMgr))
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN",
                    "You can only modify your own pending leave requests.");

            // Validate employee & leave type again (defensive)
            bool employeeExists = await empRepo.Entities
                .AnyAsync(x => x.Id == model.EmployeeId && !x.DeletedTime.HasValue);
            if (!employeeExists)
                throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Employee not found");

            LeaveType leaveType = await typeRepo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.LeaveTypeId && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave type not found");
            if (!leaveType.IsActive)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INACTIVE_LEAVE_TYPE", "Leave type is inactive.");

            if (model.ToDate.Date < model.FromDate.Date)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_INPUT",
                    "ToDate must be greater than or equal to FromDate.");

            // Overlap check (excluding self)
            bool overlap = await repo.Entities.AnyAsync(x =>
                x.Id != model.Id &&
                x.EmployeeId == model.EmployeeId &&
                !x.DeletedTime.HasValue &&
                (x.Status == LeaveRequestStatus.Pending || x.Status == LeaveRequestStatus.Approved) &&
                x.FromDate.Date <= model.ToDate.Date &&
                x.ToDate.Date >= model.FromDate.Date);
            if (overlap)
                throw new ErrorException(StatusCodes.Status400BadRequest, "OVERLAP",
                    "Another open/approved leave request overlaps with the specified period.");

            decimal totalDays = model.TotalDays
                ?? (decimal)(model.ToDate.Date - model.FromDate.Date).TotalDays + 1m;

            // Balance check on limited types (projected remaining after edit)
            if (leaveType.MaxDays.HasValue)
            {
                int year = model.FromDate.Year;
                decimal alreadyUsedInYear = await UsedInYearAsync(model.EmployeeId, year, leaveType.Id);
                // Exclude the entry tied to this request (which should not exist while Pending, but be safe)
                alreadyUsedInYear -= await repo.Entities.AnyAsync(x => x.Id == entity.Id && x.Status == LeaveRequestStatus.Approved)
                    ? totalDays : 0m;
                if (alreadyUsedInYear + totalDays > leaveType.MaxDays.Value)
                    throw new ErrorException(StatusCodes.Status400BadRequest, "INSUFFICIENT_BALANCE",
                        "Not enough balance for the new period.");
            }

            model.ToEntity(entity);
            entity.TotalDays = totalDays;
            entity.Status = LeaveRequestStatus.Pending; // force re-approval after edit
            entity.ApprovedBy = null;
            entity.ApprovedAt = null;

            entity.LastUpdatedBy = CurrentUserName();
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        // =====================================================================
        // 3. QUYẾT ĐỊNH (APPROVE / REJECT / CANCEL)
        // =====================================================================

        public async Task ApproveAsync(Guid id, DecisionLeaveRequestModelView model, Guid approverEmployeeId)
        {
            await DecideAsync(id, approverEmployeeId, LeaveRequestStatus.Approved,
                model?.Note, ledgerOnPositive: true);
        }

        public async Task RejectAsync(Guid id, DecisionLeaveRequestModelView model, Guid approverEmployeeId)
        {
            await DecideAsync(id, approverEmployeeId, LeaveRequestStatus.Rejected,
                model?.Note, ledgerOnPositive: false);
        }

        public async Task CancelAsync(Guid id, CancelLeaveRequestModelView model, Guid cancellerEmployeeId)
        {
            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            LeaveRequest entity = await repo.Entities
                .Include(x => x.LeaveType)
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave request not found");

            if (entity.Status != LeaveRequestStatus.Pending)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_STATUS",
                    "Only pending leave requests can be cancelled. Rejected/Approved requests are immutable.");

            // Only the owner or Admin can cancel
            bool isOwner = entity.EmployeeId == cancellerEmployeeId;
            (bool isAdmin, _, _, _) = await ResolveRolesAsync(cancellerEmployeeId);
            if (!isOwner && !isAdmin)
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN",
                    "Only the owner or an admin can cancel this request.");

            entity.Status = LeaveRequestStatus.Cancelled;
            entity.ApprovedBy = cancellerEmployeeId; // record who cancelled
            entity.ApprovedAt = CoreHelper.SystemTimeNow.UtcDateTime;
            entity.LastUpdatedBy = CurrentUserName();
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            // If there is a stray Deduct entry (admin undid a previously approved),
            // emit a Refund to keep the ledger consistent.
            bool strayDeduct = await _unitOfWork.GetRepository<LeaveLedger>().Entities.AnyAsync(x =>
                x.LeaveRequestId == entity.Id && x.EntryType == LeaveLedgerEntryType.Deduct);
            if (strayDeduct)
            {
                await InsertLedgerRefundAsync(entity, model?.Reason ?? "Hủy đơn");
            }

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        /// <summary>
        /// Shared decision path for approve/reject.
        /// Enforces:
        ///  - approver != owner (chặn tự duyệt)
        ///  - approver role is one of Admin/Manager/HR
        ///  - HR can't approve another HR's request
        ///  - Admin can approve HR's request
        ///  - Balance check for limited leave types before Deduct
        /// </summary>
        private async Task DecideAsync(
            Guid id,
            Guid approverEmployeeId,
            LeaveRequestStatus newStatus,
            string? note,
            bool ledgerOnPositive)
        {
            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            LeaveRequest entity = await repo.Entities
                .Include(x => x.Employee).Include(x => x.LeaveType)
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave request not found");

            if (entity.Status != LeaveRequestStatus.Pending)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_STATUS",
                    "Only pending leave requests can be approved or rejected.");

            // Chặn tự duyệt
            if (entity.EmployeeId == approverEmployeeId)
                throw new ErrorException(StatusCodes.Status403Forbidden, "SELF_APPROVAL_NOT_ALLOWED",
                    "You cannot approve or reject your own leave request.");

            // Role approver
            (bool isAdmin, bool isHr, bool isMgr, _) = await ResolveRolesAsync(approverEmployeeId);
            if (!isAdmin && !isHr && !isMgr)
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN",
                    "Only HR, Manager, or Admin can approve/reject leave requests.");

            // HR không được duyệt HR khác; Manager không duyệt HR/Admin
            (bool ownerIsAdmin, bool ownerIsHr, bool ownerIsMgr, _) =
                await ResolveRolesAsync(entity.EmployeeId);
            if (isHr && (ownerIsHr || ownerIsMgr))
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN",
                    "HR can only approve employees and admin-with-profile, not other HR/Manager.");
            if (isMgr && (ownerIsHr || ownerIsAdmin))
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN",
                    "Manager can only approve employees.");

            // Nếu là Approve + leave type có MaxDays: kiểm tra số dư trước khi sinh Deduct
            if (ledgerOnPositive && entity.LeaveType?.MaxDays.HasValue == true)
            {
                int year = entity.FromDate.Year;
                decimal alreadyUsed = await UsedInYearAsync(entity.EmployeeId, year, entity.LeaveTypeId);
                decimal projected = alreadyUsed + (entity.TotalDays ?? 0m);
                if (projected > entity.LeaveType.MaxDays.Value)
                    throw new ErrorException(StatusCodes.Status409Conflict, "INSUFFICIENT_BALANCE",
                        $"Insufficient leave balance. Used: {alreadyUsed}, requested: {entity.TotalDays}, limit: {entity.LeaveType.MaxDays}.");
            }

            entity.Status = newStatus;
            entity.ApprovedBy = approverEmployeeId;
            entity.ApprovedAt = CoreHelper.SystemTimeNow.UtcDateTime;
            entity.LastUpdatedBy = CurrentUserName();
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            // Sinh giao dịch Deduct (idempotent theo LeaveRequestId + Year)
            if (ledgerOnPositive && entity.LeaveType?.MaxDays.HasValue == true)
            {
                await EnsureDeductEntryAsync(entity, note);
            }

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        // ---- Ledger helpers ---------------------------------------------------

        private async Task<decimal> UsedInYearAsync(Guid employeeId, int year, Guid? leaveTypeId)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();
            IQueryable<LeaveLedger> q = repo.Entities
                .Where(x => x.EmployeeId == employeeId && x.Year == year);
            if (leaveTypeId.HasValue)
                q = q.Where(x => x.LeaveTypeId == leaveTypeId);

            decimal deduct = await q.Where(x => x.EntryType == LeaveLedgerEntryType.Deduct).SumAsync(x => x.Days);
            decimal refund = await q.Where(x => x.EntryType == LeaveLedgerEntryType.Refund).SumAsync(x => x.Days);
            return deduct - refund;
        }

        /// <summary>
        /// Idempotent: chỉ tạo khi chưa có Deduct cho (requestId, year).
        /// </summary>
        private async Task EnsureDeductEntryAsync(LeaveRequest entity, string? note)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();
            int year = entity.FromDate.Year;
            bool exists = await repo.Entities.AnyAsync(x =>
                x.LeaveRequestId == entity.Id &&
                x.EntryType == LeaveLedgerEntryType.Deduct &&
                x.Year == year);
            if (exists) return;

            LeaveLedger entry = new()
            {
                Id = Guid.NewGuid(),
                EmployeeId = entity.EmployeeId,
                Year = year,
                LeaveTypeId = entity.LeaveTypeId,
                EntryType = LeaveLedgerEntryType.Deduct,
                Days = entity.TotalDays ?? 0m,
                LeaveRequestId = entity.Id,
                Reason = string.IsNullOrEmpty(note)
                    ? $"Duyệt nghỉ phép ({entity.LeaveType?.Name ?? "N/A"})"
                    : $"Duyệt nghỉ phép ({entity.LeaveType?.Name ?? "N/A"}) · {note}",
                CreatedBy = CurrentUserName(),
                CreatedTime = CoreHelper.SystemTimeNow,
                LastUpdatedBy = CurrentUserName(),
                LastUpdatedTime = CoreHelper.SystemTimeNow,
            };
            await repo.InsertAsync(entry);
        }

        private async Task InsertLedgerRefundAsync(LeaveRequest entity, string reason)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();
            int year = entity.FromDate.Year;
            LeaveLedger entry = new()
            {
                Id = Guid.NewGuid(),
                EmployeeId = entity.EmployeeId,
                Year = year,
                LeaveTypeId = entity.LeaveTypeId,
                EntryType = LeaveLedgerEntryType.Refund,
                Days = entity.TotalDays ?? 0m,
                LeaveRequestId = entity.Id,
                Reason = reason,
                CreatedBy = CurrentUserName(),
                CreatedTime = CoreHelper.SystemTimeNow,
                LastUpdatedBy = CurrentUserName(),
                LastUpdatedTime = CoreHelper.SystemTimeNow,
            };
            await repo.InsertAsync(entry);
        }

        // =====================================================================
        // 4. ADMIN / QUYỀN TRỢ
        // =====================================================================

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            LeaveRequest entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave request not found");

            entity.DeletedBy = CurrentUserName();
            entity.DeletedTime = CoreHelper.SystemTimeNow;
            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<LeaveRequest> repo = _unitOfWork.GetRepository<LeaveRequest>();
            LeaveRequest entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave request not found");

            // Nếu đã sinh Deduct, cũng xóa để tránh "orphan" ledger
            IGenericRepository<LeaveLedger> ledgerRepo = _unitOfWork.GetRepository<LeaveLedger>();
            List<LeaveLedger> ledgers = await ledgerRepo.Entities
                .Where(x => x.LeaveRequestId == entity.Id)
                .ToListAsync();
            foreach (LeaveLedger ledger in ledgers)
                await ledgerRepo.DeleteAsync(ledger);

            await repo.DeleteAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        // =====================================================================
        // 5. HELPERS
        // =====================================================================

        private string CurrentUserName() =>
            _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

        /// <summary>
        /// Trả về (isAdmin, isHr, isMgr, userId) của employee này.
        /// Dùng để enforce rule "chặn tự duyệt" + "HR không duyệt HR".
        /// </summary>
        private async Task<(bool IsAdmin, bool IsHr, bool IsMgr, Guid UserId)> ResolveRolesAsync(Guid employeeId)
        {
            if (employeeId == Guid.Empty)
                return (false, false, false, Guid.Empty);

            IGenericRepository<Employee> empRepo = _unitOfWork.GetRepository<Employee>();
            Guid? userId = await empRepo.Entities.AsNoTracking()
                .Where(x => x.Id == employeeId)
                .Select(x => (Guid?)x.UserId)
                .FirstOrDefaultAsync();

            if (userId is null)
                return (false, false, false, Guid.Empty);

            IGenericRepository<ApplicationUserRole> uarRepo = _unitOfWork.GetRepository<ApplicationUserRole>();
            IGenericRepository<ApplicationRole> roleRepo = _unitOfWork.GetRepository<ApplicationRole>();
            List<string> roleNames = await uarRepo.Entities.AsNoTracking()
                .Where(x => x.UserId == userId)
                .Join(roleRepo.Entities.AsNoTracking(),
                      uar => uar.RoleId, role => role.Id,
                      (uar, role) => new { role.Name })
                .Select(x => x.Name)
                .ToListAsync();

            return (
                roleNames.Contains("Admin"),
                roleNames.Contains("HR"),
                roleNames.Contains("Manager"),
                userId.Value);
        }
    }
}
