using M.Contract.Repositories.Entities;
using ModelViews.AttendanceLogModelView;

namespace M.Services.Mappings
{
    public static class AttendanceLogMapping
    {
        // Mapping Entity -> AttendanceLogResponseModelView
        public static AttendanceLogResponseModelView ToViewModel(
            this AttendanceLog? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            var model = new AttendanceLogResponseModelView
            {
                Id = entity.Id,
                AttendanceId = entity.AttendanceId,
                EmployeeId = entity.Attendance?.EmployeeId ?? Guid.Empty,
                EmployeeName = entity.Attendance?.Employee?.FullName,
                LogTime = entity.LogTime,
                Type = entity.Type,
                Method = entity.Method,
                PhotoUrl = entity.PhotoUrl,
                Latitude = entity.Latitude,
                Longitude = entity.Longitude,
                DeviceId = entity.DeviceId,
                Note = entity.Note,
                IsAdjusted = entity.IsAdjusted,
                AdjustedBy = entity.AdjustedBy,
                AdjustedAt = entity.AdjustedAt,
                AdjustmentNote = entity.AdjustmentNote,
                CreatedTime = entity.CreatedTime
            };

            return model;
        }

        // Mapping CreateAttendanceLogModelView -> Entity
        public static AttendanceLog ToEntity(
            this CreateAttendanceLogModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new AttendanceLog
            {
                AttendanceId = model.AttendanceId,
                LogTime = model.LogTime,
                Type = model.Type,
                Method = model.Method,
                PhotoUrl = model.PhotoUrl,
                Latitude = model.Latitude,
                Longitude = model.Longitude,
                DeviceId = model.DeviceId,
                Note = model.Note
            };

            return entity;
        }

        // Mapping UpdateAttendanceLogModelView -> Entity
        public static void ToEntity(
            this UpdateAttendanceLogModelView model,
            AttendanceLog entity)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            entity.AttendanceId = model.AttendanceId;
            entity.LogTime = model.LogTime;
            entity.Type = model.Type;
            entity.Method = model.Method;
            entity.PhotoUrl = model.PhotoUrl;
            entity.Latitude = model.Latitude;
            entity.Longitude = model.Longitude;

            entity.DeviceId = model.DeviceId == string.Empty
                ? string.Empty
                : model.DeviceId == null
                    ? entity.DeviceId
                    : model.DeviceId;

            entity.Note = model.Note == string.Empty
                ? string.Empty
                : model.Note == null
                    ? entity.Note
                    : model.Note;
        }
    }
}
