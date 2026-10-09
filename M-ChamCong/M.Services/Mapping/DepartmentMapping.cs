
using M.Contract.Repositories.Entities;
using ModelViews.DepartmentModelView;

namespace Services.Mappings
{
    public static class DepartmentMapping
    {
        public static DepartmentResponseModelView ToViewModel(this Department department)
        {
            return new DepartmentResponseModelView
            {
                Id = department.Id,
                Code = department.Code,
                Name = department.Name,
                Description = department.Description,
                ManagerId = department.ManagerId,
                ManagerName = department.Manager?.FullName,
                IsActive = department.IsActive,
                CreatedTime = department.CreatedTime,
                LastUpdatedTime = department.LastUpdatedTime
            };
        }


        public static void ToEntity(
            this CreateDepartmentModelView model,
            Department department)
        {
            department.Code = model.Code.Trim();
            department.Name = model.Name.Trim();
            department.Description = model.Description?.Trim();
            department.ManagerId = model.ManagerId;
            department.IsActive = model.IsActive;
        }


        public static void ToEntity(
            this UpdateDepartmentModelView model,
            Department department)
        {
            department.Code = model.Code.Trim();
            department.Name = model.Name.Trim();
            department.Description = model.Description?.Trim();
            department.ManagerId = model.ManagerId;
            department.IsActive = model.IsActive;
        }
    }
}