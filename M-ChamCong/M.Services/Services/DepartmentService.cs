using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Serivces.Interface;
using M.Core.Base;
using M.Core.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.DepartmentModelView;
using Services.Mappings;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public DepartmentService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }


        // =========================================================
        // GET ALL
        // =========================================================

        public async Task<BasePaginatedList<DepartmentResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<Department> repo =
                _unitOfWork.GetRepository<Department>();

            IQueryable<Department> query = repo.Entities
                .Include(x => x.Manager)
                .Where(x => !x.DeletedTime.HasValue)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<Department> departments = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<DepartmentResponseModelView> result = departments
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<DepartmentResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize
            );
        }


        // =========================================================
        // GET BY ID
        // =========================================================

        public async Task<DepartmentResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<Department> repo =
                _unitOfWork.GetRepository<Department>();

            Department department = await repo.Entities
                .Include(x => x.Manager)
                .Where(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Department not found"
                );

            return department.ToViewModel();
        }


        // =========================================================
        // CREATE
        // =========================================================

        public async Task CreateAsync(CreateDepartmentModelView model)
        {
            IGenericRepository<Department> repo =
                _unitOfWork.GetRepository<Department>();


            // -----------------------------------------------------
            // Kiểm tra Code trùng
            // -----------------------------------------------------

            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Code == model.Code.Trim() &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Department code already exists"
                );
            }


            // -----------------------------------------------------
            // Kiểm tra Manager
            // -----------------------------------------------------

            if (model.ManagerId.HasValue)
            {
                IGenericRepository<Employee> employeeRepo =
                    _unitOfWork.GetRepository<Employee>();

                bool managerExists = await employeeRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.ManagerId.Value &&
                        !x.DeletedTime.HasValue);

                if (!managerExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status400BadRequest,
                        "INVALID_MANAGER",
                        "Manager not found"
                    );
                }
            }


            // -----------------------------------------------------
            // Audit
            // -----------------------------------------------------

            string currentUsername =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";


            // -----------------------------------------------------
            // Create entity
            // -----------------------------------------------------

            Department department = new Department
            {
                Code = model.Code.Trim(),
                Name = model.Name.Trim(),
                Description = model.Description?.Trim(),
                ManagerId = model.ManagerId,
                IsActive = model.IsActive,

                CreatedBy = currentUsername,
                CreatedTime = CoreHelper.SystemTimeNow,

                LastUpdatedBy = currentUsername,
                LastUpdatedTime = CoreHelper.SystemTimeNow
            };

            await repo.InsertAsync(department);

            await _unitOfWork.SaveAsync();
        }


        // =========================================================
        // UPDATE
        // =========================================================

        public async Task UpdateAsync(UpdateDepartmentModelView model)
        {
            IGenericRepository<Department> repo =
                _unitOfWork.GetRepository<Department>();


            // -----------------------------------------------------
            // Tìm Department
            // -----------------------------------------------------

            Department department = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Department not found"
                );


            // -----------------------------------------------------
            // Kiểm tra Code trùng
            // -----------------------------------------------------

            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Id != model.Id &&
                    x.Code == model.Code.Trim() &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Department code already exists"
                );
            }


            // -----------------------------------------------------
            // Kiểm tra Manager
            // -----------------------------------------------------

            if (model.ManagerId.HasValue)
            {
                IGenericRepository<Employee> employeeRepo =
                    _unitOfWork.GetRepository<Employee>();

                bool managerExists = await employeeRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.ManagerId.Value &&
                        !x.DeletedTime.HasValue);

                if (!managerExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status400BadRequest,
                        "INVALID_MANAGER",
                        "Manager not found"
                    );
                }
            }


            // -----------------------------------------------------
            // Audit
            // -----------------------------------------------------

            string currentUsername =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            department.LastUpdatedBy = currentUsername;
            department.LastUpdatedTime = CoreHelper.SystemTimeNow;


            // -----------------------------------------------------
            // Update
            // -----------------------------------------------------

            department.Code = model.Code.Trim();
            department.Name = model.Name.Trim();
            department.Description = model.Description?.Trim();
            department.ManagerId = model.ManagerId;
            department.IsActive = model.IsActive;

            await repo.UpdateAsync(department);

            await _unitOfWork.SaveAsync();
        }


        // =========================================================
        // SOFT DELETE
        // =========================================================

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<Department> repo =
                _unitOfWork.GetRepository<Department>();

            Department department = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Department not found"
                );


            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            department.DeletedBy = currentUser;
            department.DeletedTime = CoreHelper.SystemTimeNow;


            await repo.UpdateAsync(department);

            await _unitOfWork.SaveAsync();
        }


        // =========================================================
        // HARD DELETE
        // =========================================================

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<Department> repo =
                _unitOfWork.GetRepository<Department>();

            Department department = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Department not found"
                );


            await repo.DeleteAsync(department);

            await _unitOfWork.SaveAsync();
        }
    }
}