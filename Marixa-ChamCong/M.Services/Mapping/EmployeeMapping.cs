using M.Contract.Repositories.Entities;
using ModelViews.EmployeeModelView;

namespace M.Services.Mappings
{
    public static class EmployeeMapping
    {
        // Mapping Entity -> EmployeeResponseModelView
        public static EmployeeResponseModelView ToViewModel(this Employee? entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            var model = new EmployeeResponseModelView
            {
                Id = entity.Id,
                EmployeeCode = entity.EmployeeCode,
                GivenName = entity.GivenName,
                FamilyName = entity.FamilyName,
                BirthDate = entity.BirthDate,
                Gender = entity.Gender,
                CitizenId = entity.CitizenId,
                CitizenIdIssuedDate = entity.CitizenIdIssuedDate,
                CitizenIdIssuedPlace = entity.CitizenIdIssuedPlace,
                PhoneNumber = entity.PhoneNumber,
                Email = entity.Email,
                PermanentAddress = entity.PermanentAddress,
                CurrentAddress = entity.CurrentAddress,
                UserId = entity.UserId,
                DepartmentId = entity.DepartmentId,
                DepartmentManagerId = entity.Department?.ManagerId,
                DepartmentName = entity.Department?.Name,
                PositionId = entity.PositionId,
                PositionName = entity.Position?.Name,
                ManagerId = entity.ManagerId,
                ManagerName = entity.Manager?.FullName,
                StartDate = entity.StartDate,
                ProbationEndDate = entity.ProbationEndDate,
                LaborType = entity.LaborType,
                Status = entity.Status,
                UsePhoneAttendance = entity.UsePhoneAttendance,
                Note = entity.Note,
                CreatedTime = entity.CreatedTime,
                LastUpdatedTime = entity.LastUpdatedTime
            };

            return model;
        }

        // Mapping EmployeeResponseModelView -> Entity
        public static Employee ToEntity(this EmployeeResponseModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new Employee
            {
                Id = model.Id,
                EmployeeCode = model.EmployeeCode,
                GivenName = model.GivenName,
                FamilyName = model.FamilyName,
                BirthDate = model.BirthDate,
                Gender = model.Gender,
                CitizenId = model.CitizenId,
                CitizenIdIssuedDate = model.CitizenIdIssuedDate,
                CitizenIdIssuedPlace = model.CitizenIdIssuedPlace,
                PhoneNumber = model.PhoneNumber,
                Email = model.Email,
                PermanentAddress = model.PermanentAddress,
                CurrentAddress = model.CurrentAddress,
                UserId = model.UserId,
                DepartmentId = model.DepartmentId,
                PositionId = model.PositionId,
                ManagerId = model.ManagerId,
                StartDate = model.StartDate,
                ProbationEndDate = model.ProbationEndDate,
                LaborType = model.LaborType,
                Status = model.Status,
                UsePhoneAttendance = model.UsePhoneAttendance,
                Note = model.Note,
                CreatedTime = model.CreatedTime,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // Mapping CreateEmployeeModelView -> Entity
        public static Employee ToEntity(this CreateEmployeeModelView model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var entity = new Employee
            {
                EmployeeCode = model.EmployeeCode,
                GivenName = model.GivenName,
                FamilyName = model.FamilyName,
                BirthDate = model.BirthDate,
                Gender = model.Gender,
                CitizenId = model.CitizenId,
                CitizenIdIssuedDate = model.CitizenIdIssuedDate,
                CitizenIdIssuedPlace = model.CitizenIdIssuedPlace,
                PhoneNumber = model.PhoneNumber,
                Email = model.Email,
                PermanentAddress = model.PermanentAddress,
                CurrentAddress = model.CurrentAddress,
                UserId = model.UserId,
                DepartmentId = model.DepartmentId,
                PositionId = model.PositionId,
                ManagerId = model.ManagerId,
                StartDate = model.StartDate,
                ProbationEndDate = model.ProbationEndDate,
                LaborType = model.LaborType,
                Status = model.Status,
                UsePhoneAttendance = model.UsePhoneAttendance,
                Note = model.Note
            };

            return entity;
        }

        // Mapping UpdateEmployeeModelView -> Entity
        public static void ToEntity(
            this UpdateEmployeeModelView model,
            Employee entity)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));
            if (entity == null) throw new ArgumentNullException(nameof(entity));

            entity.EmployeeCode = model.EmployeeCode;
            entity.GivenName = model.GivenName;
            entity.FamilyName = model.FamilyName;
            entity.BirthDate = model.BirthDate;
            entity.Gender = model.Gender;
            entity.CitizenId = model.CitizenId;
            entity.CitizenIdIssuedDate = model.CitizenIdIssuedDate;
            entity.CitizenIdIssuedPlace = model.CitizenIdIssuedPlace;
            entity.PhoneNumber = model.PhoneNumber;
            entity.Email = model.Email;
            entity.PermanentAddress = model.PermanentAddress;
            entity.CurrentAddress = model.CurrentAddress;
            entity.UserId = model.UserId;
            entity.DepartmentId = model.DepartmentId;
            entity.PositionId = model.PositionId;
            entity.ManagerId = model.ManagerId;
            entity.StartDate = model.StartDate;
            entity.ProbationEndDate = model.ProbationEndDate;
            entity.LaborType = model.LaborType;
            entity.Status = model.Status;
            entity.UsePhoneAttendance = model.UsePhoneAttendance;
            entity.Note = model.Note;
        }
    }
}
