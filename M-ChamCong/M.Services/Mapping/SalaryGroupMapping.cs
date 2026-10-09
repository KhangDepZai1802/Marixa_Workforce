using M.Contract.Repositories.Entities;
using ModelViews.SalaryGroupModelView;

namespace M.Services.Mappings
{
    public static class SalaryGroupMapping
    {
        // Mapping Entity -> SalaryGroupResponseModelView
        public static SalaryGroupResponseModelView ToViewModel(
            this SalaryGroup? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new SalaryGroupResponseModelView
            {
                Id = entity.Id,
                Code = entity.Code,
                Name = entity.Name,
                Description = entity.Description,
                IsActive = entity.IsActive,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping SalaryGroupResponseModelView -> Entity
        public static SalaryGroup ToEntity(
            this SalaryGroupResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new SalaryGroup
            {
                Id = model.Id,
                Code = model.Code,
                Name = model.Name,
                Description = model.Description,
                IsActive = model.IsActive,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateSalaryGroupModelView -> Entity
        public static SalaryGroup ToEntity(
            this CreateSalaryGroupModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new SalaryGroup
            {
                Code = model.Code,
                Name = model.Name,
                Description = model.Description,
                IsActive = model.IsActive
            };

            return entity;
        }

        // Mapping UpdateSalaryGroupModelView -> Entity
        public static void ToEntity(
            this UpdateSalaryGroupModelView model,
            SalaryGroup entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.Code = model.Code;
            entity.Name = model.Name;

            entity.Description = model.Description == string.Empty
                ? string.Empty
                : model.Description == null
                    ? entity.Description
                    : model.Description;

            entity.IsActive = model.IsActive;
        }
    }
}