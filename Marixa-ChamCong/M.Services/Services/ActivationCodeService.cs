using M.Contract.Repositories.Entities;
using M.Contract.Repositories.Entity;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.ActivationCodeModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class ActivationCodeService : IActivationCodeService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ActivationCodeService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<ActivationCodeResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<ActivationCode> repo = _unitOfWork.GetRepository<ActivationCode>();

            IQueryable<ActivationCode> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .OrderByDescending(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<ActivationCode> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<ActivationCodeResponseModelView> result = items
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<ActivationCodeResponseModelView>(
                result.AsReadOnly(), totalItems, pageNumber, pageSize);
        }

        public async Task<ActivationCodeResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<ActivationCode> repo = _unitOfWork.GetRepository<ActivationCode>();

            ActivationCode item = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Activation code not found");

            return item.ToViewModel();
        }

        public async Task CreateAsync(CreateActivationCodeModelView model)
        {
            IGenericRepository<ActivationCode> repo = _unitOfWork.GetRepository<ActivationCode>();

            IGenericRepository<Employee> employeeRepo =
                _unitOfWork.GetRepository<Employee>();

            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x => x.Id == model.EmployeeId && !x.DeletedTime.HasValue);

            if (!employeeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");
            }

            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Activation code already exists");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            ActivationCode entity = model.ToEntity();
            entity.Code = model.Code.Trim();
            entity.CreatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateActivationCodeModelView model)
        {
            IGenericRepository<ActivationCode> repo = _unitOfWork.GetRepository<ActivationCode>();

            ActivationCode entity = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Activation code not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(entity);
            entity.LastUpdatedBy = currentUser;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<ActivationCode> repo = _unitOfWork.GetRepository<ActivationCode>();

            ActivationCode entity = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Activation code not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            entity.DeletedBy = currentUser;
            entity.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<ActivationCode> repo = _unitOfWork.GetRepository<ActivationCode>();

            ActivationCode entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Activation code not found");

            await repo.DeleteAsync(entity);
            await _unitOfWork.SaveAsync();
        }
    }
}
