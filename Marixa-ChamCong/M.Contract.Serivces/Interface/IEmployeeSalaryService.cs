using M.Core.Base;
using ModelViews.EmployeeSalaryModelView;

namespace M.Contract.Services.Interface
{
    public interface IEmployeeSalaryService
    {
        Task<BasePaginatedList<EmployeeSalaryResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<EmployeeSalaryResponseModelView> GetByIdAsync(Guid id);

        Task<List<EmployeeSalaryResponseModelView>> ByEmployeeIdAsync(Guid employeeId);

        Task CreateAsync(CreateEmployeeSalaryModelView model);

        Task UpdateAsync(UpdateEmployeeSalaryModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}