using M.Contract.Repositories.Entities;
using ModelViews.EmployeeContractModelView;

namespace M.Services.Mappings
{
    public static class EmployeeContractMapping
    {
        // Mapping Entity -> EmployeeContractResponseModelView
        public static EmployeeContractResponseModelView ToViewModel(
            this EmployeeContract? entity)
        {
            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            var model = new EmployeeContractResponseModelView
            {
                Id = entity.Id,
                EmployeeId = entity.EmployeeId,
                EmployeeName = entity.Employee?.FullName,
                ContractNumber = entity.ContractNumber,
                ContractType = entity.ContractType,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                Note = entity.Note,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping EmployeeContractResponseModelView -> Entity
        public static EmployeeContract ToEntity(
            this EmployeeContractResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeContract
            {
                Id = model.Id,
                EmployeeId = model.EmployeeId,
                ContractNumber = model.ContractNumber,
                ContractType = model.ContractType,
                StartDate = model.StartDate,
                EndDate = model.EndDate,
                Note = model.Note,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateEmployeeContractModelView -> Entity
        public static EmployeeContract ToEntity(
            this CreateEmployeeContractModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new EmployeeContract
            {
                EmployeeId = model.EmployeeId,
                ContractNumber = model.ContractNumber,
                ContractType = model.ContractType,
                StartDate = model.StartDate,
                EndDate = model.EndDate,
                Note = model.Note
            };

            return entity;
        }

        // Mapping UpdateEmployeeContractModelView -> Entity
        public static void ToEntity(
            this UpdateEmployeeContractModelView model,
            EmployeeContract entity)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (entity == null)
                throw new ArgumentNullException(nameof(entity));

            entity.EmployeeId = model.EmployeeId;
            entity.ContractNumber = model.ContractNumber;
            entity.ContractType = model.ContractType;
            entity.StartDate = model.StartDate;
            entity.EndDate = model.EndDate;

            entity.Note = model.Note == string.Empty
                ? string.Empty
                : model.Note == null
                    ? entity.Note
                    : model.Note;
        }
    }
}