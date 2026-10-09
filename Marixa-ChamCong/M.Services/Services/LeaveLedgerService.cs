using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.LeaveLedgerModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class LeaveLedgerService : ILeaveLedgerService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public LeaveLedgerService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<LeaveLedgerResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();

            IQueryable<LeaveLedger> query = repo.Entities
                .Include(x => x.Employee)
                .Include(x => x.LeaveType)
                .Include(x => x.LeaveRequest)
                .Where(x => !x.DeletedTime.HasValue)
                .OrderByDescending(x => x.CreatedTime);

            int totalItems = await query.CountAsync();
            List<LeaveLedger> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new BasePaginatedList<LeaveLedgerResponseModelView>(
                items.Select(x => x.ToViewModel()).ToList().AsReadOnly(),
                totalItems, pageNumber, pageSize);
        }

        public async Task<LeaveLedgerResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();
            LeaveLedger entity = await repo.Entities
                .Include(x => x.Employee)
                .Include(x => x.LeaveType)
                .Include(x => x.LeaveRequest)
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave ledger entry not found");

            return entity.ToViewModel();
        }

        public async Task<List<LeaveLedgerResponseModelView>> ByEmployeeYearAsync(Guid employeeId, int year)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();
            List<LeaveLedger> entities = await repo.Entities
                .Include(x => x.Employee)
                .Include(x => x.LeaveType)
                .Include(x => x.LeaveRequest)
                .Where(x => x.EmployeeId == employeeId && x.Year == year && !x.DeletedTime.HasValue)
                .OrderByDescending(x => x.CreatedTime)
                .ToListAsync();

            return entities.Select(x => x.ToViewModel()).ToList();
        }

        /// <summary>
        /// Số dư phép = (Grant + Adjust dương) - (Deduct) + (Refund) trong năm.
        /// </summary>
        public async Task<LeaveLedgerSummaryModelView> GetSummaryAsync(Guid employeeId, int year)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();

            List<LeaveLedger> entries = await repo.Entities
                .Where(x => x.EmployeeId == employeeId && x.Year == year && !x.DeletedTime.HasValue)
                .Select(x => new LeaveLedger { EntryType = x.EntryType, Days = x.Days })
                .ToListAsync();

            decimal granted = 0, used = 0;
            foreach (LeaveLedger e in entries)
            {
                switch (e.EntryType)
                {
                    case LeaveLedgerEntryType.Grant:
                        granted += e.Days;
                        break;
                    case LeaveLedgerEntryType.Adjust:
                        // Điều chỉnh: có thể tăng hoặc giảm, dùng dấu của Days
                        granted += e.Days;
                        break;
                    case LeaveLedgerEntryType.Deduct:
                        used += e.Days;
                        break;
                    case LeaveLedgerEntryType.Refund:
                        used -= e.Days;
                        break;
                }
            }

            return new LeaveLedgerSummaryModelView
            {
                EmployeeId = employeeId,
                Year = year,
                TotalGranted = Math.Max(0, granted),
                TotalUsed = Math.Max(0, used),
                Remaining = granted - used
            };
        }

        /// <summary>
        /// Ghi 1 giao dịch sổ phép. Nếu kèm LeaveRequestId thì idempotent:
        /// không tạo 2 giao dịch cùng loại + cùng đơn (chống trừ 2 lần).
        /// </summary>
        public async Task CreateEntryAsync(CreateLeaveLedgerEntryModelView model)
        {
            IGenericRepository<LeaveLedger> repo = _unitOfWork.GetRepository<LeaveLedger>();

            // Nhân viên tồn tại
            IGenericRepository<Employee> employeeRepo = _unitOfWork.GetRepository<Employee>();
            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x => x.Id == model.EmployeeId && !x.DeletedTime.HasValue);
            if (!employeeExists)
                throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Employee not found");

            // Type (nếu có) tồn tại
            if (model.LeaveTypeId is Guid typeId && typeId != Guid.Empty)
            {
                IGenericRepository<LeaveType> typeRepo = _unitOfWork.GetRepository<LeaveType>();
                bool typeExists = await typeRepo.Entities
                    .AnyAsync(x => x.Id == typeId && !x.DeletedTime.HasValue);
                if (!typeExists)
                    throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Leave type not found");
            }

            // Trừ/hoàn (Deduct/Refund) liên quan đơn nghỉ phải là đơn Đã duyệt
            if (model.EntryType is LeaveLedgerEntryType.Deduct or LeaveLedgerEntryType.Refund)
            {
                if (model.LeaveRequestId is Guid reqId && reqId != Guid.Empty)
                {
                    // Idempotent: đã có giao dịch cùng loại + cùng đơn thì bỏ qua
                    bool already = await repo.Entities.AnyAsync(x =>
                        x.EntryType == model.EntryType &&
                        x.LeaveRequestId == reqId &&
                        !x.DeletedTime.HasValue);
                    if (already) return;

                    IGenericRepository<LeaveRequest> reqRepo = _unitOfWork.GetRepository<LeaveRequest>();
                    LeaveRequest? request = await reqRepo.Entities
                        .FirstOrDefaultAsync(x => x.Id == reqId && !x.DeletedTime.HasValue);
                    bool valid = request is not null &&
                        (model.EntryType == LeaveLedgerEntryType.Deduct
                            ? request.Status == LeaveRequestStatus.Approved
                            : request.Status is LeaveRequestStatus.Cancelled or LeaveRequestStatus.Rejected);
                    if (!valid)
                        throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_STATE",
                            model.EntryType == LeaveLedgerEntryType.Deduct
                                ? "Deducting leave requires an approved leave request"
                                : "Refunding leave requires a cancelled/rejected request");
                }
            }

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            LeaveLedger entity = model.ToEntity();
            entity.CreatedBy = currentUser;
            entity.LastUpdatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
        }
    }
}
