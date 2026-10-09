using M.Core.Base;
using ModelViews.EmployeeDependentModelView;

namespace M.Contract.Services.Interface
{
    public interface IEmployeeDependentService
    {
        Task<BasePaginatedList<EmployeeDependentResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<EmployeeDependentResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateEmployeeDependentModelView model);

        Task UpdateAsync(UpdateEmployeeDependentModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}