using M.Core.Base;
using ModelViews.SalaryGroupModelView;

namespace M.Contract.Services.Interface
{
    public interface ISalaryGroupService
    {
        Task<BasePaginatedList<SalaryGroupResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<SalaryGroupResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateSalaryGroupModelView model);

        Task UpdateAsync(UpdateSalaryGroupModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}