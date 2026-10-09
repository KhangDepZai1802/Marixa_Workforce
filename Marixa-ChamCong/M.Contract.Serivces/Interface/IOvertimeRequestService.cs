using M.Core.Base;
using ModelViews.OvertimeRequestModelView;

namespace M.Contract.Services.Interface
{
    public interface IOvertimeRequestService
    {
        Task<BasePaginatedList<OvertimeRequestResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<OvertimeRequestResponseModelView> GetByIdAsync(Guid id);

        Task<List<OvertimeRequestResponseModelView>> ByEmployeeIdAsync(Guid employeeId);

        Task CreateAsync(CreateOvertimeRequestModelView model);

        Task UpdateAsync(UpdateOvertimeRequestModelView model);

        Task ReviewAsync(ReviewOvertimeRequestModelView model);

        Task SoftDeleteAsync(Guid id);
    }
}
