using M.Core.Base;
using ModelViews.WorkTaskModelView;

namespace M.Contract.Services.Interface
{
    /// <summary>
    /// Service cho giao việc + theo dõi + kéo-thả + bình luận (WorkTask).
    /// </summary>
    public interface IWorkTaskService
    {
        // Việc của tôi (AssigneeId = tôi) - Kanban
        Task<List<WorkTaskRow>> GetMyTasksAsync(Guid employeeId);

        // Việc tôi đã giao (Admin: tất cả; Manager/HR: AssignedById = tôi)
        Task<List<WorkTaskRow>> GetAssignedByMeAsync(Guid managerId, bool fullScope);

        // Toàn bộ (Admin)
        Task<List<WorkTaskRow>> GetAllAsync();

        // 1 task
        Task<WorkTaskRow?> GetByIdAsync(Guid taskId);

        // Nhân viên có thể được giao (Manager: cùng phòng; Admin/HR: tất cả)
        Task<List<AssignableEmployeeRow>> GetAssignableAsync(Guid assignerId, bool fullScope);

        // CREATE / MOVE / DELETE / COMMENTS
        Task<WorkTaskRow> CreateAsync(Guid assignerId, CreateWorkTaskModelView model, bool fullScope);
        Task<WorkTaskRow> MoveAsync(Guid taskId, MoveWorkTaskModelView model, Guid currentUser, bool isAdmin);
        Task DeleteAsync(Guid taskId);
        Task<List<WorkTaskCommentRow>> GetCommentsAsync(Guid taskId);
        Task<WorkTaskCommentRow> AddCommentAsync(Guid taskId, CreateWorkTaskCommentModelView model, Guid currentUser, bool isAdmin);
    }
}
