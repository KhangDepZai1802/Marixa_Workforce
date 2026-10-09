using M.Contract.Repositories.Entities;
using ModelViews.EmployeeBankAccountModelView;

namespace M.Services.Mappings
{
    public static class EmployeeBankAccountMapping
    {
        // Mapping Entity -> EmployeeBankAccountResponseModelView
        public static EmployeeBankAccountResponseModelView ToViewModel(
            this EmployeeBankAccount? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new EmployeeBankAccountResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeName = entity.Employee?.FullName,
                BankId = entity.BankId,
                BankName = entity.Bank?.Name,
                AccountNumber = entity.AccountNumber,
                AccountHolderName = entity.AccountHolderName,
                IsPrimary = entity.IsPrimary,
                Status = entity.Status,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping EmployeeBankAccountResponseModelView -> Entity
        public static EmployeeBankAccount ToEntity(
            this EmployeeBankAccountResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeBankAccount
            {
                Id = model.Id,
                EmployeeId = model.EmployeeId,
                BankId = model.BankId,
                AccountNumber = model.AccountNumber,
                AccountHolderName = model.AccountHolderName,
                IsPrimary = model.IsPrimary,
                Status = model.Status,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateEmployeeBankAccountModelView -> Entity
        public static EmployeeBankAccount ToEntity(
            this CreateEmployeeBankAccountModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeBankAccount
            {
                EmployeeId = model.EmployeeId,
                BankId = model.BankId,
                AccountNumber = model.AccountNumber,
                AccountHolderName = model.AccountHolderName,
                IsPrimary = model.IsPrimary,
                Status = model.Status
            };

            return entity;
        }

        // Mapping UpdateEmployeeBankAccountModelView -> Entity
        public static void ToEntity(
            this UpdateEmployeeBankAccountModelView model,
            EmployeeBankAccount entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.BankId = model.BankId;
            entity.AccountNumber = model.AccountNumber;

            entity.AccountHolderName = model.AccountHolderName == string.Empty
                ? string.Empty
                : model.AccountHolderName == null
                    ? entity.AccountHolderName
                    : model.AccountHolderName;

            entity.IsPrimary = model.IsPrimary;
            entity.Status = model.Status;
        }
    }
}