using M.Core.Base;
using ModelViews.EmployeeContractModelView;

namespace M.Contract.Services.Interface
{
    public interface IEmployeeContractService
    {
        Task<BasePaginatedList<EmployeeContractResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<EmployeeContractResponseModelView> GetByIdAsync(Guid id);

        Task<List<EmployeeContractResponseModelView>> ByEmployeeIdAsync(Guid employeeId);

        Task CreateAsync(CreateEmployeeContractModelView model);

        Task UpdateAsync(UpdateEmployeeContractModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}