using M.Contract.Repositories.Entities;
using ModelViews.EmployeeShiftModelView;

namespace M.Services.Mappings
{
    public static class EmployeeShiftMapping
    {
        // Entity -> EmployeeShiftResponseModelView
        public static EmployeeShiftResponseModelView ToViewModel(
            this EmployeeShift? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new EmployeeShiftResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeName = entity.Employee?.FullName,
                ShiftId = entity.ShiftId,
                ShiftName = entity.Shift?.Name,
                EffectiveFrom = entity.EffectiveFrom,
                EffectiveTo = entity.EffectiveTo,
                Note = entity.Note,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // CreateEmployeeShiftModelView -> Entity
        public static EmployeeShift ToEntity(this CreateEmployeeShiftModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeShift
            {
                EmployeeId = model.EmployeeId,
                ShiftId = model.ShiftId,
                EffectiveFrom = model.EffectiveFrom,
                EffectiveTo = model.EffectiveTo,
                Note = model.Note
            };

            return entity;
        }

        // UpdateEmployeeShiftModelView -> Entity
        public static void ToEntity(
            this UpdateEmployeeShiftModelView model,
            EmployeeShift entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.ShiftId = model.ShiftId;
            entity.EffectiveFrom = model.EffectiveFrom;
            entity.EffectiveTo = model.EffectiveTo;

            entity.Note = model.Note == string.Empty
                ? string.Empty
                : model.Note == null
                    ? entity.Note
                    : model.Note;
        }
    }
}
