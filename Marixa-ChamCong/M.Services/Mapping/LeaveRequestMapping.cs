using M.Contract.Repositories.Entities;
using ModelViews.LeaveRequestModelView;

namespace M.Services.Mappings
{
    public static class LeaveRequestMapping
    {
        // Mapping Entity -> LeaveRequestResponseModelView
        public static LeaveRequestResponseModelView ToViewModel(
            this LeaveRequest? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new LeaveRequestResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeCode = entity.Employee?.EmployeeCode,
                EmployeeName = entity.Employee?.FullName,

                LeaveTypeId = entity.LeaveTypeId,
                LeaveTypeName = entity.LeaveType?.Name,

                FromDate = entity.FromDate,
                ToDate = entity.ToDate,
                TotalDays = entity.TotalDays,
                Reason = entity.Reason,

                Status = entity.Status,

                ApprovedBy = entity.ApprovedBy,
                ApproverName = entity.Approver?.FullName,
                ApprovedAt = entity.ApprovedAt,

                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping LeaveRequestResponseModelView -> Entity
        public static LeaveRequest ToEntity(
            this LeaveRequestResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new LeaveRequest
            {
                Id = model.Id,
                EmployeeId = model.EmployeeId,
                LeaveTypeId = model.LeaveTypeId,
                FromDate = model.FromDate,
                ToDate = model.ToDate,
                TotalDays = model.TotalDays,
                Reason = model.Reason,
                Status = model.Status,
                ApprovedBy = model.ApprovedBy,
                ApprovedAt = model.ApprovedAt,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateLeaveRequestModelView -> Entity
        public static LeaveRequest ToEntity(
            this CreateLeaveRequestModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new LeaveRequest
            {
                EmployeeId = model.EmployeeId,
                LeaveTypeId = model.LeaveTypeId,
                FromDate = model.FromDate,
                ToDate = model.ToDate,
                TotalDays = model.TotalDays,
                Reason = model.Reason,

                Status = LeaveRequestStatus.Pending
            };

            return entity;
        }

        // Mapping UpdateLeaveRequestModelView -> Entity
        public static void ToEntity(
            this UpdateLeaveRequestModelView model,
            LeaveRequest entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.LeaveTypeId = model.LeaveTypeId;
            entity.FromDate = model.FromDate;
            entity.ToDate = model.ToDate;
            entity.TotalDays = model.TotalDays;
            entity.Reason = model.Reason;
        }
    }
}
