using M.Contract.Repositories.Entities;
using M.Contract.Repositories.Entity;
using M.Core.Base;
using M.Core.Store;
using M.Repositories.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace M.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EmployeePromotionController(DatabaseContext db, UserManager<ApplicationUser> users) : ControllerBase
{
    private static readonly string[] AssignableRoles = ["Employee", "Manager", "HR"];

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var employeeId = CurrentEmployeeId();
        if (employeeId == Guid.Empty) return BadRequest("Tài khoản chưa liên kết hồ sơ nhân viên.");
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
            await Query().Where(x => x.EmployeeId == employeeId).OrderByDescending(x => x.CreatedTime).ToListAsync()));
    }

    [HttpGet("get-all")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> GetAll()
    {
        var query = Query();
        if (!User.IsInRole("Admin") && !User.IsInRole("HR"))
        {
            var managerId = CurrentEmployeeId();
            query = query.Where(x => x.ManagerId == managerId || x.DepartmentManagerId == managerId || x.ProposedByEmployeeId == managerId);
        }
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
            await query.OrderByDescending(x => x.CreatedTime).ToListAsync()));
    }

    [HttpGet("options")]
    public async Task<IActionResult> Options()
    {
        var canNominate = User.IsInRole("Admin") || User.IsInRole("HR") || User.IsInRole("Manager");
        var employeeQuery = db.Employees.Where(e => canNominate && e.Status != EmployeeStatus.Resigned && e.Status != EmployeeStatus.Terminated);
        if (canNominate && !User.IsInRole("Admin") && !User.IsInRole("HR"))
        {
            var managerId = CurrentEmployeeId();
            employeeQuery = employeeQuery.Where(e => e.ManagerId == managerId || e.Department!.ManagerId == managerId);
        }
        var currentEmployeeId = CurrentEmployeeId();
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, new
        {
            Employees = await employeeQuery
            .Select(e => new { e.Id, e.EmployeeCode, Name = e.GivenName + " " + e.FamilyName, e.DepartmentId, Department = e.Department == null ? "" : e.Department.Name, Position = e.Position == null ? "" : e.Position.Name, e.UserId }).ToListAsync(),
            CurrentEmployee = await db.Employees.Where(e => e.Id == currentEmployeeId)
            .Select(e => new { e.Id, e.EmployeeCode, Name = e.GivenName + " " + e.FamilyName, Department = e.Department == null ? "" : e.Department.Name, Position = e.Position == null ? "" : e.Position.Name }).FirstOrDefaultAsync(),
            Positions = await db.Positions.Where(p => p.IsActive).Select(p => new { p.Id, p.Code, p.Name }).ToListAsync(),
            Roles = canNominate ? AssignableRoles : ["Employee"]
        }));
    }

    [HttpPost("request")]
    public async Task<IActionResult> CreateRequest(PromotionRequest form)
    {
        if (!ModelState.IsValid || string.IsNullOrWhiteSpace(form.Reason) || form.Reason.Trim().Length < 5) return BadRequest("Vui lòng nhập lý do đề xuất (ít nhất 5 ký tự).");
        if (form.NewPositionId == Guid.Empty) return BadRequest("Vui lòng chọn chức vụ đề xuất.");
        if (form.EffectiveDate.Date < DateTime.UtcNow.Date) return BadRequest("Ngày hiệu lực không được nằm trong quá khứ.");
        if (!AssignableRoles.Contains(form.TargetRoleName, StringComparer.OrdinalIgnoreCase)) return BadRequest("Vai trò được chọn không hợp lệ.");
        var targetRole = AssignableRoles.First(x => x.Equals(form.TargetRoleName, StringComparison.OrdinalIgnoreCase));
        var userId = CurrentUserId();
        var proposerId = CurrentEmployeeId();
        if (userId == Guid.Empty || proposerId == Guid.Empty) return BadRequest("Tài khoản chưa liên kết hồ sơ nhân viên.");
        var employeeId = form.EmployeeId ?? proposerId;
        var selfRequest = employeeId == proposerId;
        if (!selfRequest && !(User.IsInRole("Admin") || User.IsInRole("HR") || User.IsInRole("Manager"))) return Forbid();
        if (!selfRequest && !await CanManageEmployee(employeeId)) return Forbid();
        var employee = await db.Employees.Include(e => e.Position).Include(e => e.Department).FirstOrDefaultAsync(e => e.Id == employeeId);
        var position = await db.Positions.FirstOrDefaultAsync(p => p.Id == form.NewPositionId && p.IsActive);
        if (employee == null || position == null) return NotFound("Không tìm thấy nhân viên hoặc chức vụ đang hoạt động.");
        if (employee.PositionId == position.Id) return BadRequest("Nhân viên đang giữ chức vụ này.");
        if ((targetRole is "HR" or "Manager") && employee.UserId == null) return BadRequest("Cần cấp tài khoản cho nhân viên trước khi gán quyền.");
        if (await db.EmployeePromotions.AnyAsync(x => x.EmployeeId == employeeId && x.Status == EmployeePromotionStatus.Pending)) return Conflict("Nhân viên đã có đề xuất thăng chức đang chờ xử lý.");
        var proposer = await db.Employees.FirstOrDefaultAsync(e => e.Id == proposerId);
        db.EmployeePromotions.Add(new EmployeePromotion
        {
            EmployeeId = employee.Id,
            CurrentEmployeeCode = employee.EmployeeCode,
            CurrentPositionName = employee.Position?.Name,
            NewPositionId = position.Id,
            NewPositionName = position.Name,
            NewPositionCode = position.Code,
            TargetRoleName = targetRole,
            ProposedByUserId = userId,
            ProposedByEmployeeId = proposerId,
            ProposedByName = proposer == null ? User.Identity?.Name ?? "Người dùng" : $"{proposer.GivenName} {proposer.FamilyName}",
            ProposalType = selfRequest ? EmployeePromotionType.EmployeeRequest : EmployeePromotionType.ManagerNomination,
            Reason = form.Reason.Trim(),
            AdditionalNote = form.AdditionalNote?.Trim(),
            EffectiveDate = form.EffectiveDate.Date,
            Status = EmployeePromotionStatus.Pending
        });
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, new { message = "Đã gửi đề xuất thăng chức." }));
    }

    [HttpPost("review/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> Review(Guid id, PromotionReview form)
    {
        var promotion = await db.EmployeePromotions.FirstOrDefaultAsync(x => x.Id == id);
        if (promotion == null) return NotFound();
        if (promotion.Status != EmployeePromotionStatus.Pending) return Conflict("Đề xuất này đã được xử lý.");
        var elevated = User.IsInRole("Admin") || User.IsInRole("HR");
        var reviewerEmployeeId = CurrentEmployeeId();
        if (promotion.ProposedByUserId == CurrentUserId() && !elevated &&
            (promotion.ProposalType == EmployeePromotionType.EmployeeRequest || promotion.EmployeeId == reviewerEmployeeId)) return Forbid();
        if (!elevated && !await CanManageEmployee(promotion.EmployeeId)) return Forbid();
        if (form.Approve && !elevated && !User.IsInRole("Manager")) return Forbid();
        if (!form.Approve && string.IsNullOrWhiteSpace(form.Comment)) return BadRequest("Vui lòng ghi lý do từ chối.");

        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == promotion.EmployeeId);
        if (employee == null) return NotFound();
        if (form.Approve)
        {
            var position = await db.Positions.FirstOrDefaultAsync(p => p.Id == promotion.NewPositionId && p.IsActive);
            if (position == null) return BadRequest("Chức vụ đề xuất không còn hoạt động.");
            var codePrefix = string.IsNullOrWhiteSpace(position.Code) ? "EMP" : position.Code.Trim().ToUpperInvariant();
            var existingCodes = await db.Employees.Select(e => e.EmployeeCode).ToListAsync();
            var suffix = existingCodes.Where(code => code.StartsWith(codePrefix + "-", StringComparison.OrdinalIgnoreCase))
                .Select(code => int.TryParse(code[(code.LastIndexOf('-') + 1)..], out var n) ? n : 0).DefaultIfEmpty().Max() + 1;
            var newCode = $"{codePrefix}-{suffix:D3}";
            while (existingCodes.Contains(newCode, StringComparer.OrdinalIgnoreCase)) newCode = $"{codePrefix}-{++suffix:D3}";
            employee.EmployeeCode = newCode;
            employee.PositionId = position.Id;
            promotion.NewEmployeeCode = newCode;
            if (employee.UserId is Guid linkedUserId)
            {
                var linkedUser = await users.FindByIdAsync(linkedUserId.ToString());
                if (linkedUser == null) return BadRequest("Không tìm thấy tài khoản liên kết.");
                var currentRoles = await users.GetRolesAsync(linkedUser);
                var roleToAssign = AssignableRoles.First(x => x.Equals(promotion.TargetRoleName, StringComparison.OrdinalIgnoreCase));
                if (roleToAssign == "HR" && !User.IsInRole("Admin") && !User.IsInRole("HR")) return Forbid();
                foreach (var role in currentRoles.Where(r => AssignableRoles.Contains(r, StringComparer.OrdinalIgnoreCase) && r != "Employee" && r != roleToAssign))
                    if (!(await users.RemoveFromRoleAsync(linkedUser, role)).Succeeded) return BadRequest("Không thể cập nhật vai trò tài khoản.");
                if (!currentRoles.Contains("Employee") && !(await users.AddToRoleAsync(linkedUser, "Employee")).Succeeded) return BadRequest("Không thể gán vai trò nhân viên.");
                if (!currentRoles.Contains(roleToAssign) && !(await users.AddToRoleAsync(linkedUser, roleToAssign)).Succeeded) return BadRequest("Không thể gán vai trò mới.");
            }
            else if (promotion.TargetRoleName is "HR" or "Manager") return BadRequest("Cần liên kết tài khoản trước khi cấp quyền.");
            promotion.Status = EmployeePromotionStatus.Approved;
            promotion.AppliedAt = DateTime.UtcNow;
        }
        else promotion.Status = EmployeePromotionStatus.Rejected;

        var reviewerId = CurrentEmployeeId();
        var reviewer = reviewerId == Guid.Empty ? null : await db.Employees.FindAsync(reviewerId);
        promotion.DecisionNote = form.Comment?.Trim();
        promotion.ReviewedByUserId = CurrentUserId();
        promotion.ReviewedByEmployeeId = reviewerId == Guid.Empty ? null : reviewerId;
        promotion.ReviewedByName = reviewer == null ? User.Identity?.Name ?? "Quản trị viên" : $"{reviewer.GivenName} {reviewer.FamilyName}";
        promotion.ReviewedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
            new { message = form.Approve ? "Đã duyệt thăng chức và cập nhật hồ sơ, quyền tài khoản." : "Đã từ chối đề xuất." }));
    }

    private IQueryable<PromotionRow> Query()
    {
        var canReviewAll = User.IsInRole("Admin") || User.IsInRole("HR");
        var canReviewAsManager = User.IsInRole("Manager");
        var managerId = CurrentEmployeeId();
        return from x in db.EmployeePromotions
               join e in db.Employees on x.EmployeeId equals e.Id
               join department in db.Departments on e.DepartmentId equals department.Id into departments
               from department in departments.DefaultIfEmpty()
               join position in db.Positions on e.PositionId equals position.Id into positions
               from position in positions.DefaultIfEmpty()
               join manager in db.Employees on e.ManagerId equals manager.Id into managers
               from manager in managers.DefaultIfEmpty()
               select new PromotionRow
               {
                   Id = x.Id,
                   EmployeeId = x.EmployeeId,
                   EmployeeName = e.GivenName + " " + e.FamilyName,
                   DepartmentName = department == null ? "" : department.Name,
                   ManagerId = e.ManagerId,
                   DepartmentManagerId = department == null ? null : department.ManagerId,
                   PhoneNumber = e.PhoneNumber,
                   Email = e.Email,
                   StartDate = e.StartDate,
                   CurrentPosition = position == null ? "" : position.Name,
                   ManagerName = manager == null ? "" : manager.GivenName + " " + manager.FamilyName,
                   CurrentEmployeeCode = x.CurrentEmployeeCode,
                   CurrentPositionName = x.CurrentPositionName,
                   NewEmployeeCode = x.NewEmployeeCode,
                   NewPositionId = x.NewPositionId,
                   NewPositionName = x.NewPositionName,
                   NewPositionCode = x.NewPositionCode,
                   TargetRoleName = x.TargetRoleName,
                   ProposedByName = x.ProposedByName,
                   ProposedByEmployeeId = x.ProposedByEmployeeId,
                   CanReview = canReviewAll || (canReviewAsManager && x.TargetRoleName != "HR" && x.EmployeeId != managerId && (e.ManagerId == managerId || (department != null && department.ManagerId == managerId))),
                   ProposalType = x.ProposalType,
                   Reason = x.Reason,
                   AdditionalNote = x.AdditionalNote,
                   DecisionNote = x.DecisionNote,
                   EffectiveDate = x.EffectiveDate,
                   Status = x.Status,
                   ReviewedByName = x.ReviewedByName,
                   ReviewedAt = x.ReviewedAt,
                   AppliedAt = x.AppliedAt,
                   CreatedTime = x.CreatedTime
               };
    }

    private Guid CurrentEmployeeId() => Guid.TryParse(User.FindFirstValue("employeeId"), out var id) ? id : Guid.Empty;
    private Guid CurrentUserId() => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
    private Task<bool> CanManageEmployee(Guid id)
    {
        if (User.IsInRole("Admin") || User.IsInRole("HR")) return Task.FromResult(true);
        var managerId = CurrentEmployeeId();
        return db.Employees.AnyAsync(e => e.Id == id && (e.ManagerId == managerId || e.Department!.ManagerId == managerId));
    }
}

