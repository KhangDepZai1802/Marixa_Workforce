using M.Contract.Repositories.Entities;
using ModelViews.OvertimeRequestModelView;

namespace M.Services.Mappings
{
    public static class OvertimeRequestMapping
    {
        // Entity -> OvertimeRequestResponseModelView
        public static OvertimeRequestResponseModelView ToViewModel(this OvertimeRequest? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            var model = new OvertimeRequestResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeCode = entity.Employee?.EmployeeCode,
                EmployeeName = entity.Employee?.FullName,

                AttendanceId = entity.AttendanceId,

                WorkDate = entity.WorkDate,
                StartAt = entity.StartAt,
                EndAt = entity.EndAt,
                OvertimeHours = entity.OvertimeHours,
                Reason = entity.Reason,

                Status = entity.Status,
                ApprovedBy = entity.ApprovedBy,
                ApproverName = entity.Approver?.FullName,
                ApprovedAt = entity.ApprovedAt,
                Note = entity.Note,

                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // CreateOvertimeRequestModelView -> Entity
        public static OvertimeRequest ToEntity(this CreateOvertimeRequestModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new OvertimeRequest
            {
                EmployeeId = model.EmployeeId,
                AttendanceId = model.AttendanceId,
                WorkDate = model.WorkDate,
                StartAt = model.StartAt,
                EndAt = model.EndAt,
                OvertimeHours = model.OvertimeHours,
                Reason = model.Reason,

                Status = OvertimeStatus.Pending
            };

            return entity;
        }

        // UpdateOvertimeRequestModelView -> Entity (in-place)
        public static void ToEntity(this UpdateOvertimeRequestModelView model, OvertimeRequest entity)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            entity.AttendanceId = model.AttendanceId;
            entity.WorkDate = model.WorkDate;
            entity.StartAt = model.StartAt;
            entity.EndAt = model.EndAt;
            entity.OvertimeHours = model.OvertimeHours;
            entity.Reason = model.Reason;
        }
    }
}
