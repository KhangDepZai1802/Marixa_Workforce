using M.Core.Base;
using ModelViews.AttendanceRuleModelView;

namespace M.Contract.Services.Interface
{
    public interface IAttendanceRuleService
    {
        Task<BasePaginatedList<AttendanceRuleResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<AttendanceRuleResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateAttendanceRuleModelView model);

        Task UpdateAsync(UpdateAttendanceRuleModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}
