using M.Core.Base;
using ModelViews.EmployeeModelView;

namespace M.Contract.Services.Interface
{
    public interface IEmployeeService
    {
        Task<BasePaginatedList<EmployeeResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<BasePaginatedList<EmployeeResponseModelView>> GetArchivedAsync(int pageNumber, int pageSize);

        Task RestoreAsync(Guid id);

        Task<EmployeeResponseModelView> GetByIdAsync(Guid id);

        Task<EmployeeResponseModelView?> GetByUserIdAsync(Guid userId);

        Task<Guid> CreateAsync(CreateEmployeeModelView model);

        Task UpdateAsync(UpdateEmployeeModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}
