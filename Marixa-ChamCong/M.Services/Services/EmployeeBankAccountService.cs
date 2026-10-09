using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Serivces.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.EmployeeBankAccountModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class EmployeeBankAccountService : IEmployeeBankAccountService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EmployeeBankAccountService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<EmployeeBankAccountResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<EmployeeBankAccount> repo =
                _unitOfWork.GetRepository<EmployeeBankAccount>();

            IQueryable<EmployeeBankAccount> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.Bank)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<EmployeeBankAccount> accounts = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<EmployeeBankAccountResponseModelView> result = accounts
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<EmployeeBankAccountResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<EmployeeBankAccountResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<EmployeeBankAccount> repo =
                _unitOfWork.GetRepository<EmployeeBankAccount>();

            EmployeeBankAccount account = await repo.Entities
                .Where(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.Bank)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee bank account not found");

            return account.ToViewModel();
        }


        public async Task<List<EmployeeBankAccountResponseModelView>> ByEmployeeIdAsync(
            Guid employeeId)
        {
            IGenericRepository<EmployeeBankAccount> repo =
                _unitOfWork.GetRepository<EmployeeBankAccount>();

            List<EmployeeBankAccount> accounts = await repo.Entities
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.Bank)
                .OrderByDescending(x => x.IsPrimary)
                .ToListAsync();

            return accounts.Select(x => x.ToViewModel()).ToList();
        }
        public async Task CreateAsync(CreateEmployeeBankAccountModelView model)
        {
            IGenericRepository<EmployeeBankAccount> repo =
                _unitOfWork.GetRepository<EmployeeBankAccount>();

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

            // Kiểm tra Bank
            IGenericRepository<Bank> bankRepo =
                _unitOfWork.GetRepository<Bank>();

            bool bankExists = await bankRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.BankId &&
                    !x.DeletedTime.HasValue);

            if (!bankExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Bank not found");
            }

            // Kiểm tra AccountNumber trùng
            bool accountNumberExists = await repo.Entities
                .AnyAsync(x =>
                    x.AccountNumber == model.AccountNumber &&
                    !x.DeletedTime.HasValue);

            if (accountNumberExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Account number already exists");
            }

            // Kiểm tra chỉ có một tài khoản chính
            if (model.IsPrimary)
            {
                bool primaryAccountExists = await repo.Entities
                    .AnyAsync(x =>
                        x.EmployeeId == model.EmployeeId &&
                        x.IsPrimary &&
                        !x.DeletedTime.HasValue);

                if (primaryAccountExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status400BadRequest,
                        "DUPLICATE",
                        "Employee already has a primary bank account");
                }
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            EmployeeBankAccount account = model.ToEntity();

            account.AccountNumber = model.AccountNumber.Trim();

            if (!string.IsNullOrWhiteSpace(model.AccountHolderName))
            {
                account.AccountHolderName =
                    model.AccountHolderName.Trim();
            }

            account.CreatedBy = currentUser;
            account.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(account);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateEmployeeBankAccountModelView model)
        {
            IGenericRepository<EmployeeBankAccount> repo =
                _unitOfWork.GetRepository<EmployeeBankAccount>();

            EmployeeBankAccount account = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee bank account not found");

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

            // Kiểm tra Bank
            IGenericRepository<Bank> bankRepo =
                _unitOfWork.GetRepository<Bank>();

            bool bankExists = await bankRepo.Entities
                .AnyAsync(x =>
                    x.Id == model.BankId &&
                    !x.DeletedTime.HasValue);

            if (!bankExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Bank not found");
            }

            // Kiểm tra AccountNumber trùng
            bool accountNumberExists = await repo.Entities
                .AnyAsync(x =>
                    x.Id != model.Id &&
                    x.AccountNumber == model.AccountNumber &&
                    !x.DeletedTime.HasValue);

            if (accountNumberExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Account number already exists");
            }

            // Kiểm tra chỉ có một tài khoản chính
            if (model.IsPrimary)
            {
                bool primaryAccountExists = await repo.Entities
                    .AnyAsync(x =>
                        x.Id != model.Id &&
                        x.EmployeeId == model.EmployeeId &&
                        x.IsPrimary &&
                        !x.DeletedTime.HasValue);

                if (primaryAccountExists)
                {
                    throw new ErrorException(
                        StatusCodes.Status400BadRequest,
                        "DUPLICATE",
                        "Employee already has a primary bank account");
                }
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(account);

            account.AccountNumber = model.AccountNumber.Trim();

            if (!string.IsNullOrWhiteSpace(model.AccountHolderName))
            {
                account.AccountHolderName =
                    model.AccountHolderName.Trim();
            }
            else
            {
                account.AccountHolderName = null;
            }

            account.LastUpdatedBy = currentUser;
            account.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(account);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<EmployeeBankAccount> repo =
                _unitOfWork.GetRepository<EmployeeBankAccount>();

            EmployeeBankAccount account = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee bank account not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            account.DeletedBy = currentUser;
            account.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(account);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<EmployeeBankAccount> repo =
                _unitOfWork.GetRepository<EmployeeBankAccount>();

            EmployeeBankAccount account = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee bank account not found");

            await repo.DeleteAsync(account);
            await _unitOfWork.SaveAsync();
        }
    }
}
