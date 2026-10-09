using M.Core.Base;
using ModelViews.PayrollModelView;

namespace M.Contract.Services.Interface
{
    public interface IPayrollService
    {
        Task<BasePaginatedList<PayrollResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<PayrollResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreatePayrollModelView model);

        Task UpdateAsync(UpdatePayrollModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}