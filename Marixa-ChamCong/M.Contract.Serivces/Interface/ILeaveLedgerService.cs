using M.Core.Base;
using ModelViews.LeaveLedgerModelView;

namespace M.Contract.Services.Interface
{
    public interface ILeaveLedgerService
    {
        Task<BasePaginatedList<LeaveLedgerResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<LeaveLedgerResponseModelView> GetByIdAsync(Guid id);

        Task<List<LeaveLedgerResponseModelView>> ByEmployeeYearAsync(Guid employeeId, int year);

        // Số dư phép theo năm (tổng giao dịch) cho một nhân viên
        Task<LeaveLedgerSummaryModelView> GetSummaryAsync(Guid employeeId, int year);

        Task CreateEntryAsync(CreateLeaveLedgerEntryModelView model);
    }
}
