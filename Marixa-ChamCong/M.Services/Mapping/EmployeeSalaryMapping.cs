using M.Contract.Repositories.Entities;
using ModelViews.EmployeeSalaryModelView;

namespace M.Services.Mappings
{
    public static class EmployeeSalaryMapping
    {
        // Mapping Entity -> EmployeeSalaryResponseModelView
        public static EmployeeSalaryResponseModelView ToViewModel(
            this EmployeeSalary? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new EmployeeSalaryResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeName = entity.Employee?.FullName,
                SalaryGroupId = entity.SalaryGroupId,
                SalaryGroupName = entity.SalaryGroup?.Name,
                PaymentType = entity.PaymentType,
                BasicSalary = entity.BasicSalary,
                DailyRate = entity.DailyRate,
                PositionAllowance = entity.PositionAllowance,
                OtherAllowance = entity.OtherAllowance,
                Bonus = entity.Bonus,
                SocialInsuranceSalary = entity.SocialInsuranceSalary,
                EffectiveFrom = entity.EffectiveFrom,
                EffectiveTo = entity.EffectiveTo,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping EmployeeSalaryResponseModelView -> Entity
        public static EmployeeSalary ToEntity(
            this EmployeeSalaryResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeSalary
            {
                Id = model.Id,
                EmployeeId = model.EmployeeId,
                SalaryGroupId = model.SalaryGroupId,
                PaymentType = model.PaymentType,
                BasicSalary = model.BasicSalary,
                DailyRate = model.DailyRate,
                PositionAllowance = model.PositionAllowance,
                OtherAllowance = model.OtherAllowance,
                Bonus = model.Bonus,
                SocialInsuranceSalary = model.SocialInsuranceSalary,
                EffectiveFrom = model.EffectiveFrom,
                EffectiveTo = model.EffectiveTo,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateEmployeeSalaryModelView -> Entity
        public static EmployeeSalary ToEntity(
            this CreateEmployeeSalaryModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeSalary
            {
                EmployeeId = model.EmployeeId,
                SalaryGroupId = model.SalaryGroupId,
                PaymentType = model.PaymentType,
                BasicSalary = model.BasicSalary,
                DailyRate = model.DailyRate,
                PositionAllowance = model.PositionAllowance,
                OtherAllowance = model.OtherAllowance,
                Bonus = model.Bonus,
                SocialInsuranceSalary = model.SocialInsuranceSalary,
                EffectiveFrom = model.EffectiveFrom,
                EffectiveTo = model.EffectiveTo
            };

            return entity;
        }

        // Mapping UpdateEmployeeSalaryModelView -> Entity
        public static void ToEntity(
            this UpdateEmployeeSalaryModelView model,
            EmployeeSalary entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.SalaryGroupId = model.SalaryGroupId;
            entity.PaymentType = model.PaymentType;
            entity.BasicSalary = model.BasicSalary;
            entity.DailyRate = model.DailyRate;
            entity.PositionAllowance = model.PositionAllowance;
            entity.OtherAllowance = model.OtherAllowance;
            entity.Bonus = model.Bonus;
            entity.SocialInsuranceSalary = model.SocialInsuranceSalary;
            entity.EffectiveFrom = model.EffectiveFrom;
            entity.EffectiveTo = model.EffectiveTo;
        }
    }
}