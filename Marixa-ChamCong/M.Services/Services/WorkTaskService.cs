using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.WorkTaskModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class WorkTaskService : IWorkTaskService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public WorkTaskService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        private IGenericRepository<WorkTask> TaskRepo => _unitOfWork.GetRepository<WorkTask>();
        private IGenericRepository<WorkTaskComment> CommentRepo => _unitOfWork.GetRepository<WorkTaskComment>();
        private IGenericRepository<Employee> EmpRepo => _unitOfWork.GetRepository<Employee>();

        // ---------- Query ----------
        private IQueryable<WorkTaskRow> Query()
        {
            return from t in TaskRepo.Entities.AsNoTracking()
                   let ccount = CommentRepo.Entities.Count(x => x.TaskId == t.Id)
                   select new WorkTaskRow
                   {
                       Id = t.Id,
                       AssigneeId = t.AssigneeId,
                       AssignedById = t.AssignedById,
                       AssigneeEmployeeCode = t.AssigneeEmployeeCode,
                       AssigneeName = t.AssigneeName,
                       AssignedByName = t.AssignedByName,
                       Title = t.Title,
                       Description = t.Description,
                       Priority = t.Priority,
                       Status = t.Status,
                       StatusLabel = t.CurrentStatusLabel,
                       DueDate = t.DueDate,
                       CompletedAt = t.CompletedAt,
                       ProgressPercent = t.ProgressPercent,
                       CommentCount = ccount,
                       CreatedTime = t.CreatedTime,
                       LastUpdatedTime = t.LastUpdatedTime
                   };
        }

        public async Task<List<WorkTaskRow>> GetMyTasksAsync(Guid employeeId)
        {
            return await Query()
                .Where(x => x.AssigneeId == employeeId)
                .OrderByDescending(x => x.Priority).ThenBy(x => x.DueDate)
                .ToListAsync();
        }

        public async Task<List<WorkTaskRow>> GetAssignedByMeAsync(Guid managerId, bool fullScope)
        {
            var q = Query();
            if (!fullScope) q = q.Where(x => x.AssignedById == managerId);
            return await q.OrderByDescending(x => x.CreatedTime).ToListAsync();
        }

        public async Task<List<WorkTaskRow>> GetAllAsync()
        {
            return await Query().OrderByDescending(x => x.CreatedTime).ToListAsync();
        }

        public async Task<List<AssignableEmployeeRow>> GetAssignableAsync(Guid assignerId, bool fullScope)
        {
            Employee? assigner = await EmpRepo.Entities.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == assignerId);

            if (!fullScope)
            {
                if (assigner?.DepartmentId is null) return new List<AssignableEmployeeRow>();
                return await EmpRepo.Entities.AsNoTracking()
                    .Where(e => e.DepartmentId == assigner.DepartmentId
                        && e.Id != assignerId
                        && e.Status != EmployeeStatus.Resigned)
                    .Select(e => new AssignableEmployeeRow
                    {
                        Id = e.Id,
                        EmployeeCode = e.EmployeeCode,
                        Name = $"{e.GivenName} {e.FamilyName}",
                        DepartmentName = e.Department!.Name,
                        PositionName = e.Position!.Name
                    })
                    .OrderBy(e => e.EmployeeCode)
                    .ToListAsync();
            }

            return await EmpRepo.Entities.AsNoTracking()
                .Where(e => e.Status != EmployeeStatus.Resigned)
                .Select(e => new AssignableEmployeeRow
                {
                    Id = e.Id,
                    EmployeeCode = e.EmployeeCode,
                    Name = $"{e.GivenName} {e.FamilyName}",
                    DepartmentName = e.Department!.Name,
                    PositionName = e.Position!.Name
                })
                .OrderBy(e => e.EmployeeCode)
                .ToListAsync();
        }

        public async Task<WorkTaskRow> CreateAsync(Guid assignerId, CreateWorkTaskModelView model, bool fullScope)
        {
            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            var assignee = await EmpRepo.Entities.FirstOrDefaultAsync(e => e.Id == model.AssigneeId)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Không tìm thấy nhân viên nhận việc.");

            var assigner = await EmpRepo.Entities.FirstOrDefaultAsync(e => e.Id == assignerId)
                ?? throw new ErrorException(StatusCodes.Status400BadRequest, "VALIDATION", "Tài khoản chưa liên kết hồ sơ nhân viên, không thể giao việc.");

            // Manager (không fullScope) chỉ giao được cho cùng phòng ban.
            if (!fullScope)
            {
                if (assigner.DepartmentId is null)
                    throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN", "Phòng ban của bạn chưa được thiết lập, không thể giao việc.");
                if (assignee.DepartmentId != assigner.DepartmentId)
                    throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN", "Chỉ được giao việc cho nhân viên trong cùng phòng ban với bạn.");
            }

            var task = new WorkTask
            {
                AssigneeId = assignee.Id,
                AssigneeEmployeeCode = assignee.EmployeeCode,
                AssigneeName = $"{assignee.GivenName} {assignee.FamilyName}",
                AssignedById = assigner.Id,
                AssignedByName = $"{assigner.GivenName} {assigner.FamilyName}",
                Title = model.Title.Trim(),
                Description = model.Description?.Trim(),
                Priority = Math.Clamp(model.Priority, 0, 3),
                Status = WorkTaskStatus.Todo,
                CurrentStatusLabel = WorkTaskStatus.Label(WorkTaskStatus.Todo),
                DueDate = model.DueDate.Date,
                CreatedBy = currentUser,
                LastUpdatedBy = currentUser
            };
            await TaskRepo.InsertAsync(task);
            await _unitOfWork.SaveAsync();

            return (await Query().FirstOrDefaultAsync(x => x.Id == task.Id))!;
        }

        public async Task<WorkTaskRow> MoveAsync(Guid taskId, MoveWorkTaskModelView model, Guid currentUser, bool isAdmin)
        {
            var task = await TaskRepo.Entities.FirstOrDefaultAsync(t => t.Id == taskId)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Nhiệm vụ không tồn tại.");

            var isAssignee = task.AssigneeId == currentUser;
            if (!isAssignee && !isAdmin)
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN", "Không có quyền đổi trạng thái nhiệm vụ này.");

            task.Status = Math.Clamp(model.Status, 0, 3);
            task.CurrentStatusLabel = WorkTaskStatus.Label(task.Status);
            task.ProgressPercent = Math.Clamp(model.ProgressPercent, 0, 100);
            task.CompletedAt = task.Status == WorkTaskStatus.Done ? DateTime.UtcNow : null;
            task.LastUpdatedBy = currentUser.ToString();
            task.LastUpdatedTime = CoreHelper.SystemTimeNow;
            await TaskRepo.UpdateAsync(task);
            await _unitOfWork.SaveAsync();

            return (await Query().FirstOrDefaultAsync(x => x.Id == task.Id))!;
        }

        public async Task DeleteAsync(Guid taskId)
        {
            var task = await TaskRepo.Entities.FirstOrDefaultAsync(t => t.Id == taskId)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Nhiệm vụ không tồn tại.");
            var comments = await CommentRepo.Entities.Where(c => c.TaskId == taskId).ToListAsync();
            foreach (var c in comments) await CommentRepo.DeleteAsync(c);
            await TaskRepo.DeleteAsync(task);
            await _unitOfWork.SaveAsync();
        }

        // ---------- Comments ----------
        public async Task<List<WorkTaskCommentRow>> GetCommentsAsync(Guid taskId)
        {
            return await CommentRepo.Entities.AsNoTracking()
                .Where(c => c.TaskId == taskId)
                .OrderBy(c => c.CreatedTime)
                .Select(c => new WorkTaskCommentRow
                {
                    Id = c.Id,
                    TaskId = c.TaskId,
                    AuthorEmployeeId = c.AuthorEmployeeId,
                    AuthorName = c.AuthorName,
                    Content = c.Content,
                    CreatedTime = c.CreatedTime
                })
                .ToListAsync();
        }

        public async Task<WorkTaskCommentRow> AddCommentAsync(Guid taskId, CreateWorkTaskCommentModelView model, Guid currentUser, bool isAdmin)
        {
            string userName = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            var task = await TaskRepo.Entities.FirstOrDefaultAsync(t => t.Id == taskId)
                ?? throw new ErrorException(StatusCodes.Status404NotFound, "NOT_FOUND", "Nhiệm vụ không tồn tại.");

            var isAllowed = task.AssigneeId == currentUser
                || task.AssignedById == currentUser
                || isAdmin;
            if (!isAllowed)
                throw new ErrorException(StatusCodes.Status403Forbidden, "FORBIDDEN", "Không có quyền bình luận nhiệm vụ này.");

            var comment = new WorkTaskComment
            {
                TaskId = taskId,
                AuthorEmployeeId = currentUser,
                AuthorName = userName,
                Content = model.Content.Trim(),
                CreatedBy = userName
            };
            await CommentRepo.InsertAsync(comment);

            task.LastUpdatedBy = userName;
            task.LastUpdatedTime = CoreHelper.SystemTimeNow;
            await TaskRepo.UpdateAsync(task);
            await _unitOfWork.SaveAsync();

            return new WorkTaskCommentRow
            {
                Id = comment.Id,
                TaskId = taskId,
                AuthorEmployeeId = currentUser,
                AuthorName = userName,
                Content = comment.Content,
                CreatedTime = comment.CreatedTime
            };
        }

        public async Task<WorkTaskRow?> GetByIdAsync(Guid taskId)
        {
            return await Query().FirstOrDefaultAsync(x => x.Id == taskId);
        }
    }
}
