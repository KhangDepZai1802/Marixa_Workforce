using M.Contract.Repositories.Entities;
using ModelViews.AttendanceRuleModelView;

namespace M.Services.Mappings
{
    public static class AttendanceRuleMapping
    {
        // Entity -> AttendanceRuleResponseModelView
        public static AttendanceRuleResponseModelView ToViewModel(
            this AttendanceRule? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new AttendanceRuleResponseModelView
            {
                Id = entity.Id,
                Code = entity.Code,
                Name = entity.Name,
                Description = entity.Description,
                StandardHours = entity.StandardHours,
                CheckInTime = entity.CheckInTime,
                CheckOutTime = entity.CheckOutTime,
                LateGraceMinutes = entity.LateGraceMinutes,
                EarlyLeaveThresholdMinutes = entity.EarlyLeaveThresholdMinutes,
                BreakMinutes = entity.BreakMinutes,
                PhotoRequired = entity.PhotoRequired,
                GpsRequired = entity.GpsRequired,
                IsActive = entity.IsActive,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // CreateAttendanceRuleModelView -> Entity
        public static AttendanceRule ToEntity(this CreateAttendanceRuleModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new AttendanceRule
            {
                Code = model.Code,
                Name = model.Name,
                Description = model.Description,
                StandardHours = model.StandardHours,
                CheckInTime = model.CheckInTime,
                CheckOutTime = model.CheckOutTime,
                LateGraceMinutes = model.LateGraceMinutes,
                EarlyLeaveThresholdMinutes = model.EarlyLeaveThresholdMinutes,
                BreakMinutes = model.BreakMinutes,
                PhotoRequired = model.PhotoRequired,
                GpsRequired = model.GpsRequired,
                IsActive = model.IsActive
            };

            return entity;
        }

        // UpdateAttendanceRuleModelView -> Entity
        public static void ToEntity(
            this UpdateAttendanceRuleModelView model,
            AttendanceRule entity)
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
            entity.StandardHours = model.StandardHours;
            entity.CheckInTime = model.CheckInTime;
            entity.CheckOutTime = model.CheckOutTime;
            entity.LateGraceMinutes = model.LateGraceMinutes;
            entity.EarlyLeaveThresholdMinutes = model.EarlyLeaveThresholdMinutes;
            entity.BreakMinutes = model.BreakMinutes;
            entity.PhotoRequired = model.PhotoRequired;
            entity.GpsRequired = model.GpsRequired;
            entity.IsActive = model.IsActive;
        }
    }
}
