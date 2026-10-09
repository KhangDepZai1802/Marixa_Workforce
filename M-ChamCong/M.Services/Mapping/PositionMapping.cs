using M.Contract.Repositories.Entities;
using ModelViews.PositionModelView;

namespace M.Services.Mappings
{
    public static class PositionMapping
    {
        // Mapping Entity -> PositionResponseModelView
        public static PositionResponseModelView ToViewModel(
            this Position? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new PositionResponseModelView
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

        // Mapping PositionResponseModelView -> Entity
        public static Position ToEntity(
            this PositionResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new Position
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

        // Mapping CreatePositionModelView -> Entity
        public static Position ToEntity(
            this CreatePositionModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new Position
            {
                Code = model.Code,
                Name = model.Name,
                Description = model.Description,
                IsActive = model.IsActive
            };

            return entity;
        }

        // Mapping UpdatePositionModelView -> Entity
        public static void ToEntity(
            this UpdatePositionModelView model,
            Position entity)
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