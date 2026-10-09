using M.Core.Base;
using ModelViews.ShiftModelView;

namespace M.Contract.Services.Interface
{
    public interface IShiftService
    {
        Task<BasePaginatedList<ShiftResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<ShiftResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateShiftModelView model);

        Task UpdateAsync(UpdateShiftModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}
