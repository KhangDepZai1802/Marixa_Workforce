using M.Core.Base;
using ModelViews.LeaveLedgerModelView;
using ModelViews.LeaveRequestModelView;

namespace M.Contract.Services.Interface
{
    public interface ILeaveRequestService
    {
        // ===== Truy vấn =====
        Task<BasePaginatedList<LeaveRequestResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<LeaveRequestResponseModelView> GetByIdAsync(Guid id);

        /// <summary>
        /// Danh sách đơn nghỉ phép của một nhân viên (theo FromDate giảm dần).
        /// </summary>
        Task<List<LeaveRequestResponseModelView>> ByEmployeeIdAsync(Guid employeeId);

        /// <summary>
        /// Số dư sổ phép (theo năm) của một nhân viên — lấy từ LeaveLedger.
        /// Dùng để UI hiển thị "còn X phép" và kiểm tra trước khi tạo đơn.
        /// </summary>
        Task<List<LeaveLedgerSummaryModelView>> LedgerSummaryAsync(Guid employeeId, int year);

        // ===== Nghiệp vụ =====

        /// <summary>
        /// Tạo đơn nghỉ phép (mặc định Pending).
        /// </summary>
        Task<Guid> CreateAsync(CreateLeaveRequestModelView model, Guid requesterEmployeeId);

        /// <summary>
        /// Sửa đơn khi đơn còn Pending (chủ đơn hoặc HR/Admin).
        /// </summary>
        Task UpdateAsync(UpdateLeaveRequestModelView model, Guid requesterEmployeeId);

        /// <summary>
        /// Duyệt đơn. HR duyệt nhân viên + admin có hồ sơ; Admin duyệt HR.
        /// CHẶN TỰ DUYỆT. Nếu loại nghỉ có hạn mức (MaxDays) và năm
        /// trùng FromDate, sinh giao dịch Deduct idempotent trong LeaveLedger.
        /// </summary>
        Task ApproveAsync(Guid id, DecisionLeaveRequestModelView model, Guid approverEmployeeId);

        /// <summary>Từ chối đơn (giống ApproveAsync, trạng thái Rejected).</summary>
        Task RejectAsync(Guid id, DecisionLeaveRequestModelView model, Guid approverEmployeeId);

        /// <summary>
        /// Hủy đơn của chính mình (chỉ khi Pending). Nếu đã có giao dịch
        /// Deduct (do lỗi/rollback), sinh Refund.
        /// </summary>
        Task CancelAsync(Guid id, CancelLeaveRequestModelView model, Guid cancellerEmployeeId);

        // ===== Quản trị (admin) =====
        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}
