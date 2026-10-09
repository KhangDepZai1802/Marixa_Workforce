using M.Contract.Repositories.Entities;
using ModelViews.BankModelView;

namespace M.Services.Mappings
{
    public static class BankMapping
    {
        // Mapping Entity -> BankResponseModelView
        public static BankResponseModelView ToViewModel(this Bank? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            var model = new BankResponseModelView
            {
                Id = entity.Id,
                Code = entity.Code,
                Name = entity.Name,
                ShortName = entity.ShortName,
                IsActive = entity.IsActive,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping BankResponseModelView -> Entity
        public static Bank ToEntity(this BankResponseModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new Bank
            {
                Id = model.Id,
                Code = model.Code,
                Name = model.Name,
                ShortName = model.ShortName,
                IsActive = model.IsActive,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateBankModelView -> Entity
        public static Bank ToEntity(this CreateBankModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new Bank
            {
                Code = model.Code,
                Name = model.Name,
                ShortName = model.ShortName,
                IsActive = model.IsActive
            };

            return entity;
        }

        // Mapping UpdateBankModelView -> Entity
        public static void ToEntity(
            this UpdateBankModelView model,
            Bank entity)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            entity.Code = model.Code;
            entity.Name = model.Name;

            entity.ShortName = model.ShortName == string.Empty
                ? string.Empty
                : model.ShortName == null
                    ? entity.ShortName
                    : model.ShortName;

            entity.IsActive = model.IsActive;
        }
    }
}