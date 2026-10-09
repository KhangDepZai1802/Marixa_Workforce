using M.Core.Base;
using ModelViews.BankModelView;

namespace M.Contract.Serivces.Interface
{
    public interface IBankService
    {
        Task<BasePaginatedList<BankResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<BankResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateBankModelView model);

        Task UpdateAsync(UpdateBankModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}