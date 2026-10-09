using M.Contract.Repositories.Entities;
using ModelViews.AttendanceCorrectionModelView;

namespace M.Services.Mappings
{
    public static class AttendanceCorrectionMapping
    {
        // Entity -> AttendanceCorrectionResponseModelView
        public static AttendanceCorrectionResponseModelView ToViewModel(this AttendanceCorrection? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            var model = new AttendanceCorrectionResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeCode = entity.Employee?.EmployeeCode,
                EmployeeName = entity.Employee?.FullName,

                AttendanceId = entity.AttendanceId,

                WorkDate = entity.WorkDate,

                ProposedCheckIn = entity.ProposedCheckIn,
                ProposedCheckOut = entity.ProposedCheckOut,
                ProposedStatus = entity.ProposedStatus,

                Reason = entity.Reason,

                Status = entity.Status,
                ReviewedBy = entity.ReviewedBy,
                ReviewerName = entity.Reviewer?.FullName,
                ReviewedAt = entity.ReviewedAt,
                ReviewNote = entity.ReviewNote,

                BeforeJson = entity.BeforeJson,
                AfterJson = entity.AfterJson,

                CreatedTime = entity.CreatedTime,
                CreatedBy = entity.CreatedBy
            };

            return model;
        }

        // CreateAttendanceCorrectionModelView -> Entity
        public static AttendanceCorrection ToEntity(this CreateAttendanceCorrectionModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new AttendanceCorrection
            {
                EmployeeId = model.EmployeeId,
                AttendanceId = model.AttendanceId,
                WorkDate = model.WorkDate,
                ProposedCheckIn = model.ProposedCheckIn,
                ProposedCheckOut = model.ProposedCheckOut,
                ProposedStatus = model.ProposedStatus,
                Reason = model.Reason,

                Status = AttendanceCorrectionStatus.Pending
            };

            return entity;
        }
    }
}
