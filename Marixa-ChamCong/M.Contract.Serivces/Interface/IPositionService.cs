using M.Core.Base;
using ModelViews.PositionModelView;

namespace M.Contract.Services.Interface
{
    public interface IPositionService
    {
        Task<BasePaginatedList<PositionResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<PositionResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreatePositionModelView model);

        Task UpdateAsync(UpdatePositionModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}