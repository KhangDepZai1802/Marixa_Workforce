using M.Contract.Repositories.Entities;
using ModelViews.AuditLogModelView;

namespace M.Services.Mappings
{
    public static class AuditLogMapping
    {
        // Entity -> AuditLogResponseModelView
        public static AuditLogResponseModelView ToViewModel(this AuditLog? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            var model = new AuditLogResponseModelView
            {
                Id = entity.Id,

                ActorUserName = entity.ActorUserName,
                ActorEmployeeId = entity.ActorEmployeeId,
                ActorEmployeeCode = entity.ActorEmployee?.EmployeeCode,
                ActorEmployeeName = entity.ActorEmployee?.FullName,

                Action = entity.Action,
                EntityType = entity.EntityType,
                EntityId = entity.EntityId,

                BeforeJson = entity.BeforeJson,
                AfterJson = entity.AfterJson,
                Reason = entity.Reason,

                CreatedTime = entity.CreatedTime
            };

            return model;
        }

        // CreateAuditLogModelView -> Entity
        public static AuditLog ToEntity(this CreateAuditLogModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new AuditLog
            {
                Action = model.Action,
                EntityType = model.EntityType,
                EntityId = model.EntityId,

                ActorUserName = model.ActorUserName,
                ActorEmployeeId = model.ActorEmployeeId,

                BeforeJson = model.BeforeJson,
                AfterJson = model.AfterJson,
                Reason = model.Reason
            };

            return entity;
        }
    }
}
