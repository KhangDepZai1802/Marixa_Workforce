using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.WorkPerformanceModelView;
using System.Security.Claims;

namespace M.API.Controllers
{
    // ===== ĐÁNH GIÁ HIỆU SUẤT (KPI) =====
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WorkPerformanceController(IWorkPerformanceService workPerformanceService) : ControllerBase
    {
        // ---------- Helpers ----------
        private Guid CurrentEmployeeId() =>
            Guid.TryParse(User.FindFirstValue("employeeId"), out var id) ? id : Guid.Empty;
        private bool IsAdmin() => User.IsInRole("Admin");
        private bool IsAdminOrHR() => User.IsInRole("Admin") || User.IsInRole("HR");
        private bool CanManage() => User.IsInRole("Admin") || User.IsInRole("Manager") || User.IsInRole("HR");

        // ---------- Triggers ----------

        /// <summary>Đánh giá của tôi (được đánh giá).</summary>
        [HttpGet("mine")]
        public async Task<IActionResult> Mine()
        {
            var employeeId = CurrentEmployeeId();
            if (employeeId == Guid.Empty)
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));
            var rows = await workPerformanceService.GetMineAsync(employeeId);
            return Ok(new BaseResponse<List<WorkPerformanceRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Toàn bộ / theo quyền (Admin: tất cả; Manager/HR: đánh giá của họ + họ).</summary>
        [HttpGet("get-all")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> GetAll()
        {
            var rows = await workPerformanceService.GetAllAsync(CurrentEmployeeId(), IsAdmin());
            return Ok(new BaseResponse<List<WorkPerformanceRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Lấy 1 đánh giá (theo quyền).</summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var row = await workPerformanceService.GetByIdAsync(id);
            if (row is null) return NotFound();
            var me = CurrentEmployeeId();
            var mine = row.EmployeeId == me || row.RatedById == me;
            if (!mine && !IsAdminOrHR()) return Forbid();
            return Ok(new BaseResponse<WorkPerformanceRow>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, row));
        }

        /// <summary>Tạo đánh giá (Manager/Admin/HR).</summary>
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateWorkPerformanceModelView form)
        {
            if (!CanManage()) return Forbid("Chỉ quản lý / HR / Admin được đánh giá hiệu suất.");
            var id = await workPerformanceService.CreateAsync(CurrentEmployeeId(), form);
            return Ok(new BaseResponse<Guid>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, id));
        }

        /// <summary>Nhân viên xác nhận / phản hồi đánh giá.</summary>
        [HttpPost("{id:guid}/confirm")]
        public async Task<IActionResult> Confirm(Guid id, [FromBody] ConfirmWorkPerformanceModelView form)
        {
            await workPerformanceService.ConfirmAsync(id, form, CurrentEmployeeId());
            return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                "Đã xác nhận đánh giá hiệu suất."));
        }
    }
}
