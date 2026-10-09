using M.Core.Base;
using ModelViews.AttendanceCorrectionModelView;

namespace M.Contract.Services.Interface
{
    public interface IAttendanceCorrectionService
    {
        Task<BasePaginatedList<AttendanceCorrectionResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<AttendanceCorrectionResponseModelView> GetByIdAsync(Guid id);

        Task<List<AttendanceCorrectionResponseModelView>> ByEmployeeIdAsync(Guid employeeId);

        Task CreateAsync(CreateAttendanceCorrectionModelView model);

        Task ReviewAsync(ReviewAttendanceCorrectionModelView model);
    }
}
