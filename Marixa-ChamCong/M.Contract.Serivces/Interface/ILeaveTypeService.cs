using M.Core.Base;
using ModelViews.LeaveTypeModelView;

namespace M.Contract.Services.Interface
{
    public interface ILeaveTypeService
    {
        Task<BasePaginatedList<LeaveTypeResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<LeaveTypeResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateLeaveTypeModelView model);

        Task UpdateAsync(UpdateLeaveTypeModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}