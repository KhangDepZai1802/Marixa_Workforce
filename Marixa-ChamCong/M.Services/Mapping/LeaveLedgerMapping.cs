using M.Contract.Repositories.Entities;
using ModelViews.LeaveLedgerModelView;

namespace M.Services.Mappings
{
    public static class LeaveLedgerMapping
    {
        // Entity -> LeaveLedgerResponseModelView
        public static LeaveLedgerResponseModelView ToViewModel(this LeaveLedger? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            var model = new LeaveLedgerResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeCode = entity.Employee?.EmployeeCode,
                EmployeeName = entity.Employee?.FullName,

                Year = entity.Year,

                LeaveTypeId = entity.LeaveTypeId,
                LeaveTypeCode = entity.LeaveType?.Code,
                LeaveTypeName = entity.LeaveType?.Name,

                EntryType = entity.EntryType,
                Days = entity.Days,

                LeaveRequestId = entity.LeaveRequestId,
                LeaveRequestReason = entity.LeaveRequest?.Reason,

                Reason = entity.Reason,

                CreatedTime = entity.CreatedTime,
                CreatedBy = entity.CreatedBy
            };

            return model;
        }

        // CreateLeaveLedgerEntryModelView -> Entity
        public static LeaveLedger ToEntity(this CreateLeaveLedgerEntryModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new LeaveLedger
            {
                EmployeeId = model.EmployeeId,
                Year = model.Year,
                LeaveTypeId = model.LeaveTypeId,
                EntryType = model.EntryType,
                Days = model.Days,
                LeaveRequestId = model.LeaveRequestId,
                Reason = model.Reason
            };

            return entity;
        }
    }
}
