using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.LeaveLedgerModelView;
using ModelViews.LeaveRequestModelView;
using System.Security.Claims;

namespace M.API.Controllers
{
    // ===== NGHỈ PHÉP =====
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LeaveRequestController : ControllerBase
    {
        private readonly ILeaveRequestService _leaveRequestService;

        public LeaveRequestController(ILeaveRequestService leaveRequestService)
        {
            _leaveRequestService = leaveRequestService;
        }

        // ---------- Helpers ----------
        private Guid CurrentEmployeeId() =>
            Guid.TryParse(User.FindFirstValue("employeeId"), out var id) ? id : Guid.Empty;

        private bool IsAdmin() => User.IsInRole("Admin");
        private bool IsAdminOrHR() => User.IsInRole("Admin") || User.IsInRole("HR");
        private bool CanManage() => User.IsInRole("Admin") || User.IsInRole("Manager") || User.IsInRole("HR");

        // ---------- Truy vấn ----------

        /// <summary>Tất cả đơn nghỉ phép (phân trang, giảm dần FromDate).</summary>
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 20)
        {
            var result = await _leaveRequestService.GetAllAsync(pageNumber, pageSize);
            return Ok(new BaseResponse<BasePaginatedList<LeaveRequestResponseModelView>>(
                StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, result));
        }

        /// <summary>Đơn nghỉ phép của chính tôi.</summary>
        [HttpGet("mine")]
        public async Task<IActionResult> Mine()
        {
            var employeeId = CurrentEmployeeId();
            if (employeeId == Guid.Empty)
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));
            var items = await _leaveRequestService.ByEmployeeIdAsync(employeeId);
            return Ok(new BaseResponse<List<LeaveRequestResponseModelView>>(
                StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, items));
        }

        /// <summary>Chi tiết 1 đơn.</summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var row = await _leaveRequestService.GetByIdAsync(id);
            if (row.EmployeeId != CurrentEmployeeId() && !IsAdminOrHR())
                return Forbid();
            return Ok(new BaseResponse<LeaveRequestResponseModelView>(
                StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, row));
        }

        /// <summary>Đơn theo nhân viên (HR/Admin).</summary>
        [HttpGet("by-employee/{employeeId:guid}")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> ByEmployee(Guid employeeId)
        {
            var items = await _leaveRequestService.ByEmployeeIdAsync(employeeId);
            return Ok(new BaseResponse<List<LeaveRequestResponseModelView>>(
                StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, items));
        }

        /// <summary>Số dư sổ phép (cho 1 nhân viên, 1 năm).</summary>
        [HttpGet("ledger-summary/{employeeId:guid}")]
        [Authorize(Roles = "Admin,HR")]
        public async Task<IActionResult> LedgerSummary(Guid employeeId, int year)
        {
            var items = await _leaveRequestService.LedgerSummaryAsync(employeeId, year);
            return Ok(new BaseResponse<List<LeaveLedgerSummaryModelView>>(
                StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, items));
        }

        // ---------- Nghiệp vụ ----------

        /// <summary>Tạo đơn nghỉ phép (chủ nhân viên, hoặc HR/Admin tạo hộ).</summary>
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateLeaveRequestModelView model)
        {
            var employeeId = CurrentEmployeeId();
            if (employeeId == Guid.Empty)
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));

            var id = await _leaveRequestService.CreateAsync(model, employeeId);
            return Ok(new BaseResponse<Guid>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, id));
        }

        /// <summary>Sửa đơn (chỉ khi Pending; chủ đơn hoặc HR/Admin).</summary>
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateLeaveRequestModelView model)
        {
            var employeeId = CurrentEmployeeId();
            if (employeeId == Guid.Empty)
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));

            await _leaveRequestService.UpdateAsync(model, employeeId);
            return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                "Đã cập nhật đơn nghỉ phép."));
        }

        /// <summary>Duyệt đơn (HR / Manager / Admin, không tự duyệt).</summary>
        [HttpPost("approve/{id:guid}")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> Approve(Guid id, [FromBody] DecisionLeaveRequestModelView model)
        {
            var employeeId = CurrentEmployeeId();
            if (employeeId == Guid.Empty)
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));

            await _leaveRequestService.ApproveAsync(id, model, employeeId);
            return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                "Đã duyệt đơn nghỉ phép."));
        }

        /// <summary>Từ chối đơn (HR / Manager / Admin, không tự duyệt).</summary>
        [HttpPost("reject/{id:guid}")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> Reject(Guid id, [FromBody] DecisionLeaveRequestModelView model)
        {
            var employeeId = CurrentEmployeeId();
            if (employeeId == Guid.Empty)
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));

            await _leaveRequestService.RejectAsync(id, model, employeeId);
            return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                "Đã từ chối đơn nghỉ phép."));
        }

        /// <summary>Hủy đơn của chính mình (chủ nhân viên, chỉ khi Pending).</summary>
        [HttpPost("cancel/{id:guid}")]
        public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelLeaveRequestModelView model)
        {
            var employeeId = CurrentEmployeeId();
            if (employeeId == Guid.Empty)
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));

            await _leaveRequestService.CancelAsync(id, model, employeeId);
            return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                "Đã hủy đơn nghỉ phép."));
        }

        // ---------- Quản trị ----------

        /// <summary>Soft delete (Admin).</summary>
        [HttpDelete("soft-delete/{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _leaveRequestService.SoftDeleteAsync(id);
            return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                "Đã xóa mềm đơn nghỉ phép."));
        }

        /// <summary>Xóa cứng + xóa ledger liên quan (Admin).</summary>
        [HttpDelete("delete/{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _leaveRequestService.DeleteAsync(id);
            return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                "Đã xóa đơn nghỉ phép."));
        }
    }
}
