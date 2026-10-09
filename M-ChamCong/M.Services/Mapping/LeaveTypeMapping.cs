using M.Contract.Repositories.Entities;
using ModelViews.LeaveTypeModelView;

namespace M.Services.Mappings
{
    public static class LeaveTypeMapping
    {
        // Mapping Entity -> LeaveTypeResponseModelView
        public static LeaveTypeResponseModelView ToViewModel(
            this LeaveType? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new LeaveTypeResponseModelView
            {
                Id = entity.Id,
                Code = entity.Code,
                Name = entity.Name,
                MaxDays = entity.MaxDays,
                IsPaid = entity.IsPaid,
                IsActive = entity.IsActive,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping LeaveTypeResponseModelView -> Entity
        public static LeaveType ToEntity(
            this LeaveTypeResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new LeaveType
            {
                Id = model.Id,
                Code = model.Code,
                Name = model.Name,
                MaxDays = model.MaxDays,
                IsPaid = model.IsPaid,
                IsActive = model.IsActive,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateLeaveTypeModelView -> Entity
        public static LeaveType ToEntity(
            this CreateLeaveTypeModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new LeaveType
            {
                Code = model.Code,
                Name = model.Name,
                MaxDays = model.MaxDays,
                IsPaid = model.IsPaid,
                IsActive = model.IsActive
            };

            return entity;
        }

        // Mapping UpdateLeaveTypeModelView -> Entity
        public static void ToEntity(
            this UpdateLeaveTypeModelView model,
            LeaveType entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.Code = model.Code;
            entity.Name = model.Name;
            entity.MaxDays = model.MaxDays;
            entity.IsPaid = model.IsPaid;
            entity.IsActive = model.IsActive;
        }
    }
}