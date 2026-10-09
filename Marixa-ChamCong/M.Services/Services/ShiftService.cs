using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.ShiftModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class ShiftService : IShiftService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ShiftService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<ShiftResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<Shift> repo = _unitOfWork.GetRepository<Shift>();

            IQueryable<Shift> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<Shift> shifts = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<ShiftResponseModelView> result = shifts
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<ShiftResponseModelView>(
                result.AsReadOnly(), totalItems, pageNumber, pageSize);
        }

        public async Task<ShiftResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<Shift> repo = _unitOfWork.GetRepository<Shift>();

            Shift shift = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Shift not found");

            return shift.ToViewModel();
        }

        public async Task CreateAsync(CreateShiftModelView model)
        {
            IGenericRepository<Shift> repo = _unitOfWork.GetRepository<Shift>();

            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Shift code already exists");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            Shift shift = model.ToEntity();
            shift.Code = model.Code.Trim();
            shift.Name = model.Name.Trim();
            shift.CreatedBy = currentUser;
            shift.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(shift);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateShiftModelView model)
        {
            IGenericRepository<Shift> repo = _unitOfWork.GetRepository<Shift>();

            Shift shift = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Shift not found");

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
                    "Shift code already exists");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(shift);
            shift.LastUpdatedBy = currentUser;
            shift.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(shift);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<Shift> repo = _unitOfWork.GetRepository<Shift>();

            Shift shift = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Shift not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            shift.DeletedBy = currentUser;
            shift.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(shift);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<Shift> repo = _unitOfWork.GetRepository<Shift>();

            Shift shift = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Shift not found");

            await repo.DeleteAsync(shift);
            await _unitOfWork.SaveAsync();
        }
    }
}
