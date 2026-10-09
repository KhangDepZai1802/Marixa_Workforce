using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.WorkProjectModelView;
using System.Security.Claims;
using System.IO;

namespace M.API.Controllers
{
    // ===== DỰ ÁN / GÓI CÔNG VIỆC: tạo dự án, upload file, giao cho cấp dưới =====
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WorkProjectController(IWorkProjectService workProjectService, IWebHostEnvironment env) : ControllerBase
    {
        // ---------- Helpers ----------
        private Guid CurrentEmployeeId() =>
            Guid.TryParse(User.FindFirstValue("employeeId"), out var id) ? id : Guid.Empty;
        private bool IsFullScope() => User.IsInRole("Admin") || User.IsInRole("HR");

        // ---------- Triggers ----------

        /// <summary>Người có thể được giao việc (Admin/HR: tất cả; Manager: cấp dưới đệ quy).</summary>
        [HttpGet("subordinates")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> Subordinates()
        {
            var ownerId = CurrentEmployeeId();
            if (ownerId == Guid.Empty)
                return Ok(new BaseResponse<List<SelectableEmployeeRow>>(
                    StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, new List<SelectableEmployeeRow>()));

            var rows = await workProjectService.GetAssignableAsync(ownerId, IsFullScope());
            return Ok(new BaseResponse<List<SelectableEmployeeRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Dự án của tôi (owner + member).</summary>
        [HttpGet("mine")]
        public async Task<IActionResult> Mine()
        {
            var ownerId = CurrentEmployeeId();
            if (ownerId == Guid.Empty)
                return Ok(new BaseResponse<List<WorkProjectRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, new List<WorkProjectRow>()));
            var rows = await workProjectService.GetMineAsync(ownerId);
            return Ok(new BaseResponse<List<WorkProjectRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Toàn bộ dự án (Admin/Manager/HR).</summary>
        [HttpGet("get-all")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> GetAll()
        {
            var rows = await workProjectService.GetAllAsync();
            return Ok(new BaseResponse<List<WorkProjectRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
        }

        /// <summary>Tạo dự án + upload file + gán thành viên (cấp dưới).</summary>
        [HttpPost("create")]
        [Authorize(Roles = "Admin,Manager,HR")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Create([FromForm] CreateWorkProjectModelView form, IFormFile? file)
        {
            if (string.IsNullOrWhiteSpace(form.Name))
                return Ok(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION", "Vui lòng nhập tên dự án."));
            if (form.EndDate < form.StartDate)
                return Ok(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION", "Ngày kết thúc phải sau ngày bắt đầu."));

            // Upload file đính kèm (nếu có) -> /uploads/work-projects/{yyyyMM}/
            if (file is { Length: > 0 })
            {
                string ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                string safe = $"{Guid.NewGuid()}{ext}";
                string folder = DateTime.Now.ToString("yyyyMM");
                string dir = Path.Combine(M.API.PhotoStore.GetRoot(env), "work-projects", folder);
                Directory.CreateDirectory(dir);
                string abs = Path.Combine(dir, safe);
                await using (var stream = new FileStream(abs, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                form.FileName = file.FileName;
                form.FileUrl = $"/uploads/work-projects/{folder}/{safe}";
            }

            var ownerId = CurrentEmployeeId();
            if (ownerId == Guid.Empty)
                return Ok(new BaseResponse<string>(StatusCodeHelper.BadRequest, "VALIDATION",
                    "Tài khoản chưa liên kết hồ sơ nhân viên."));

            var row = await workProjectService.CreateAsync(ownerId, form);
            return Ok(new BaseResponse<WorkProjectRow>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, row));
        }
    }
}
