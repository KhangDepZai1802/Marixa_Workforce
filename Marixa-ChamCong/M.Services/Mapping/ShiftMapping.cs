using M.Contract.Repositories.Entities;
using ModelViews.ShiftModelView;

namespace M.Services.Mappings
{
    public static class ShiftMapping
    {
        // Entity -> ShiftResponseModelView
        public static ShiftResponseModelView ToViewModel(this Shift? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new ShiftResponseModelView
            {
                Id = entity.Id,
                Code = entity.Code,
                Name = entity.Name,
                Description = entity.Description,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                StandardHours = entity.StandardHours,
                BreakMinutes = entity.BreakMinutes,
                IsNight = entity.IsNight,
                WorkDays = entity.WorkDays,
                IsActive = entity.IsActive,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // CreateShiftModelView -> Entity
        public static Shift ToEntity(this CreateShiftModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new Shift
            {
                Code = model.Code,
                Name = model.Name,
                Description = model.Description,
                StartTime = model.StartTime,
                EndTime = model.EndTime,
                StandardHours = model.StandardHours,
                BreakMinutes = model.BreakMinutes,
                IsNight = model.IsNight,
                WorkDays = model.WorkDays,
                IsActive = model.IsActive
            };

            return entity;
        }

        // UpdateShiftModelView -> Entity
        public static void ToEntity(this UpdateShiftModelView model, Shift entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.Code = model.Code;
            entity.Name = model.Name;
            entity.Description = model.Description == string.Empty
                ? string.Empty
                : model.Description == null
                    ? entity.Description
                    : model.Description;
            entity.StartTime = model.StartTime;
            entity.EndTime = model.EndTime;
            entity.StandardHours = model.StandardHours;
            entity.BreakMinutes = model.BreakMinutes;
            entity.IsNight = model.IsNight;
            entity.WorkDays = model.WorkDays;
            entity.IsActive = model.IsActive;
        }
    }
}
