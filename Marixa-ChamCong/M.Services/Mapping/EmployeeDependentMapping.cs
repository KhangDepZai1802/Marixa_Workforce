using M.Contract.Repositories.Entities;
using ModelViews.EmployeeDependentModelView;

namespace M.Services.Mappings
{
    public static class EmployeeDependentMapping
    {
        // Mapping Entity -> EmployeeDependentResponseModelView
        public static EmployeeDependentResponseModelView ToViewModel(
            this EmployeeDependent? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new EmployeeDependentResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeName = entity.Employee?.FullName,
                GivenName = entity.GivenName,
                FamilyName = entity.FamilyName,
                Relationship = entity.Relationship,
                BirthDate = entity.BirthDate,
                CitizenId = entity.CitizenId,
                TaxIdentificationNumber = entity.TaxIdentificationNumber,
                EffectiveFrom = entity.EffectiveFrom,
                EffectiveTo = entity.EffectiveTo,
                Status = entity.Status,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping EmployeeDependentResponseModelView -> Entity
        public static EmployeeDependent ToEntity(
            this EmployeeDependentResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeDependent
            {
                Id = model.Id,
                EmployeeId = model.EmployeeId,
                GivenName = model.GivenName,
                FamilyName = model.FamilyName,
                Relationship = model.Relationship,
                BirthDate = model.BirthDate,
                CitizenId = model.CitizenId,
                TaxIdentificationNumber = model.TaxIdentificationNumber,
                EffectiveFrom = model.EffectiveFrom,
                EffectiveTo = model.EffectiveTo,
                Status = model.Status,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateEmployeeDependentModelView -> Entity
        public static EmployeeDependent ToEntity(
            this CreateEmployeeDependentModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeDependent
            {
                EmployeeId = model.EmployeeId,
                GivenName = model.GivenName,
                FamilyName = model.FamilyName,
                Relationship = model.Relationship,
                BirthDate = model.BirthDate,
                CitizenId = model.CitizenId,
                TaxIdentificationNumber = model.TaxIdentificationNumber,
                EffectiveFrom = model.EffectiveFrom,
                EffectiveTo = model.EffectiveTo,
                Status = model.Status
            };

            return entity;
        }

        // Mapping UpdateEmployeeDependentModelView -> Entity
        public static void ToEntity(
            this UpdateEmployeeDependentModelView model,
            EmployeeDependent entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.GivenName = model.GivenName;
            entity.FamilyName = model.FamilyName;

            entity.Relationship = model.Relationship == string.Empty
                ? string.Empty
                : model.Relationship == null
                    ? entity.Relationship
                    : model.Relationship;

            entity.BirthDate = model.BirthDate;

            entity.CitizenId = model.CitizenId == string.Empty
                ? string.Empty
                : model.CitizenId == null
                    ? entity.CitizenId
                    : model.CitizenId;

            entity.TaxIdentificationNumber =
                model.TaxIdentificationNumber == string.Empty
                    ? string.Empty
                    : model.TaxIdentificationNumber == null
                        ? entity.TaxIdentificationNumber
                        : model.TaxIdentificationNumber;

            entity.EffectiveFrom = model.EffectiveFrom;
            entity.EffectiveTo = model.EffectiveTo;
            entity.Status = model.Status;
        }
    }
}