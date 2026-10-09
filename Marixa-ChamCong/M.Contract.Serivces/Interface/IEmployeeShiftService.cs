using M.Core.Base;
using ModelViews.EmployeeShiftModelView;

namespace M.Contract.Services.Interface
{
    public interface IEmployeeShiftService
    {
        Task<BasePaginatedList<EmployeeShiftResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<EmployeeShiftResponseModelView> GetByIdAsync(Guid id);

        Task<List<EmployeeShiftResponseModelView>> ByEmployeeIdAsync(Guid employeeId);

        Task CreateAsync(CreateEmployeeShiftModelView model);

        Task<CreateEmployeeShiftBulkResultModelView> CreateBulkAsync(
            CreateEmployeeShiftBulkModelView model,
            string currentUser,
            bool canManageAllEmployees,
            Guid? managerEmployeeId);

        Task UpdateAsync(UpdateEmployeeShiftModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}
