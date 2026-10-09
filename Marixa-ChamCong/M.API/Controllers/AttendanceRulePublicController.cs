using M.Contract.Repositories.Entities;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using M.Repositories.Context;

namespace M.API.Controllers;

// ===== QUY ĐỊNH CHẤM CÔNG (public) =====
// Trả về quy tắc chấm công HIỆN HÀNH để hiển thị cho mọi nhân viên
// trên trang "Quy định" (khu /attendance). Chỉ view, không ghi.
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AttendanceRulePublicController(DatabaseContext db) : ControllerBase
{
    public class RulePublicRow
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public int StandardHours { get; set; }
        public string CheckInTime { get; set; } = "";
        public string CheckOutTime { get; set; } = "";
        public int LateGraceMinutes { get; set; }
        public int EarlyLeaveThresholdMinutes { get; set; }
        public int BreakMinutes { get; set; }
        public bool PhotoRequired { get; set; }
        public bool GpsRequired { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
    }

    // Lấy tất cả quy tắc đang hiệu lực (không bị xoá).
    [HttpGet("active")]
    public async Task<IActionResult> Active()
    {
        var rules = await db.AttendanceRules.AsNoTracking()
            .Where(r => !r.DeletedTime.HasValue && r.IsActive)
            .OrderByDescending(r => r.CreatedTime)
            .ToListAsync();
        var rows = rules.Select(r => new RulePublicRow
        {
            Id = r.Id,
            Code = r.Code,
            Name = r.Name,
            Description = r.Description,
            StandardHours = r.StandardHours,
            CheckInTime = r.CheckInTime.ToString("HH:mm"),
            CheckOutTime = r.CheckOutTime.ToString("HH:mm"),
            LateGraceMinutes = r.LateGraceMinutes,
            EarlyLeaveThresholdMinutes = r.EarlyLeaveThresholdMinutes,
            BreakMinutes = r.BreakMinutes,
            PhotoRequired = r.PhotoRequired,
            GpsRequired = r.GpsRequired,
            IsActive = r.IsActive,
            CreatedTime = r.CreatedTime
        }).ToList();
        return Ok(new BaseResponse<List<RulePublicRow>>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, rows));
    }
}
