using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.AttendanceRuleModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class AttendanceRuleService : IAttendanceRuleService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AttendanceRuleService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<AttendanceRuleResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<AttendanceRule> repo = _unitOfWork.GetRepository<AttendanceRule>();

            IQueryable<AttendanceRule> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<AttendanceRule> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<AttendanceRuleResponseModelView> result = items
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<AttendanceRuleResponseModelView>(
                result.AsReadOnly(), totalItems, pageNumber, pageSize);
        }

        public async Task<AttendanceRuleResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<AttendanceRule> repo = _unitOfWork.GetRepository<AttendanceRule>();

            AttendanceRule item = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance rule not found");

            return item.ToViewModel();
        }

        public async Task CreateAsync(CreateAttendanceRuleModelView model)
        {
            IGenericRepository<AttendanceRule> repo = _unitOfWork.GetRepository<AttendanceRule>();

            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Attendance rule code already exists");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            AttendanceRule entity = model.ToEntity();
            entity.Code = model.Code.Trim();
            entity.Name = model.Name.Trim();
            entity.CreatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateAttendanceRuleModelView model)
        {
            IGenericRepository<AttendanceRule> repo = _unitOfWork.GetRepository<AttendanceRule>();

            AttendanceRule entity = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance rule not found");

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
            IGenericRepository<AttendanceRule> repo = _unitOfWork.GetRepository<AttendanceRule>();

            AttendanceRule entity = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance rule not found");

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
            IGenericRepository<AttendanceRule> repo = _unitOfWork.GetRepository<AttendanceRule>();

            AttendanceRule entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Attendance rule not found");

            await repo.DeleteAsync(entity);
            await _unitOfWork.SaveAsync();
        }
    }
}
