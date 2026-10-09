using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.EmployeeInsuranceModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class EmployeeInsuranceService : IEmployeeInsuranceService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EmployeeInsuranceService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<EmployeeInsuranceResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<EmployeeInsurance> repo =
                _unitOfWork.GetRepository<EmployeeInsurance>();

            IQueryable<EmployeeInsurance> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<EmployeeInsurance> insurances = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<EmployeeInsuranceResponseModelView> result = insurances
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<EmployeeInsuranceResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<EmployeeInsuranceResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<EmployeeInsurance> repo =
                _unitOfWork.GetRepository<EmployeeInsurance>();

            EmployeeInsurance insurance = await repo.Entities
                .Where(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee insurance not found");

            return insurance.ToViewModel();
        }


        public async Task<List<EmployeeInsuranceResponseModelView>> ByEmployeeIdAsync(
            Guid employeeId)
        {
            IGenericRepository<EmployeeInsurance> repo =
                _unitOfWork.GetRepository<EmployeeInsurance>();

            List<EmployeeInsurance> insurances = await repo.Entities
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .OrderByDescending(x => x.CreatedTime)
                .ToListAsync();

            return insurances.Select(x => x.ToViewModel()).ToList();
        }
        public async Task CreateAsync(
            CreateEmployeeInsuranceModelView model)
        {
            IGenericRepository<EmployeeInsurance> repo =
                _unitOfWork.GetRepository<EmployeeInsurance>();

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

            // Kiểm tra ngày tham gia bảo hiểm
            if (model.ParticipationStartDate.HasValue &&
                model.ParticipationEndDate.HasValue &&
                model.ParticipationEndDate.Value <
                model.ParticipationStartDate.Value)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Participation end date cannot be earlier than participation start date");
            }

            // Không cho lương bảo hiểm âm
            if (model.SocialInsuranceSalary < 0)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Social insurance salary cannot be negative");
            }

            // Nếu tham gia BHXH thì cần ngày bắt đầu
            if (model.IsSocialInsuranceParticipant &&
                !model.ParticipationStartDate.HasValue)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Participation start date is required when employee participates in social insurance");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            EmployeeInsurance insurance = model.ToEntity();

            if (!string.IsNullOrWhiteSpace(model.SocialInsuranceNumber))
                insurance.SocialInsuranceNumber =
                    model.SocialInsuranceNumber.Trim();

            if (!string.IsNullOrWhiteSpace(model.HealthInsuranceNumber))
                insurance.HealthInsuranceNumber =
                    model.HealthInsuranceNumber.Trim();

            if (!string.IsNullOrWhiteSpace(model.PersonalTaxCode))
                insurance.PersonalTaxCode =
                    model.PersonalTaxCode.Trim();

            insurance.CreatedBy = currentUser;
            insurance.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(insurance);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(
            UpdateEmployeeInsuranceModelView model)
        {
            IGenericRepository<EmployeeInsurance> repo =
                _unitOfWork.GetRepository<EmployeeInsurance>();

            EmployeeInsurance insurance = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee insurance not found");

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

            // Kiểm tra ngày tham gia bảo hiểm
            if (model.ParticipationStartDate.HasValue &&
                model.ParticipationEndDate.HasValue &&
                model.ParticipationEndDate.Value <
                model.ParticipationStartDate.Value)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Participation end date cannot be earlier than participation start date");
            }

            // Không cho lương bảo hiểm âm
            if (model.SocialInsuranceSalary < 0)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Social insurance salary cannot be negative");
            }

            // Nếu tham gia BHXH thì cần ngày bắt đầu
            if (model.IsSocialInsuranceParticipant &&
                !model.ParticipationStartDate.HasValue)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_INPUT",
                    "Participation start date is required when employee participates in social insurance");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(insurance);

            if (!string.IsNullOrWhiteSpace(model.SocialInsuranceNumber))
                insurance.SocialInsuranceNumber =
                    model.SocialInsuranceNumber.Trim();
            else
                insurance.SocialInsuranceNumber = null;

            if (!string.IsNullOrWhiteSpace(model.HealthInsuranceNumber))
                insurance.HealthInsuranceNumber =
                    model.HealthInsuranceNumber.Trim();
            else
                insurance.HealthInsuranceNumber = null;

            if (!string.IsNullOrWhiteSpace(model.PersonalTaxCode))
                insurance.PersonalTaxCode =
                    model.PersonalTaxCode.Trim();
            else
                insurance.PersonalTaxCode = null;

            insurance.LastUpdatedBy = currentUser;
            insurance.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(insurance);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<EmployeeInsurance> repo =
                _unitOfWork.GetRepository<EmployeeInsurance>();

            EmployeeInsurance insurance = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee insurance not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            insurance.DeletedBy = currentUser;
            insurance.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(insurance);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<EmployeeInsurance> repo =
                _unitOfWork.GetRepository<EmployeeInsurance>();

            EmployeeInsurance insurance = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee insurance not found");

            await repo.DeleteAsync(insurance);
            await _unitOfWork.SaveAsync();
        }
    }
}