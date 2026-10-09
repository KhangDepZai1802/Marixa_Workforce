using M.Contract.Repositories.Entity;
using ModelViews.ActivationCodeModelView;

namespace M.Services.Mappings
{
    public static class ActivationCodeMapping
    {
        // Entity -> ActivationCodeResponseModelView
        public static ActivationCodeResponseModelView ToViewModel(
            this ActivationCode? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new ActivationCodeResponseModelView
            {
                Id = entity.Id,
                Code = entity.Code,
                EmployeeId = entity.EmployeeId,
                EmployeeName = entity.Employee?.FullName,
                UserId = entity.UserId,
                ExpiresAt = entity.ExpiresAt,
                UsedAt = entity.UsedAt,
                ActivatedBy = entity.ActivatedBy,
                CreatedBy = entity.CreatedBy,
                IsUsed = entity.IsUsed,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // CreateActivationCodeModelView -> Entity
        public static ActivationCode ToEntity(this CreateActivationCodeModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new ActivationCode
            {
                Code = model.Code,
                EmployeeId = model.EmployeeId,
                ExpiresAt = DateTime.UtcNow.AddMinutes(model.ValidMinutes ?? 1440)
            };

            return entity;
        }

        // UpdateActivationCodeModelView -> Entity
        public static void ToEntity(
            this UpdateActivationCodeModelView model,
            ActivationCode entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.Code = model.Code;

            if (model.ExpiresAt.HasValue)
                entity.ExpiresAt = model.ExpiresAt.Value;
        }
    }
}
