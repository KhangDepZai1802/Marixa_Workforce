using M.Core.Base;
using ModelViews.EmployeeBankAccountModelView;

namespace M.Contract.Serivces.Interface
{
    public interface IEmployeeBankAccountService
    {
        Task<BasePaginatedList<EmployeeBankAccountResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<EmployeeBankAccountResponseModelView> GetByIdAsync(Guid id);

        Task<List<EmployeeBankAccountResponseModelView>> ByEmployeeIdAsync(Guid employeeId);

        Task CreateAsync(CreateEmployeeBankAccountModelView model);

        Task UpdateAsync(UpdateEmployeeBankAccountModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}