using ModelViews.WorkProjectModelView;

namespace M.Contract.Services.Interface
{
    /// <summary>
    /// Service cho dự án / gói công việc: tạo, upload file, giao cho cấp dưới.
    /// (File upload được xử lý ở controller - service nhận FileName/FileUrl đã sẵn.)
    /// </summary>
    public interface IWorkProjectService
    {
        // Người có thể được giao (Admin/HR: tất cả; Manager: cấp dưới đệ quy)
        Task<List<SelectableEmployeeRow>> GetAssignableAsync(Guid ownerId, bool fullScope);

        // Dự án của tôi (owner + member)
        Task<List<WorkProjectRow>> GetMineAsync(Guid ownerId);

        // Toàn bộ dự án (Admin/Manager/HR)
        Task<List<WorkProjectRow>> GetAllAsync();

        // Tạo dự án + gán thành viên (FileName/FileUrl đã được controller điền vào model)
        Task<WorkProjectRow> CreateAsync(Guid ownerId, CreateWorkProjectModelView model);
    }
}
