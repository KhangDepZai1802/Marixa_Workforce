using ModelViews.WorkPerformanceModelView;

namespace M.Contract.Services.Interface
{
    /// <summary>
    /// Service đánh giá hiệu suất (KPI) theo kỳ.
    /// </summary>
    public interface IWorkPerformanceService
    {
        // Đánh giá của tôi (được đánh giá)
        Task<List<WorkPerformanceRow>> GetMineAsync(Guid employeeId);

        // Toàn bộ / theo quyền (Admin: tất cả; Manager/HR: đánh giá của họ + họ)
        Task<List<WorkPerformanceRow>> GetAllAsync(Guid requesterId, bool isAdmin);

        // Lấy 1 đánh giá
        Task<WorkPerformanceRow?> GetByIdAsync(Guid id);

        // Tạo đánh giá (Manager/Admin/HR)
        Task<Guid> CreateAsync(Guid raterId, CreateWorkPerformanceModelView model);

        // Nhân viên xác nhận đánh giá
        Task ConfirmAsync(Guid id, ConfirmWorkPerformanceModelView model, Guid employeeId);
    }
}
