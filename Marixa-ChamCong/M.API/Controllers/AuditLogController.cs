using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.AuditLogModelView;

namespace M.API.Controllers
{
    /// <summary>
    /// Endpoint đọc audit trail (docs/01 requirement 6). Append-only: không có
    /// endpoint sửa/xóa nghiệp vụ; ghi log được thực hiện bên trong các service
    /// khi có thay đổi. Chỉ Admin xem toàn bộ.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Manager,HR")]
    public class AuditLogController : ControllerBase
    {
        private readonly IAuditLogService _auditLogService;

        public AuditLogController(IAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        /// <summary>Danh sách audit log (phân trang, mới nhất trước).</summary>
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 20)
        {
            BasePaginatedList<AuditLogResponseModelView> result =
                await _auditLogService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<AuditLogResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result));
        }

        /// <summary>Lọc audit log theo entity / người thao tác.</summary>
        [HttpGet("query")]
        public async Task<IActionResult> Query(
            [FromQuery] string? entityType,
            [FromQuery] Guid? entityId,
            [FromQuery] string? actorUserName,
            int pageNumber = 1,
            int pageSize = 20)
        {
            BasePaginatedList<AuditLogResponseModelView> result =
                await _auditLogService.QueryAsync(
                    entityType, entityId, actorUserName, pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<AuditLogResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result));
        }

        /// <summary>1 bản ghi audit log theo id.</summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            AuditLogResponseModelView result =
                await _auditLogService.GetByIdAsync(id);

            return Ok(new BaseResponse<AuditLogResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result));
        }
    }
}
