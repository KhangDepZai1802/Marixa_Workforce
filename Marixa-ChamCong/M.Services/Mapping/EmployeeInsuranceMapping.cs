using M.Contract.Repositories.Entities;
using ModelViews.EmployeeInsuranceModelView;

namespace M.Services.Mappings
{
    public static class EmployeeInsuranceMapping
    {
        // Mapping Entity -> EmployeeInsuranceResponseModelView
        public static EmployeeInsuranceResponseModelView ToViewModel(
            this EmployeeInsurance? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new EmployeeInsuranceResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeName = entity.Employee?.FullName,
                SocialInsuranceNumber = entity.SocialInsuranceNumber,
                HealthInsuranceNumber = entity.HealthInsuranceNumber,
                PersonalTaxCode = entity.PersonalTaxCode,
                IsSocialInsuranceParticipant = entity.IsSocialInsuranceParticipant,
                ParticipationStartDate = entity.ParticipationStartDate,
                ParticipationEndDate = entity.ParticipationEndDate,
                SocialInsuranceSalary = entity.SocialInsuranceSalary,
                Status = entity.Status,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping EmployeeInsuranceResponseModelView -> Entity
        public static EmployeeInsurance ToEntity(
            this EmployeeInsuranceResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeInsurance
            {
                Id = model.Id,
                EmployeeId = model.EmployeeId,
                SocialInsuranceNumber = model.SocialInsuranceNumber,
                HealthInsuranceNumber = model.HealthInsuranceNumber,
                PersonalTaxCode = model.PersonalTaxCode,
                IsSocialInsuranceParticipant = model.IsSocialInsuranceParticipant,
                ParticipationStartDate = model.ParticipationStartDate,
                ParticipationEndDate = model.ParticipationEndDate,
                SocialInsuranceSalary = model.SocialInsuranceSalary,
                Status = model.Status,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateEmployeeInsuranceModelView -> Entity
        public static EmployeeInsurance ToEntity(
            this CreateEmployeeInsuranceModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeInsurance
            {
                EmployeeId = model.EmployeeId,
                SocialInsuranceNumber = model.SocialInsuranceNumber,
                HealthInsuranceNumber = model.HealthInsuranceNumber,
                PersonalTaxCode = model.PersonalTaxCode,
                IsSocialInsuranceParticipant = model.IsSocialInsuranceParticipant,
                ParticipationStartDate = model.ParticipationStartDate,
                ParticipationEndDate = model.ParticipationEndDate,
                SocialInsuranceSalary = model.SocialInsuranceSalary,
                Status = model.Status
            };

            return entity;
        }

        // Mapping UpdateEmployeeInsuranceModelView -> Entity
        public static void ToEntity(
            this UpdateEmployeeInsuranceModelView model,
            EmployeeInsurance entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.SocialInsuranceNumber = model.SocialInsuranceNumber;
            entity.HealthInsuranceNumber = model.HealthInsuranceNumber;
            entity.PersonalTaxCode = model.PersonalTaxCode;
            entity.IsSocialInsuranceParticipant = model.IsSocialInsuranceParticipant;
            entity.ParticipationStartDate = model.ParticipationStartDate;
            entity.ParticipationEndDate = model.ParticipationEndDate;
            entity.SocialInsuranceSalary = model.SocialInsuranceSalary;
            entity.Status = model.Status;
        }
    }
}