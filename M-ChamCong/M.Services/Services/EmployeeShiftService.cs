using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.EmployeeShiftModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class EmployeeShiftService : IEmployeeShiftService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EmployeeShiftService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BasePaginatedList<EmployeeShiftResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize)
        {
            IGenericRepository<EmployeeShift> repo = _unitOfWork.GetRepository<EmployeeShift>();

            IQueryable<EmployeeShift> query = repo.Entities
                .Where(x => !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.Shift)
                .OrderBy(x => x.CreatedTime);

            int totalItems = await query.CountAsync();

            List<EmployeeShift> items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<EmployeeShiftResponseModelView> result = items
                .Select(x => x.ToViewModel())
                .ToList();

            return new BasePaginatedList<EmployeeShiftResponseModelView>(
                result.AsReadOnly(), totalItems, pageNumber, pageSize);
        }

        public async Task<EmployeeShiftResponseModelView> GetByIdAsync(Guid id)
        {
            IGenericRepository<EmployeeShift> repo = _unitOfWork.GetRepository<EmployeeShift>();

            EmployeeShift item = await repo.Entities
                .Where(x => x.Id == id && !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.Shift)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee shift assignment not found");

            return item.ToViewModel();
        }

        public async Task<List<EmployeeShiftResponseModelView>> ByEmployeeIdAsync(
            Guid employeeId)
        {
            IGenericRepository<EmployeeShift> repo =
                _unitOfWork.GetRepository<EmployeeShift>();

            List<EmployeeShift> items = await repo.Entities
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    !x.DeletedTime.HasValue)
                .Include(x => x.Employee)
                .Include(x => x.Shift)
                .OrderBy(x => x.EffectiveFrom)
                .ToListAsync();

            return items.Select(x => x.ToViewModel()).ToList();
        }

        public async Task CreateAsync(CreateEmployeeShiftModelView model)
        {
            IGenericRepository<EmployeeShift> repo = _unitOfWork.GetRepository<EmployeeShift>();

            IGenericRepository<Employee> employeeRepo = _unitOfWork.GetRepository<Employee>();
            bool employeeExists = await employeeRepo.Entities
                .AnyAsync(x => x.Id == model.EmployeeId && !x.DeletedTime.HasValue);

            if (!employeeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee not found");
            }

            IGenericRepository<Shift> shiftRepo = _unitOfWork.GetRepository<Shift>();
            bool shiftExists = await shiftRepo.Entities
                .AnyAsync(x => x.Id == model.ShiftId && !x.DeletedTime.HasValue);

            if (!shiftExists)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Shift not found");
            }

            string currentUser =
                _httpContextAccessor.HttpContext?.User?.Identity?.Name
                ?? "System";

            EmployeeShift entity = model.ToEntity();
            entity.CreatedBy = currentUser;
            entity.CreatedTime = CoreHelper.SystemTimeNow;

            await repo.InsertAsync(entity);
            await _unitOfWork.SaveAsync();
        }

        public async Task<CreateEmployeeShiftBulkResultModelView> CreateBulkAsync(
            CreateEmployeeShiftBulkModelView model,
            string currentUser,
            bool canManageAllEmployees,
            Guid? managerEmployeeId)
        {
            if (model.EmployeeIds == null || model.EmployeeIds.Count < 2 ||
                model.EmployeeIds.Any(id => id == Guid.Empty) ||
                model.EmployeeIds.Distinct().Count() != model.EmployeeIds.Count)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_EMPLOYEES",
                    "Chọn ít nhất 2 nhân viên khác nhau.");
            }

            DateTime effectiveFrom = DateTime.SpecifyKind(model.EffectiveFrom.Date, DateTimeKind.Unspecified);
            DateTime effectiveTo = DateTime.SpecifyKind(model.EffectiveTo.Date, DateTimeKind.Unspecified);
            if (effectiveTo < effectiveFrom)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_DATE_RANGE",
                    "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
            }

            IGenericRepository<Employee> employeeRepo = _unitOfWork.GetRepository<Employee>();
            List<Employee> employees = await employeeRepo.Entities
                .Where(x => model.EmployeeIds.Contains(x.Id) &&
                    !x.DeletedTime.HasValue &&
                    x.Status != EmployeeStatus.Resigned &&
                    x.Status != EmployeeStatus.Terminated)
                .Include(x => x.Department)
                .ToListAsync();
            if (employees.Count != model.EmployeeIds.Count)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_EMPLOYEES",
                    "Một hoặc nhiều nhân viên không tồn tại hoặc đã được lưu trữ.");
            }

            if (!canManageAllEmployees)
            {
                if (!managerEmployeeId.HasValue || employees.Any(x =>
                    x.ManagerId != managerEmployeeId &&
                    x.Department?.ManagerId != managerEmployeeId))
                {
                    throw new ErrorException(
                        StatusCodes.Status403Forbidden,
                        "EMPLOYEE_OUT_OF_MANAGER_SCOPE",
                        "Bạn chỉ được xếp lịch cho nhân viên thuộc phạm vi phụ trách.");
                }
            }

            IGenericRepository<Shift> shiftRepo = _unitOfWork.GetRepository<Shift>();
            Shift? shift = await shiftRepo.Entities.FirstOrDefaultAsync(x =>
                x.Id == model.ShiftId && x.IsActive && !x.DeletedTime.HasValue);
            if (shift == null)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    "INVALID_SHIFT",
                    "Ca làm không tồn tại hoặc đang ngừng hoạt động.");
            }

            IGenericRepository<EmployeeShift> assignmentRepo = _unitOfWork.GetRepository<EmployeeShift>();
            List<EmployeeShift> overlapping = await assignmentRepo.Entities
                .Where(x => model.EmployeeIds.Contains(x.EmployeeId) &&
                    x.ShiftId == model.ShiftId &&
                    !x.DeletedTime.HasValue &&
                    x.EffectiveFrom <= effectiveTo &&
                    (!x.EffectiveTo.HasValue || x.EffectiveTo.Value >= effectiveFrom))
                .ToListAsync();

            List<EmployeeShift> assignments = new();
            List<string> alreadyAssignedNames = new();
            foreach (Employee employee in employees)
            {
                int assignmentsBeforeEmployee = assignments.Count;
                DateTime cursor = effectiveFrom;
                List<EmployeeShift> employeeAssignments = overlapping
                    .Where(x => x.EmployeeId == employee.Id)
                    .OrderBy(x => x.EffectiveFrom)
                    .ToList();

                foreach (EmployeeShift existing in employeeAssignments)
                {
                    DateTime existingFrom = existing.EffectiveFrom.Date;
                    DateTime existingTo = existing.EffectiveTo?.Date ?? DateTime.MaxValue.Date;
                    if (existingTo < cursor) continue;
                    if (existingFrom > effectiveTo) break;

                    if (existingFrom > cursor)
                    {
                        assignments.Add(CreateAssignment(employee.Id, model.ShiftId, cursor,
                            existingFrom.AddDays(-1), model.Note, currentUser));
                    }

                    if (existingTo >= effectiveTo)
                    {
                        cursor = effectiveTo.AddDays(1);
                        break;
                    }

                    cursor = existingTo.AddDays(1);
                }

                if (cursor <= effectiveTo)
                {
                    assignments.Add(CreateAssignment(employee.Id, model.ShiftId, cursor,
                        effectiveTo, model.Note, currentUser));
                }
                if (assignments.Count == assignmentsBeforeEmployee && employeeAssignments.Count > 0)
                {
                    alreadyAssignedNames.Add(employee.FullName);
                }
            }

            if (assignments.Count > 0)
            {
                assignmentRepo.InsertRange(assignments);
                await _unitOfWork.SaveAsync();
            }

            return new CreateEmployeeShiftBulkResultModelView
            {
                CreatedAssignmentCount = assignments.Count,
                AssignedEmployeeCount = assignments.Select(x => x.EmployeeId).Distinct().Count(),
                AlreadyAssignedCount = alreadyAssignedNames.Count,
                AlreadyAssignedEmployeeNames = alreadyAssignedNames
            };
        }

        private static EmployeeShift CreateAssignment(
            Guid employeeId,
            Guid shiftId,
            DateTime effectiveFrom,
            DateTime effectiveTo,
            string? note,
            string currentUser)
        {
            return new EmployeeShift
            {
                EmployeeId = employeeId,
                ShiftId = shiftId,
                EffectiveFrom = DateTime.SpecifyKind(effectiveFrom.Date, DateTimeKind.Unspecified),
                EffectiveTo = DateTime.SpecifyKind(effectiveTo.Date, DateTimeKind.Unspecified),
                Note = note,
                CreatedBy = currentUser,
                CreatedTime = CoreHelper.SystemTimeNow
            };
        }

        public async Task UpdateAsync(UpdateEmployeeShiftModelView model)
        {
            IGenericRepository<EmployeeShift> repo = _unitOfWork.GetRepository<EmployeeShift>();

            EmployeeShift entity = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == model.Id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee shift assignment not found");

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
            IGenericRepository<EmployeeShift> repo = _unitOfWork.GetRepository<EmployeeShift>();

            EmployeeShift entity = await repo.Entities
                .FirstOrDefaultAsync(x =>
                    x.Id == id && !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee shift assignment not found");

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
            IGenericRepository<EmployeeShift> repo = _unitOfWork.GetRepository<EmployeeShift>();

            EmployeeShift entity = await repo.Entities
                .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Employee shift assignment not found");

            await repo.DeleteAsync(entity);
            await _unitOfWork.SaveAsync();
        }
    }
}
