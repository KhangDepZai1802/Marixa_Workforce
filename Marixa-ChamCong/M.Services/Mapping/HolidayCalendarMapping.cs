using M.Contract.Repositories.Entities;
using ModelViews.HolidayCalendarModelView;

namespace M.Services.Mappings
{
    public static class HolidayCalendarMapping
    {
        // Entity -> HolidayCalendarResponseModelView
        public static HolidayCalendarResponseModelView ToViewModel(
            this HolidayCalendar? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new HolidayCalendarResponseModelView
            {
                Id = entity.Id,
                Date = entity.Date,
                Year = entity.Year,
                Type = entity.Type,
                Name = entity.Name,
                IsActive = entity.IsActive,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // CreateHolidayCalendarModelView -> Entity
        public static HolidayCalendar ToEntity(this CreateHolidayCalendarModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new HolidayCalendar
            {
                Date = model.Date,
                Year = model.Year,
                Type = model.Type,
                Name = model.Name,
                IsActive = model.IsActive
            };

            return entity;
        }

        // UpdateHolidayCalendarModelView -> Entity
        public static void ToEntity(
            this UpdateHolidayCalendarModelView model,
            HolidayCalendar entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.Date = model.Date;
            entity.Year = model.Year;
            entity.Type = model.Type;

            entity.Name = model.Name == string.Empty
                ? string.Empty
                : model.Name == null
                    ? entity.Name
                    : model.Name;

            entity.IsActive = model.IsActive;
        }
    }
}
