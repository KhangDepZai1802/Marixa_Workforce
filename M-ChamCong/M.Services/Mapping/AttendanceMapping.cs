using M.Contract.Repositories.Entities;
using ModelViews.AttendanceModelView;

namespace M.Services.Mappings
{
    public static class AttendanceMapping
    {
        // Mapping Entity -> AttendanceResponseModelView
        public static AttendanceResponseModelView ToViewModel(this Attendance? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            // Giờ vào ca: ưu tiên field override, nếu null thì derive từ log
            var checkInTime = entity.CheckInTime
                ?? entity.AttendanceLogs?
                    .Where(x => x.Type == AttendanceLogType.CheckIn)
                    .Select(x => x.LogTime)
                    .Cast<DateTimeOffset?>()
                    .Min();

            var checkOutTime = entity.CheckOutTime
                ?? entity.AttendanceLogs?
                    .Where(x => x.Type == AttendanceLogType.CheckOut)
                    .Select(x => x.LogTime)
                    .Cast<DateTimeOffset?>()
                    .Max();

            var model = new AttendanceResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeCode = entity.Employee?.EmployeeCode,
                EmployeeName = entity.Employee?.FullName,
                AttendanceDate = entity.AttendanceDate,
                Status = entity.Status,
                PlannedShiftId = entity.PlannedShiftId,
                PlannedShiftName = entity.PlannedShift?.Name,
                PlannedHours = entity.PlannedHours,
                ActualHours = entity.ActualHours,
                OvertimeHours = entity.OvertimeHours,
                CheckInTime = checkInTime,
                CheckOutTime = checkOutTime,
                CheckInPhoto = entity.CheckInPhoto,
                CheckOutPhoto = entity.CheckOutPhoto,
                ApprovalStatus = entity.ApprovalStatus,
                ApprovedBy = entity.ApprovedBy,
                ApproverName = entity.Approver?.FullName,
                ApprovedAt = entity.ApprovedAt,
                Note = entity.Note,
                ChangeSummary = entity.ChangeSummary,
                LastUpdatedBy = entity.LastUpdatedBy,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping CreateAttendanceModelView -> Entity
        public static Attendance ToEntity(this CreateAttendanceModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new Attendance
            {
                EmployeeId = model.EmployeeId,
                AttendanceDate = model.AttendanceDate,
                Status = model.Status,
                CheckInTime = model.CheckInTime,
                CheckOutTime = model.CheckOutTime,
                PlannedShiftId = model.PlannedShiftId,
                PlannedHours = model.PlannedHours,
                Note = model.Note,
                ApprovalStatus = AttendanceApprovalStatus.Pending
            };

            return entity;
        }

        // Mapping UpdateAttendanceModelView -> Entity
        public static void ToEntity(
            this UpdateAttendanceModelView model,
            Attendance entity)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.AttendanceDate = model.AttendanceDate;
            entity.Status = model.Status;
            entity.PlannedShiftId = model.PlannedShiftId;
            entity.PlannedHours = model.PlannedHours;
            entity.ActualHours = model.ActualHours;

            // Giờ vào / ra ca (manual override)
            entity.CheckInTime = model.CheckInTime;
            entity.CheckOutTime = model.CheckOutTime;

            // keep existing photo unless a new one is supplied
            if (!string.IsNullOrWhiteSpace(model.CheckInPhoto))
                entity.CheckInPhoto = model.CheckInPhoto;
            if (!string.IsNullOrWhiteSpace(model.CheckOutPhoto))
                entity.CheckOutPhoto = model.CheckOutPhoto;
            entity.ApprovalStatus = model.ApprovalStatus;
            entity.ApprovedBy = model.ApprovedBy;
            entity.ApprovedAt = model.ApprovedAt;

            entity.Note = model.Note == string.Empty
                ? string.Empty
                : model.Note == null
                    ? entity.Note
                    : model.Note;
        }
    }
}
