using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.LeaveTypeModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class LeaveTypeService : ILeaveTypeService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public LeaveTypeService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<LeaveTypeResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<LeaveType> repo =
                _unitOfWork.GetRepository<LeaveType>();

            IQueryable<LeaveType> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<LeaveType> leaveTypes = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<LeaveTypeResponseModelView> result = leaveTypes
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<LeaveTypeResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize);
        }

        public async Task<LeaveTypeResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<LeaveType> repo =
                _unitOfWork.GetRepository<LeaveType>();

            LeaveType leaveType = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Leave type not found");

            return leaveType.ToViewModel();
        }

        public async Task CreateAsync(CreateLeaveTypeModelView model)
        {
            IGenericRepository<LeaveType> repo =
                _unitOfWork.GetRepository<LeaveType>();

            // Kiểm tra mã loại nghỉ phép (Code) trùng lặp
            bool codeExists = await repo.Entities
                .AnyAsync(x =>
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "DUPLICATE",
                    "Leave type code already exists");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            LeaveType leaveType = model.ToEntity();

            leaveType.Code = model.Code.Trim();
            leaveType.Name = model.Name.Trim();

            leaveType.CreatedBy = currentUser;
            leaveType.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(leaveType);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateAsync(UpdateLeaveTypeModelView model)
        {
            IGenericRepository<LeaveType> repo =
                _unitOfWork.GetRepository<LeaveType>();

            LeaveType leaveType = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Leave type not found");

            // Kiểm tra trùng mã loại nghỉ phép với bản ghi khác
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
                    "Leave type code already exists");
            }

            // Audit
            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            model.ToEntity(leaveType);

            leaveType.LastUpdatedBy = currentUser;
            leaveType.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(leaveType);
            await _unitOfWork.SaveAsync();
        }

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<LeaveType> repo =
                _unitOfWork.GetRepository<LeaveType>();

            LeaveType leaveType = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Leave type not found");

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            leaveType.DeletedBy = currentUser;
            leaveType.DeletedTime = CoreHelper.SystemTimeNow;

            await repo.UpdateAsync(leaveType);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            IGenericRepository<LeaveType> repo =
                _unitOfWork.GetRepository<LeaveType>();

            LeaveType leaveType = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Leave type not found");

            await repo.DeleteAsync(leaveType);
            await _unitOfWork.SaveAsync();
        }
    }
}