using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.PositionModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class PositionService : IPositionService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PositionService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<PositionResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<Position> repo =
                _unitOfWork.GetRepository<Position>();

            IQueryable<Position> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<Position> positions = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<PositionResponseModelView> result = positions
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<PositionResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<PositionResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<Position> repo =
                _unitOfWork.GetRepository<Position>();

            Position position = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Position not found");

            return position.ToViewModel();
        }

        public async Task CreateAsync(CreatePositionModelView model)
        {
            IGenericRepository<Position> repo =
                _unitOfWork.GetRepository<Position>();

            // Kiểm tra Code hoặc Name trùng lặp nếu có (tuỳ thuộc vào cấu trúc thực tế của bảng Position)
            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Position code already exists");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            Position position = model.ToEntity();

            position.Code = model.Code.Trim();
            position.Name = model.Name.Trim();

            position.CreatedBy = currentUser;
            position.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(position);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdatePositionModelView model)
        {
            IGenericRepository<Position> repo =
                _unitOfWork.GetRepository<Position>();

            Position position = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Position not found");

            // Kiểm tra trùng mã Position với bản ghi khác
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
                    "Position code already exists");
            }

            // Audit
            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(position);

            position.LastUpdatedBy = currentUser;
            position.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(position);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<Position> repo =
                _unitOfWork.GetRepository<Position>();

            Position position = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Position not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            position.DeletedBy = currentUser;
            position.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(position);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<Position> repo =
                _unitOfWork.GetRepository<Position>();

            Position position = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Position not found");

            await repo.DeleteAsync(position);
            await _unitOfWork.SaveAsync();
        }
    }
}