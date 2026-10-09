using M.Contract.Repositories.Entities;
using ModelViews.PayrollModelView;

namespace M.Services.Mappings
{
    public static class PayrollMapping
    {
        // Mapping Entity -> PayrollResponseModelView
        public static PayrollResponseModelView ToViewModel(
            this Payroll? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new PayrollResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeName = entity.Employee?.FullName,
                PayrollMonth = entity.PayrollMonth,
                BasicSalary = entity.BasicSalary,
                Allowance = entity.Allowance,
                Bonus = entity.Bonus,
                Overtime = entity.Overtime,
                Insurance = entity.Insurance,
                Tax = entity.Tax,
                Deduction = entity.Deduction,
                NetSalary = entity.NetSalary,
                Status = entity.Status,
                PayDate = entity.PayDate,
                PaymentMethod = entity.PaymentMethod,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping CreatePayrollModelView -> Entity
        public static Payroll ToEntity(
            this CreatePayrollModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new Payroll
            {
                EmployeeId = model.EmployeeId,
                PayrollMonth = model.PayrollMonth,
                BasicSalary = model.BasicSalary,
                Allowance = model.Allowance,
                Bonus = model.Bonus,
                Overtime = model.Overtime,
                Insurance = model.Insurance,
                Tax = model.Tax,
                Deduction = model.Deduction,
                NetSalary = model.NetSalary,
                Status = model.Status,
                PayDate = model.PayDate,
                PaymentMethod = model.PaymentMethod
            };

            return entity;
        }

        // Mapping UpdatePayrollModelView -> Entity
        public static void ToEntity(
            this UpdatePayrollModelView model,
            Payroll entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.PayrollMonth = model.PayrollMonth;
            entity.BasicSalary = model.BasicSalary;
            entity.Allowance = model.Allowance;
            entity.Bonus = model.Bonus;
            entity.Overtime = model.Overtime;
            entity.Insurance = model.Insurance;
            entity.Tax = model.Tax;
            entity.Deduction = model.Deduction;
            entity.NetSalary = model.NetSalary;
            entity.Status = model.Status;
            entity.PayDate = model.PayDate;
            entity.PaymentMethod = model.PaymentMethod;
        }
    }
}
