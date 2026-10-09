using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.WorkTaskModelView;
using System.Security.Claims;

namespace M.API.Controllers
{
    // ===== GIAO VIỆC + THEO DÕI + KÉO-THẢ + COMMENT =====
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WorkTaskController(IWorkTaskService workTaskService) : ControllerBase
    {
        // ---------- Helpers ----------
        private Guid CurrentEmployeeId() =>
            Guid.TryParse(User.FindFirstValue("employeeId"), out var id) ? id : Guid.Empty;
        private bool IsAdmin() => User.IsInRole("Admin") || User.IsInRole("HR");
        private bool CanManage() => User.IsInRole("Admin") || User.IsInRole("Manager") || User.IsInRole("HR");

        // ---------- Triggers ----------

        /// <summary>Việc của tôi (AssigneeId = tôi) - Kanban.</summary>
        [HttpGet("mine")]
        public async Task<IActionResult> Mine()
        {
            var employeeId = CurrentEmployeeId();
            if (employeeId == Guid.Empty)
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));
            var rows = await workTaskService.GetMyTasksAsync(employeeId);
            return Ok(new BaseResponse<List<WorkTaskRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Việc tôi đã giao (Admin: tất cả; Manager/HR: AssignedById = tôi).</summary>
        [HttpGet("assigned")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> Assigned()
        {
            var rows = await workTaskService.GetAssignedByMeAsync(CurrentEmployeeId(), IsAdmin());
            return Ok(new BaseResponse<List<WorkTaskRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Tất cả (Admin).</summary>
        [HttpGet("get-all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            var rows = await workTaskService.GetAllAsync();
            return Ok(new BaseResponse<List<WorkTaskRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Lấy 1 task (theo quyền).</summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var row = await workTaskService.GetByIdAsync(id);
            if (row is null) return NotFound();
            var me = CurrentEmployeeId();
            var mine = row.AssigneeId == me || row.AssignedById == me;
            if (!mine && !IsAdmin()) return Forbid();
            return Ok(new BaseResponse<WorkTaskRow>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, row));
        }

        /// <summary>Danh sách nhân viên được phép giao việc.</summary>
        [HttpGet("assignable")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> Assignable()
        {
            var rows = await workTaskService.GetAssignableAsync(CurrentEmployeeId(), IsAdmin());
            return Ok(new BaseResponse<List<AssignableEmployeeRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Giao việc (Manager: cùng phòng; Admin/HR: tất cả).</summary>
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateWorkTaskModelView form)
        {
            if (!CanManage()) return Forbid("Chỉ quản lý / HR / Admin được giao việc.");
            var row = await workTaskService.CreateAsync(CurrentEmployeeId(), form, IsAdmin());
            return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                new { message = "Đã giao nhiệm vụ.", row }));
        }

        /// <summary>KÉO-THẢ: đổi trạng thái + tiến độ.</summary>
        [HttpPut("{id:guid}/move")]
        public async Task<IActionResult> Move(Guid id, [FromBody] MoveWorkTaskModelView form)
        {
            var row = await workTaskService.MoveAsync(id, form, CurrentEmployeeId(), IsAdmin());
            return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                new { row.Id, row.Status, row.ProgressPercent, row.CompletedAt }));
        }

        /// <summary>Xóa (Admin).</summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await workTaskService.DeleteAsync(id);
            return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã xóa nhiệm vụ."));
        }

        // ---------- COMMENT ----------
        [HttpGet("{id:guid}/comments")]
        public async Task<IActionResult> Comments(Guid id)
        {
            var rows = await workTaskService.GetCommentsAsync(id);
            return Ok(new BaseResponse<List<WorkTaskCommentRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        [HttpPost("{id:guid}/comments")]
        public async Task<IActionResult> AddComment(Guid id, [FromBody] CreateWorkTaskCommentModelView form)
        {
            if (string.IsNullOrWhiteSpace(form.Content))
                return BadRequest(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Nội dung bình luận không được để trống."));
            var row = await workTaskService.AddCommentAsync(id, form, CurrentEmployeeId(), IsAdmin());
            return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
                new { message = "Đã thêm bình luận.", row }));
        }
    }
}
