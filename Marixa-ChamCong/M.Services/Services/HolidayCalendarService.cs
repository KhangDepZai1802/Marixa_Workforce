using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.HolidayCalendarModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class HolidayCalendarService : IHolidayCalendarService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public HolidayCalendarService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<HolidayCalendarResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<HolidayCalendar> repo = _unitOfWork.GetRepository<HolidayCalendar>();

            IQueryable<HolidayCalendar> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .OrderBy(x => x.Date);

            int totalItems = await query.CountAsync();

            List<HolidayCalendar> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<HolidayCalendarResponseModelView> result = items
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<HolidayCalendarResponseModelView>(
                result.AsReadOnly(), totalItems, pageNumber, pageSize);
        }

        public async Task<HolidayCalendarResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<HolidayCalendar> repo = _unitOfWork.GetRepository<HolidayCalendar>();

            HolidayCalendar item = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Holiday not found");

            return item.ToViewModel();
        }

        public async Task CreateAsync(CreateHolidayCalendarModelView model)
        {
            IGenericRepository<HolidayCalendar> repo = _unitOfWork.GetRepository<HolidayCalendar>();

            bool exists = await repo.Entities
                .AnyAsync(x =>
                    x.Date == model.Date &&
                    x.Type == model.Type &&
                    !x.DeletedTime.HasValue);

            if (exists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Holiday already exists for this date and type");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            HolidayCalendar entity = model.ToEntity();
            entity.Year = model.Year == 0 ? model.Date.Year : model.Year;
            entity.CreatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateHolidayCalendarModelView model)
        {
            IGenericRepository<HolidayCalendar> repo = _unitOfWork.GetRepository<HolidayCalendar>();

            HolidayCalendar entity = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Holiday not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(entity);
            entity.Year = model.Year == 0 ? model.Date.Year : model.Year;
            entity.LastUpdatedBy = currentUser;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<HolidayCalendar> repo = _unitOfWork.GetRepository<HolidayCalendar>();

            HolidayCalendar entity = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Holiday not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            entity.DeletedBy = currentUser;
            entity.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<HolidayCalendar> repo = _unitOfWork.GetRepository<HolidayCalendar>();

            HolidayCalendar entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Holiday not found");

            await repo.DeleteAsync(entity);
            await _unitOfWork.SaveAsync();
        }
    }
}
