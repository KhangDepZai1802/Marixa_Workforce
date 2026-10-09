using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.EmployeeModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class EmployeeService : IEmployeeService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EmployeeService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<EmployeeResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<Employee> repo =
                _unitOfWork.GetRepository<Employee>();

            IQueryable<Employee> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .Include(x => x.Department)
                .Include(x => x.Position)
                .Include(x => x.Manager)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<Employee> employees = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<EmployeeResponseModelView> result = employees
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<EmployeeResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<BasePaginatedList<EmployeeResponseModelView>> GetArchivedAsync(int pageNumber, int pageSize)
        {
            IGenericRepository<Employee> repo = _unitOfWork.GetRepository<Employee>();
            var query = repo.Entities
                .Where(x => x.DeletedTime.HasValue)
                .Include(x => x.Department)
                .Include(x => x.Position)
                .Include(x => x.Manager)
                .OrderByDescending(x => x.DeletedTime);
            var totalItems = await query.CountAsync();
            var employees = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
            var result = employees.Select(x => x.ToViewModel()).ToList();
            return new BasePaginatedList<EmployeeResponseModelView>(result.AsReadOnly(), totalItems, pageNumber, pageSize);
        }

        public async Task RestoreAsync(Guid id)
        {
            IGenericRepository<Employee> repo = _unitOfWork.GetRepository<Employee>();
            Employee employee = await repo.Entities.FirstOrDefaultAsync(x => x.Id == id && x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Archived employee not found");

            employee.DeletedBy = null;
            employee.DeletedTime = null;
            employee.LastUpdatedBy = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            employee.LastUpdatedTime = CoreHelper.SystemTimeNow;
            await repo.UpdateAsync(employee);
            await _unitOfWork.SaveAsync();
        }

        public async Task<EmployeeResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<Employee> repo =
                _unitOfWork.GetRepository<Employee>();

            Employee employee = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .Include(x => x.Department)
                .Include(x => x.Position)
                .Include(x => x.Manager)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");

            return employee.ToViewModel();
        }


        public async Task<EmployeeResponseModelView?> GetByUserIdAsync(Guid userId)
        {
            IGenericRepository<Employee> repo =
                _unitOfWork.GetRepository<Employee>();

            Employee? employee = await repo.Entities
                .Where(x =>
                    x.UserId == userId &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Department)
                .Include(x => x.Position)
                .Include(x => x.Manager)
                .FirstOrDefaultAsync();

            return employee?.ToViewModel();
        }
        public async Task<Guid> CreateAsync(CreateEmployeeModelView model)
        {
            if (model.Status == EmployeeStatus.Resigned)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "HANDOVER_REQUIRED",
                    "Employee resignation requires an approved handover request");
            }

            IGenericRepository<Employee> repo =
                _unitOfWork.GetRepository<Employee>();

            // Kiểm tra EmployeeCode
            bool employeeCodeExists = await repo.Entities
                .AnyAsync(x =>
                    x.EmployeeCode == model.EmployeeCode &&
                    !x.DeletedTime.HasValue);

            if (employeeCodeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Employee code already exists");
            }

            // Kiểm tra Email nếu có
            if (!string.IsNullOrWhiteSpace(model.Email))
            {
                bool emailExists = await repo.Entities
                    .AnyAsync(x =>
                        x.Email == model.Email &&
                        !x.DeletedTime.HasValue);

                if (emailExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status400BadRequest,
                        "DUPLICATE",
                        "Email already exists");
                }
            }

            // Kiểm tra Department
            if (model.DepartmentId.HasValue)
            {
                IGenericRepository<Department> departmentRepo =
                    _unitOfWork.GetRepository<Department>();

                bool departmentExists = await departmentRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.DepartmentId.Value &&
                        !x.DeletedTime.HasValue);

                if (!departmentExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Department not found");
                }
            }

            // Kiểm tra Position
            if (model.PositionId.HasValue)
            {
                IGenericRepository<Position> positionRepo =
                    _unitOfWork.GetRepository<Position>();

                bool positionExists = await positionRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.PositionId.Value &&
                        !x.DeletedTime.HasValue);

                if (!positionExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Position not found");
                }
            }

            // Kiểm tra Manager
            if (model.ManagerId.HasValue)
            {
                bool managerExists = await repo.Entities
                    .AnyAsync(x =>
                        x.Id == model.ManagerId.Value &&
                        !x.DeletedTime.HasValue);

                if (!managerExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Manager not found");
                }
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            Employee employee = model.ToEntity();

            employee.EmployeeCode = model.EmployeeCode.Trim();
            employee.GivenName = model.GivenName.Trim();
            employee.FamilyName = model.FamilyName.Trim();

            employee.CreatedBy = currentUser;
            employee.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(employee);
            await _unitOfWork.SaveAsync();
            return employee.Id;
        }

        public async Task UpdateAsync(UpdateEmployeeModelView model)
        {
            IGenericRepository<Employee> repo =
                _unitOfWork.GetRepository<Employee>();

            Employee employee = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");

            if (model.Status == EmployeeStatus.Resigned && employee.Status != EmployeeStatus.Resigned)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "HANDOVER_REQUIRED",
                    "Employee resignation requires an approved handover request");
            }

            // Kiểm tra EmployeeCode trùng
            bool employeeCodeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Id != model.Id &&
                    x.EmployeeCode == model.EmployeeCode &&
                    !x.DeletedTime.HasValue);

            if (employeeCodeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Employee code already exists");
            }

            // Kiểm tra Email trùng
            if (!string.IsNullOrWhiteSpace(model.Email))
            {
                bool emailExists = await repo.Entities
                    .AnyAsync(x =>
                        x.Id != model.Id &&
                        x.Email == model.Email &&
                        !x.DeletedTime.HasValue);

                if (emailExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status400BadRequest,
                        "DUPLICATE",
                        "Email already exists");
                }
            }

            // Không cho nhân viên làm Manager của chính mình
            if (model.ManagerId.HasValue &&
                model.ManagerId.Value == model.Id)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Employee cannot be their own manager");
            }

            // Kiểm tra Department
            if (model.DepartmentId.HasValue)
            {
                IGenericRepository<Department> departmentRepo =
                    _unitOfWork.GetRepository<Department>();

                bool departmentExists = await departmentRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.DepartmentId.Value &&
                        !x.DeletedTime.HasValue);

                if (!departmentExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Department not found");
                }
            }

            // Kiểm tra Position
            if (model.PositionId.HasValue)
            {
                IGenericRepository<Position> positionRepo =
                    _unitOfWork.GetRepository<Position>();

                bool positionExists = await positionRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.PositionId.Value &&
                        !x.DeletedTime.HasValue);

                if (!positionExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Position not found");
                }
            }

            // Kiểm tra Manager
            if (model.ManagerId.HasValue)
            {
                bool managerExists = await repo.Entities
                    .AnyAsync(x =>
                        x.Id == model.ManagerId.Value &&
                        !x.DeletedTime.HasValue);

                if (!managerExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Manager not found");
                }
            }

            // Audit
            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(employee);

            employee.LastUpdatedBy = currentUser;
            employee.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(employee);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<Employee> repo =
                _unitOfWork.GetRepository<Employee>();

            Employee employee = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            employee.DeletedBy = currentUser;
            employee.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(employee);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<Employee> repo =
                _unitOfWork.GetRepository<Employee>();

            Employee employee = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");

            await repo.DeleteAsync(employee);
            await _unitOfWork.SaveAsync();
        }
    }
}
