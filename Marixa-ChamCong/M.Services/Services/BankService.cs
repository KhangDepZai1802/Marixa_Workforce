using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Serivces.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.BankModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class BankService : IBankService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public BankService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<BankResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<Bank> repo =
                _unitOfWork.GetRepository<Bank>();

            IQueryable<Bank> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<Bank> banks = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<BankResponseModelView> result = banks
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<BankResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<BankResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<Bank> repo =
                _unitOfWork.GetRepository<Bank>();

            Bank bank = await repo.Entities
                .Where(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Bank not found");

            return bank.ToViewModel();
        }

        public async Task CreateAsync(CreateBankModelView model)
        {
            IGenericRepository<Bank> repo =
                _unitOfWork.GetRepository<Bank>();

            // Kiểm tra Code
            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Bank code already exists");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            Bank bank = model.ToEntity();

            bank.Code = model.Code.Trim();
            bank.Name = model.Name.Trim();

            if (!string.IsNullOrWhiteSpace(model.ShortName))
            {
                bank.ShortName = model.ShortName.Trim();
            }

            bank.CreatedBy = currentUser;
            bank.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(bank);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateBankModelView model)
        {
            IGenericRepository<Bank> repo =
                _unitOfWork.GetRepository<Bank>();

            Bank bank = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Bank not found");

            // Kiểm tra Code trùng
            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Id != model.Id &&
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Bank code already exists");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(bank);

            bank.Code = model.Code.Trim();
            bank.Name = model.Name.Trim();

            if (!string.IsNullOrWhiteSpace(model.ShortName))
            {
                bank.ShortName = model.ShortName.Trim();
            }
            else
            {
                bank.ShortName = null;
            }

            bank.LastUpdatedBy = currentUser;
            bank.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(bank);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<Bank> repo =
                _unitOfWork.GetRepository<Bank>();

            Bank bank = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Bank not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            bank.DeletedBy = currentUser;
            bank.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(bank);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<Bank> repo =
                _unitOfWork.GetRepository<Bank>();

            Bank bank = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Bank not found");

            await repo.DeleteAsync(bank);
            await _unitOfWork.SaveAsync();
        }
    }
}
