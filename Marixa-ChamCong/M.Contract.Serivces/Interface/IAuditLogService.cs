using M.Core.Base;
using ModelViews.AuditLogModelView;

namespace M.Contract.Services.Interface
{
    /// <summary>
    /// Dịch vụ đọc/ghi audit trail (docs/01 requirement 6, docs/02 bảng audit_logs).
    /// Audit log là append-only: không UPDATE/DELETE nghiệp vụ, chỉ CREATE + READ.
    /// </summary>
    public interface IAuditLogService
    {
        /// <summary>Danh sách audit log phân trang (mặc định mới nhất trước).</summary>
        Task<BasePaginatedList<AuditLogResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        /// <summary>Lọc theo entity (loại + id) và/hoặc người thao tác.</summary>
        Task<BasePaginatedList<AuditLogResponseModelView>> QueryAsync(
            string? entityType,
            Guid? entityId,
            string? actorUserName,
            int pageNumber,
            int pageSize);

        /// <summary>1 bản ghi theo id.</summary>
        Task<AuditLogResponseModelView> GetByIdAsync(Guid id);

        /// <summary>Ghi một dòng audit log (dùng trong các service khi có thay đổi).</summary>
        Task CreateAsync(CreateAuditLogModelView model);
    }
}
