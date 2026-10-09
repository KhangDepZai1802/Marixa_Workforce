using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.EmployeeSalaryModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class EmployeeSalaryService : IEmployeeSalaryService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EmployeeSalaryService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<EmployeeSalaryResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<EmployeeSalary> repo =
                _unitOfWork.GetRepository<EmployeeSalary>();

            IQueryable<EmployeeSalary> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.SalaryGroup)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<EmployeeSalary> salaries = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<EmployeeSalaryResponseModelView> result = salaries
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<EmployeeSalaryResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<EmployeeSalaryResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<EmployeeSalary> repo =
                _unitOfWork.GetRepository<EmployeeSalary>();

            EmployeeSalary salary = await repo.Entities
                .Where(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.SalaryGroup)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee salary not found");

            return salary.ToViewModel();
        }


        public async Task<List<EmployeeSalaryResponseModelView>> ByEmployeeIdAsync(
            Guid employeeId)
        {
            IGenericRepository<EmployeeSalary> repo =
                _unitOfWork.GetRepository<EmployeeSalary>();

            List<EmployeeSalary> salaries = await repo.Entities
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.SalaryGroup)
                .OrderByDescending(x => x.EffectiveFrom)
                .ToListAsync();

            return salaries.Select(x => x.ToViewModel()).ToList();
        }
        public async Task CreateAsync(
            CreateEmployeeSalaryModelView model)
        {
            IGenericRepository<EmployeeSalary> repo =
                _unitOfWork.GetRepository<EmployeeSalary>();

            // Kiểm tra Employee
            IGenericRepository<Employee> employeeRepo =
                _unitOfWork.GetRepository<Employee>();

            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.EmployeeId &&
                    !x.DeletedTime.HasValue);

            if (!employeeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");
            }

            // Kiểm tra SalaryGroup nếu có
            if (model.SalaryGroupId.HasValue)
            {
                IGenericRepository<SalaryGroup> salaryGroupRepo =
                    _unitOfWork.GetRepository<SalaryGroup>();

                bool salaryGroupExists = await salaryGroupRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.SalaryGroupId.Value &&
                        !x.DeletedTime.HasValue);

                if (!salaryGroupExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Salary group not found");
                }
            }

            // Kiểm tra ngày
            if (model.EffectiveTo.HasValue &&
                model.EffectiveTo.Value < model.EffectiveFrom)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Effective to cannot be earlier than effective from");
            }

            // Kiểm tra các khoản tiền không âm
            ValidateSalaryAmounts(model);

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            EmployeeSalary salary = model.ToEntity();

            salary.CreatedBy = currentUser;
            salary.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(salary);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(
            UpdateEmployeeSalaryModelView model)
        {
            IGenericRepository<EmployeeSalary> repo =
                _unitOfWork.GetRepository<EmployeeSalary>();

            EmployeeSalary salary = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee salary not found");

            // Kiểm tra Employee
            IGenericRepository<Employee> employeeRepo =
                _unitOfWork.GetRepository<Employee>();

            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.EmployeeId &&
                    !x.DeletedTime.HasValue);

            if (!employeeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");
            }

            // Kiểm tra SalaryGroup nếu có
            if (model.SalaryGroupId.HasValue)
            {
                IGenericRepository<SalaryGroup> salaryGroupRepo =
                    _unitOfWork.GetRepository<SalaryGroup>();

                bool salaryGroupExists = await salaryGroupRepo.Entities
                    .AnyAsync(x =>
                        x.Id == model.SalaryGroupId.Value &&
                        !x.DeletedTime.HasValue);

                if (!salaryGroupExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Salary group not found");
                }
            }

            // Kiểm tra ngày
            if (model.EffectiveTo.HasValue &&
                model.EffectiveTo.Value < model.EffectiveFrom)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Effective to cannot be earlier than effective from");
            }

            // Kiểm tra các khoản tiền không âm
            ValidateSalaryAmounts(model);

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(salary);

            salary.LastUpdatedBy = currentUser;
            salary.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(salary);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<EmployeeSalary> repo =
                _unitOfWork.GetRepository<EmployeeSalary>();

            EmployeeSalary salary = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee salary not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            salary.DeletedBy = currentUser;
            salary.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(salary);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<EmployeeSalary> repo =
                _unitOfWork.GetRepository<EmployeeSalary>();

            EmployeeSalary salary = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee salary not found");

            await repo.DeleteAsync(salary);
            await _unitOfWork.SaveAsync();
        }

        private static void ValidateSalaryAmounts(
            CreateEmployeeSalaryModelView model)
        {
            if (model.BasicSalary < 0 ||
                model.DailyRate < 0 ||
                model.PositionAllowance < 0 ||
                model.OtherAllowance < 0 ||
                model.Bonus < 0 ||
                model.SocialInsuranceSalary < 0)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Salary amounts cannot be negative");
            }
        }

        private static void ValidateSalaryAmounts(
            UpdateEmployeeSalaryModelView model)
        {
            if (model.BasicSalary < 0 ||
                model.DailyRate < 0 ||
                model.PositionAllowance < 0 ||
                model.OtherAllowance < 0 ||
                model.Bonus < 0 ||
                model.SocialInsuranceSalary < 0)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Salary amounts cannot be negative");
            }
        }
    }
}