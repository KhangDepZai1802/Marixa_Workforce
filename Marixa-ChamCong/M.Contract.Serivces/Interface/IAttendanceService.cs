using M.Core.Base;
using ModelViews.AttendanceModelView;

namespace M.Contract.Serivces.Interface
{
    public interface IAttendanceService
    {
        Task<BasePaginatedList<AttendanceResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<AttendanceResponseModelView> GetByIdAsync(Guid id);

        Task<List<AttendanceResponseModelView>> ByEmployeeIdAsync(Guid employeeId);

        Task<CheckInAttendanceResponseModelView> CheckInAsync(
            CheckInAttendanceModelView model);

        Task CreateAsync(CreateAttendanceModelView model);

        Task UpdateAsync(UpdateAttendanceModelView model);

        Task ApproveAsync(ApproveAttendanceModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}
