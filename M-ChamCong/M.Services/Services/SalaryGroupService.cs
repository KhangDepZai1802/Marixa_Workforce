using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.SalaryGroupModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class SalaryGroupService : ISalaryGroupService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SalaryGroupService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<SalaryGroupResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            IGenericRepository<SalaryGroup> repo = _unitOfWork.GetRepository<SalaryGroup>();

            IQueryable<SalaryGroup> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<SalaryGroup> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<SalaryGroupResponseModelView> result = items
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<SalaryGroupResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<SalaryGroupResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<SalaryGroup> repo = _unitOfWork.GetRepository<SalaryGroup>();

            SalaryGroup entity = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Salary group not found");

            return entity.ToViewModel();
        }

        public async Task CreateAsync(CreateSalaryGroupModelView model)
        {
            IGenericRepository<SalaryGroup> repo = _unitOfWork.GetRepository<SalaryGroup>();

            bool codeExists = await repo.Entities
                .AnyAsync(x => x.Code == model.Code.Trim() && !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Salary group code already exists");
            }

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            SalaryGroup entity = model.ToEntity();
            entity.Code = model.Code.Trim();
            entity.Name = model.Name.Trim();
            entity.CreatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;
            entity.LastUpdatedBy = currentUser;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateSalaryGroupModelView model)
        {
            IGenericRepository<SalaryGroup> repo = _unitOfWork.GetRepository<SalaryGroup>();

            SalaryGroup entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Salary group not found");

            bool codeExists = await repo.Entities
                .AnyAsync(x => x.Id != model.Id && x.Code == model.Code.Trim() && !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Salary group code already exists");
            }

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            model.ToEntity(entity);

            entity.Code = model.Code.Trim();
            entity.Name = model.Name.Trim();
            entity.LastUpdatedBy = currentUser;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<SalaryGroup> repo = _unitOfWork.GetRepository<SalaryGroup>();

            SalaryGroup entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Salary group not found");

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            entity.DeletedBy = currentUser;
            entity.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<SalaryGroup> repo = _unitOfWork.GetRepository<SalaryGroup>();

            SalaryGroup entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Salary group not found");

            await repo.DeleteAsync(entity);
            await _unitOfWork.SaveAsync();
        }
    }
}