public class PromotionRow
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public Guid? ManagerId { get; set; }
    public Guid? DepartmentManagerId { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public DateTime? StartDate { get; set; }
    public string CurrentPosition { get; set; } = string.Empty;
    public string ManagerName { get; set; } = string.Empty;
    public bool CanReview { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string CurrentEmployeeCode { get; set; } = string.Empty;
    public string? CurrentPositionName { get; set; }
    public string? NewEmployeeCode { get; set; }
    public Guid NewPositionId { get; set; }
    public string NewPositionName { get; set; } = string.Empty;
    public string NewPositionCode { get; set; } = string.Empty;
    public string TargetRoleName { get; set; } = string.Empty;
    public string ProposedByName { get; set; } = string.Empty;
    public Guid? ProposedByEmployeeId { get; set; }
    public int ProposalType { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? AdditionalNote { get; set; }
    public string? DecisionNote { get; set; }
    public DateTime EffectiveDate { get; set; }
    public int Status { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime? AppliedAt { get; set; }
    public DateTimeOffset CreatedTime { get; set; }
}

public class PromotionRequest
{
    public Guid? EmployeeId { get; set; }
    public Guid NewPositionId { get; set; }
    public string TargetRoleName { get; set; } = "Employee";
    public string Reason { get; set; } = string.Empty;
    public string? AdditionalNote { get; set; }
    public DateTime EffectiveDate { get; set; } = DateTime.Today;
}

public class PromotionReview
{
    public bool Approve { get; set; }
    public string? Comment { get; set; }
}
