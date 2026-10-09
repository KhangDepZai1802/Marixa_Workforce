using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.OfficeLocationModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class OfficeLocationService : IOfficeLocationService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public OfficeLocationService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<OfficeLocationResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            IGenericRepository<OfficeLocation> repo = _unitOfWork.GetRepository<OfficeLocation>();

            IQueryable<OfficeLocation> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .OrderByDescending(x => x.IsPrimary)
                .ThenBy(x => x.Name);

            int totalItems = await query.CountAsync();
            List<OfficeLocation> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new BasePaginatedList<OfficeLocationResponseModelView>(
                items.Select(x => x.ToViewModel()).ToList().AsReadOnly(),
                totalItems, pageNumber, pageSize);
        }

        public async Task<OfficeLocationResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<OfficeLocation> repo = _unitOfWork.GetRepository<OfficeLocation>();
            OfficeLocation entity = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Office location not found");

            return entity.ToViewModel();
        }

        public async Task<OfficeLocationResponseModelView?> GetPrimaryAsync()
        {
            IGenericRepository<OfficeLocation> repo = _unitOfWork.GetRepository<OfficeLocation>();
            OfficeLocation? entity = await repo.Entities
                .Where(x => x.IsPrimary && x.IsActive && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync();

            return entity?.ToViewModel();
        }

        public async Task CreateAsync(CreateOfficeLocationModelView model)
        {
            IGenericRepository<OfficeLocation> repo = _unitOfWork.GetRepository<OfficeLocation>();

            // Tọa độ + bán kính bắt buộc cùng có hoặc cùng thiếu
            bool hasCoords = model.Latitude is not null && model.Longitude is not null;
            bool hasRadius = model.RadiusMeters is not null;
            if (hasCoords != hasRadius)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_INPUT",
                    "Latitude/Longitude and RadiusMeters must all be provided or all omitted");

            // Radius hợp lệ (nếu có)
            if (model.RadiusMeters is int r && r <= 0)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_INPUT",
                    "RadiusMeters must be positive");

            // Nếu đánh dấu primary, reset các primary khác đang hoạt động
            if (model.IsPrimary)
                await DeactivateOtherPrimaryAsync(null, repo);

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            OfficeLocation entity = model.ToEntity();
            entity.CreatedBy = currentUser;
            entity.LastUpdatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateOfficeLocationModelView model)
        {
            IGenericRepository<OfficeLocation> repo = _unitOfWork.GetRepository<OfficeLocation>();

            OfficeLocation entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Office location not found");

            bool hasCoords = model.Latitude is not null && model.Longitude is not null;
            bool hasRadius = model.RadiusMeters is not null;
            if (hasCoords != hasRadius)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_INPUT",
                    "Latitude/Longitude and RadiusMeters must all be provided or all omitted");

            if (model.RadiusMeters is int r && r <= 0)
                throw new ErrorException(StatusCodes.Status400BadRequest, "INVALID_INPUT",
                    "RadiusMeters must be positive");

            // Chuyển thành primary -> reset primary khác
            if (model.IsPrimary && !entity.IsPrimary)
                await DeactivateOtherPrimaryAsync(entity.Id, repo);

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            model.ToEntity(entity);
            entity.LastUpdatedBy = currentUser;
            entity.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<OfficeLocation> repo = _unitOfWork.GetRepository<OfficeLocation>();
            OfficeLocation entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Office location not found");

            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            entity.DeletedBy = currentUser;
            entity.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        // ===== Helpers =====
        private async Task DeactivateOtherPrimaryAsync(Guid? excludeId, IGenericRepository<OfficeLocation> repo)
        {
            List<OfficeLocation> primaries = await repo.Entities
                .Where(x => x.IsPrimary && x.IsActive && !x.DeletedTime.HasValue &&
                            x.Id != excludeId)
                .ToListAsync();
            foreach (OfficeLocation p in primaries)
            {
                p.IsPrimary = false;
                await repo.UpdateAsync(p);
            }
        }
    }
}
