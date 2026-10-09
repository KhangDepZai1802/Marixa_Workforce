using M.Contract.Repositories.Entities;
using ModelViews.OfficeLocationModelView;

namespace M.Services.Mappings
{
    public static class OfficeLocationMapping
    {
        // Entity -> OfficeLocationResponseModelView
        public static OfficeLocationResponseModelView ToViewModel(this OfficeLocation? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            var model = new OfficeLocationResponseModelView
            {
                Id = entity.Id,
                Name = entity.Name,
                Description = entity.Description,

                Latitude = entity.Latitude,
                Longitude = entity.Longitude,
                RadiusMeters = entity.RadiusMeters,

                IsPrimary = entity.IsPrimary,
                IsActive = entity.IsActive,

                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // CreateOfficeLocationModelView -> Entity
        public static OfficeLocation ToEntity(this CreateOfficeLocationModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new OfficeLocation
            {
                Name = model.Name,
                Description = model.Description,
                Latitude = model.Latitude,
                Longitude = model.Longitude,
                RadiusMeters = model.RadiusMeters,
                IsPrimary = model.IsPrimary,
                IsActive = model.IsActive
            };

            return entity;
        }

        // UpdateOfficeLocationModelView -> Entity (in-place)
        public static void ToEntity(this UpdateOfficeLocationModelView model, OfficeLocation entity)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            entity.Name = model.Name;
            entity.Description = model.Description;
            entity.Latitude = model.Latitude;
            entity.Longitude = model.Longitude;
            entity.RadiusMeters = model.RadiusMeters;
            entity.IsPrimary = model.IsPrimary;
            entity.IsActive = model.IsActive;
        }
    }
}
