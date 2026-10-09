using M.Core.Base;
using ModelViews.HolidayCalendarModelView;

namespace M.Contract.Services.Interface
{
    public interface IHolidayCalendarService
    {
        Task<BasePaginatedList<HolidayCalendarResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<HolidayCalendarResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateHolidayCalendarModelView model);

        Task UpdateAsync(UpdateHolidayCalendarModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}
