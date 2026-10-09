using M.Contract.Repositories.Entities;
using M.Core.Base;
using M.Core.Store;
using M.Repositories.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace M.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EmployeeReportController(DatabaseContext db, IWebHostEnvironment environment) : ControllerBase
{
    private const long MaxFileSize = 20 * 1024 * 1024;
    private static readonly HashSet<string> Extensions = new(StringComparer.OrdinalIgnoreCase)
        { ".pdf", ".xls", ".xlsx", ".doc", ".docx" };
    [HttpGet("get-all")]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? period,
        [FromQuery] Guid? departmentId, [FromQuery] Guid? employeeId, [FromQuery] int? status,
        [FromQuery] string? reportType, [FromQuery] bool? overdue)
    {
        var query = db.EmployeeReports.Include(r => r.Employee).ThenInclude(e => e!.Department)
            .Include(r => r.Versions).ThenInclude(v => v.Attachments).Include(r => r.Events).AsQueryable();
        if (User.IsInRole("Manager") && !User.IsInRole("Admin") && !User.IsInRole("HR"))
        {
            var managerId = CurrentEmployeeId();
            query = query.Where(r => r.Employee!.ManagerId == managerId || r.Employee.Department!.ManagerId == managerId);
        }
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.ReportCode.Contains(search) || r.Title.Contains(search) || r.Employee!.GivenName.Contains(search) || r.Employee.FamilyName.Contains(search) || r.Versions.Any(v => v.FileName.Contains(search) || v.Attachments.Any(a => a.FileName.Contains(search))));
        if (!string.IsNullOrWhiteSpace(period) && DateTime.TryParse($"{period}-01", out var month))
            query = query.Where(r => r.Period.Year == month.Year && r.Period.Month == month.Month);
        if (departmentId.HasValue) query = query.Where(r => r.Employee!.DepartmentId == departmentId);
        if (employeeId.HasValue) query = query.Where(r => r.EmployeeId == employeeId);
        if (status.HasValue) query = query.Where(r => r.Status == status);
        if (!string.IsNullOrWhiteSpace(reportType)) query = query.Where(r => r.ReportType.Contains(reportType));
        if (overdue == true) query = query.Where(r => r.Status != EmployeeReportStatus.Rejected && r.Status != EmployeeReportStatus.UpperApproved && r.Status != EmployeeReportStatus.Completed && r.Deadline.HasValue && r.Deadline < DateTime.UtcNow);
        if (overdue == false) query = query.Where(r => !r.Deadline.HasValue || r.Deadline >= DateTime.UtcNow);
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
            await query.OrderByDescending(r => r.SubmittedAt).Select(ToResult()).ToListAsync()));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine() => await ListForEmployee(CurrentEmployeeId());

    [HttpGet("by-employee/{employeeId:guid}")]
    public async Task<IActionResult> ByEmployee(Guid employeeId)
    {
        if (employeeId != CurrentEmployeeId() && !await CanManageEmployee(employeeId)) return Forbid();
        return await ListForEmployee(employeeId);
    }

    [HttpPost("submit")]
    [RequestSizeLimit(MaxFileSize + 1024 * 1024)]
    public async Task<IActionResult> Submit([FromForm] ReportSubmitForm form)
    {
        var employeeId = CurrentEmployeeId();
        if (!await db.Employees.AnyAsync(e => e.Id == employeeId)) return BadRequest("Tài khoản chưa liên kết nhân viên.");
        var files = new[] { form.File }.Where(f => f != null).Cast<IFormFile>().Concat(form.Files ?? []).ToList();
        if (files.Count == 0) return BadRequest("Vui lòng chọn file báo cáo.");
        var validation = ValidateFiles(files);
        if (validation != null) return BadRequest(validation);
        if (string.IsNullOrWhiteSpace(form.Title) || string.IsNullOrWhiteSpace(form.ReportType) || !DateTime.TryParse($"{form.Period}-01", out var period))
            return BadRequest("Vui lòng nhập tên, loại và kỳ báo cáo hợp lệ.");

        var report = form.ReportId.HasValue
            ? await db.EmployeeReports.Include(r => r.Versions).ThenInclude(v => v.Attachments).FirstOrDefaultAsync(r => r.Id == form.ReportId && r.EmployeeId == employeeId)
            : null;
        if (report != null && report.Status is not (EmployeeReportStatus.Rejected or EmployeeReportStatus.ChangesRequested or EmployeeReportStatus.UpperChangesRequested)) return BadRequest("Chỉ có thể nộp lại báo cáo bị từ chối hoặc yêu cầu chỉnh sửa.");
        if (form.ReportId.HasValue && report == null) return NotFound();
        var isResubmission = report != null;
        var oldStoredNames = new List<string>();
        var now = DateTime.UtcNow;
        if (report == null)
        {
            report = new EmployeeReport { ReportCode = $"BC-{period:yyyy}-{Guid.NewGuid():N}"[..15], EmployeeId = employeeId };
            db.EmployeeReports.Add(report);
        }
        else
        {
            var oldVersions = report.Versions.ToList();
            oldStoredNames = oldVersions.SelectMany(version => new[] { version.StoredName }.Concat(version.Attachments.Select(attachment => attachment.StoredName))).Distinct().ToList();
            db.EmployeeReportVersions.RemoveRange(oldVersions);
            report.Versions.Clear();
            report.Status = EmployeeReportStatus.PendingManager;
            report.ManagerComment = null;
            report.UpperRequest = null;
            report.UpperRequestDeadline = null;
            report.SentToUpper = false;
            report.SentToUpperAt = null;
            report.UpperRecipientEmployeeId = null;
        }
        report.Title = form.Title.Trim();
        report.ReportType = form.ReportType.Trim();
        report.Period = period;
        report.Deadline = DateTime.TryParse(form.Deadline, out var deadline) ? deadline : null;
        report.SubmittedAt = now;
        report.ReviewedAt = null;
        report.ReviewedBy = null;
        report.Overview = form.Overview;
        report.Results = form.Results;
        report.Issues = form.Issues;
        report.Recommendations = form.Recommendations;
        var file = files[0];
        var version = new EmployeeReportVersion { Report = report, Version = report.Versions.Count + 1, FileName = Path.GetFileName(file.FileName), StoredName = Guid.NewGuid().ToString("N") + Path.GetExtension(file.FileName), FileSize = file.Length, UploadedBy = employeeId, UploadedAt = now };
        await SaveFile(file, version.StoredName);
        foreach (var attachment in files.Skip(1))
        {
            var storedName = Guid.NewGuid().ToString("N") + Path.GetExtension(attachment.FileName);
            await SaveFile(attachment, storedName);
            version.Attachments.Add(new EmployeeReportAttachment { FileName = Path.GetFileName(attachment.FileName), StoredName = storedName, FileSize = attachment.Length });
        }
        db.EmployeeReportVersions.Add(version);
        AddEvent(report, isResubmission ? "Nhân viên nộp lại báo cáo" : "Nhân viên gửi báo cáo", null);
        if (!isResubmission) AddEvent(report, "Hệ thống chuyển báo cáo đến quản lý", null);
        await db.SaveChangesAsync();
        DeleteStoredFiles(oldStoredNames);
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, new { report.Id, report.ReportCode }));
    }

    [HttpPost("review/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewForm form)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        if (report.Status is not (EmployeeReportStatus.PendingManager or EmployeeReportStatus.ChangesRequested)) return BadRequest("Báo cáo này đã được xử lý.");
        if (form.Status is not (EmployeeReportStatus.ManagerApproved or EmployeeReportStatus.Rejected or EmployeeReportStatus.ChangesRequested)) return BadRequest("Trạng thái duyệt không hợp lệ.");
        if ((form.Status is EmployeeReportStatus.Rejected or EmployeeReportStatus.ChangesRequested) && string.IsNullOrWhiteSpace(form.Comment)) return BadRequest("Vui lòng nhập lý do hoặc yêu cầu chỉnh sửa.");
        report.Status = form.Status;
        report.ManagerComment = form.Comment?.Trim();
        report.ReviewedBy = CurrentEmployeeIdOrNull();
        report.ReviewedAt = DateTime.UtcNow;
        AddEvent(report, form.Status switch { EmployeeReportStatus.ManagerApproved => "Quản lý duyệt", EmployeeReportStatus.ChangesRequested => "Quản lý yêu cầu sửa", _ => "Quản lý từ chối" }, form.Comment);
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã cập nhật trạng thái báo cáo."));
    }

    [HttpPost("forward/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> Forward(Guid id, [FromBody] ForwardForm form)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        if (report.Status is not (EmployeeReportStatus.PendingManager or EmployeeReportStatus.ChangesRequested or EmployeeReportStatus.ManagerApproved)) return BadRequest("Báo cáo này đã được xử lý.");
        if (string.IsNullOrWhiteSpace(form.Recipient)) return BadRequest("Chọn người nhận tiếp theo.");
        if (!form.RecipientEmployeeId.HasValue || form.RecipientEmployeeId == report.EmployeeId || !await db.Employees.AnyAsync(e => e.Id == form.RecipientEmployeeId)) return BadRequest("Người nhận cấp trên không hợp lệ.");
        if (form.Recipient.Trim().Length > 200) return BadRequest("Thông tin người nhận vượt quá giới hạn cho phép.");
        if (form.Note?.Length > 2000) return BadRequest("Ghi chú gửi cấp trên tối đa 2000 ký tự.");
        if (report.Status != EmployeeReportStatus.ManagerApproved)
        {
            report.ReviewedBy = CurrentEmployeeIdOrNull();
            report.ReviewedAt = DateTime.UtcNow;
            AddEvent(report, "Quản lý duyệt", null);
        }
        report.Status = EmployeeReportStatus.SentToUpper;
        report.UpperRecipient = form.Recipient.Trim();
        report.UpperRecipientEmployeeId = form.RecipientEmployeeId;
        report.UpperNote = form.Note?.Trim();
        report.SentToUpper = true;
        report.SentToUpperAt = DateTime.UtcNow;
        report.SentToUpperBy = CurrentEmployeeIdOrNull();
        AddEvent(report, "Quản lý gửi cấp trên", form.Note, form.Recipient);
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã gửi báo cáo lên cấp trên."));
    }

    [HttpPost("upper-request/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> UpperRequest(Guid id, [FromBody] UpperRequestForm form)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        if (report.Status is not (EmployeeReportStatus.SentToUpper or EmployeeReportStatus.UpperApproved)) return BadRequest("Báo cáo chưa được gửi cấp trên.");
        if (report.UpperRecipientEmployeeId != CurrentEmployeeId()) return Forbid();
        if (string.IsNullOrWhiteSpace(form.Request)) return BadRequest("Nhập nội dung yêu cầu từ cấp trên.");
        report.Status = EmployeeReportStatus.UpperChangesRequested;
        report.UpperRequest = form.Request.Trim();
        report.UpperRequestDeadline = form.Deadline;
        AddEvent(report, "Cấp trên yêu cầu bổ sung", form.Request, report.UpperRecipient, form.Deadline);
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã ghi nhận yêu cầu từ cấp trên."));
    }

    [HttpPost("upper-decision/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> UpperDecision(Guid id, [FromBody] UpperRequestForm form)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        if (report.Status != EmployeeReportStatus.SentToUpper) return BadRequest("Báo cáo chưa được gửi cấp trên.");
        if (report.UpperRecipientEmployeeId != CurrentEmployeeId()) return Forbid();
        if (form.Status == EmployeeReportStatus.UpperChangesRequested)
        {
            if (string.IsNullOrWhiteSpace(form.Request)) return BadRequest("Nhập nội dung yêu cầu từ cấp trên.");
            report.Status = EmployeeReportStatus.UpperChangesRequested;
            report.UpperRequest = form.Request.Trim();
            report.UpperRequestDeadline = form.Deadline;
            AddEvent(report, "Cấp trên yêu cầu bổ sung", form.Request, report.UpperRecipient, form.Deadline);
        }
        else if (form.Status == EmployeeReportStatus.UpperApproved)
        {
            report.Status = EmployeeReportStatus.UpperApproved;
            AddEvent(report, "Cấp trên đã duyệt", form.Request, report.UpperRecipient);
        }
        else return BadRequest("Trạng thái cấp trên không hợp lệ.");
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã cập nhật ý kiến cấp trên."));
    }

    [HttpPost("respond/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> Respond(Guid id, [FromBody] RespondForm form)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        if (report.Status != EmployeeReportStatus.UpperChangesRequested) return BadRequest("Báo cáo không có yêu cầu từ cấp trên cần phản hồi.");
        if (string.IsNullOrWhiteSpace(form.Comment)) return BadRequest("Nhập nội dung phản hồi.");
        AddEvent(report, form.TransferToEmployee ? "Chuyển nhân viên bổ sung" : "Phản hồi cấp trên", form.Comment);
        if (form.TransferToEmployee)
        {
            report.Status = EmployeeReportStatus.ChangesRequested;
            report.ManagerComment = form.Comment.Trim();
        }
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã lưu phản hồi."));
    }

    [HttpPost("complete/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> Complete(Guid id)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        if (report.Status is not (EmployeeReportStatus.SentToUpper or EmployeeReportStatus.UpperApproved or EmployeeReportStatus.UpperChangesRequested)) return BadRequest("Báo cáo chưa sẵn sàng hoàn tất.");
        report.Status = EmployeeReportStatus.Completed;
        AddEvent(report, "Hoàn tất báo cáo", null);
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã hoàn tất báo cáo."));
    }

    [HttpPost("viewed/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> Viewed(Guid id)
    {
        if (!await CanManageReport(id)) return Forbid();
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        AddEvent(report, "Quản lý mở báo cáo", null);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("upper/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    [RequestSizeLimit(MaxFileSize + 1024 * 1024)]
    public async Task<IActionResult> UploadForUpper(Guid id, IFormFile file, [FromForm] string? note, [FromForm] string? recipient)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        if (report.Status != 1) return BadRequest("Chỉ gửi được báo cáo đã duyệt.");
        var error = ValidateFiles(file == null ? [] : [file]);
        if (error != null) return BadRequest(error);
        var upperFile = file!;
        var storedName = Guid.NewGuid().ToString("N") + Path.GetExtension(upperFile.FileName);
        await SaveFile(upperFile, storedName);
        report.UpperStoredName = storedName;
        report.UpperFileName = Path.GetFileName(upperFile.FileName);
        report.UpperFileSize = upperFile.Length;
        report.UpperNote = note?.Trim();
        report.UpperRecipient = recipient?.Trim();
        report.SentToUpper = false;
        AddEvent(report, "File cấp trên đã tải lên", note, recipient);
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã tải file gửi cấp trên."));
    }

    [HttpPost("mark-sent/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> MarkSent(Guid id)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        if (report.Status != 1 || string.IsNullOrEmpty(report.UpperStoredName)) return BadRequest("Cần tải file gửi cấp trên trước.");
        report.SentToUpper = true;
        report.Status = EmployeeReportStatus.SentToUpper;
        report.SentToUpperAt = DateTime.UtcNow;
        report.SentToUpperBy = CurrentEmployeeIdOrNull();
        AddEvent(report, "Quản lý gửi cấp trên", report.UpperNote, report.UpperRecipient);
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<string>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, "Đã đánh dấu gửi cấp trên."));
    }

    [HttpGet("download/{versionId:guid}")]
    public async Task<IActionResult> Download(Guid versionId)
    {
        var version = await db.EmployeeReportVersions.Include(v => v.Report).FirstOrDefaultAsync(v => v.Id == versionId);
        if (version == null) return NotFound();
        if (version.Report!.EmployeeId != CurrentEmployeeId() && !await CanManageReport(version.ReportId)) return Forbid();
        var path = Path.Combine(PrivateDirectory, version.StoredName);
        return System.IO.File.Exists(path) ? PhysicalFile(path, MimeFor(version.FileName), version.FileName) : NotFound();
    }

    [HttpGet("download-attachment/{attachmentId:guid}")]
    public async Task<IActionResult> DownloadAttachment(Guid attachmentId)
    {
        var attachment = await db.EmployeeReportAttachments.Include(a => a.Version).ThenInclude(v => v!.Report)
            .FirstOrDefaultAsync(a => a.Id == attachmentId);
        if (attachment == null) return NotFound();
        if (attachment.Version!.Report!.EmployeeId != CurrentEmployeeId() && !await CanManageReport(attachment.Version.ReportId)) return Forbid();
        var path = Path.Combine(PrivateDirectory, attachment.StoredName);
        return System.IO.File.Exists(path) ? PhysicalFile(path, MimeFor(attachment.FileName), attachment.FileName) : NotFound();
    }

    [HttpGet("upper-download/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> DownloadUpper(Guid id)
    {
        var report = await db.EmployeeReports.FindAsync(id);
        if (report == null || report.UpperStoredName == null) return NotFound();
        if (!await CanManageReport(id)) return Forbid();
        var path = Path.Combine(PrivateDirectory, report.UpperStoredName);
        return System.IO.File.Exists(path) ? PhysicalFile(path, MimeFor(report.UpperFileName), report.UpperFileName) : NotFound();
    }

    private async Task<IActionResult> ListForEmployee(Guid employeeId)
    {
        var result = await db.EmployeeReports.Include(r => r.Employee).ThenInclude(e => e!.Department)
            .Include(r => r.Versions).ThenInclude(v => v.Attachments).Include(r => r.Events).Where(r => r.EmployeeId == employeeId).OrderByDescending(r => r.SubmittedAt)
            .Select(ToResult()).ToListAsync();
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, result));
    }

    private static System.Linq.Expressions.Expression<Func<EmployeeReport, object>> ToResult() => r => new
    {
        r.Id,
        r.ReportCode,
        r.Title,
        r.ReportType,
        r.Period,
        r.Deadline,
        r.Status,
        r.SubmittedAt,
        r.ManagerComment,
        r.ReviewedBy,
        r.ReviewedAt,
        r.Overview,
        r.Results,
        r.Issues,
        r.Recommendations,
        r.UpperFileName,
        r.UpperFileSize,
        r.UpperNote,
        r.UpperRecipient,
        r.UpperRecipientEmployeeId,
        r.UpperRequest,
        r.UpperRequestDeadline,
        r.SentToUpper,
        r.SentToUpperAt,
        EmployeeId = r.EmployeeId,
        EmployeeName = r.Employee!.GivenName + " " + r.Employee.FamilyName,
        r.Employee.EmployeeCode,
        DepartmentId = r.Employee.DepartmentId,
        DepartmentName = r.Employee.Department!.Name,
        Versions = r.Versions.OrderBy(v => v.Version).Select(v => new { v.Id, v.Version, v.FileName, v.FileSize, v.UploadedBy, v.UploadedAt, Attachments = v.Attachments.Select(a => new { a.Id, a.FileName, a.FileSize }) }),
        Events = r.Events.OrderBy(e => e.OccurredAt).Select(e => new { e.ActionName, e.Comment, e.Recipient, e.ActorId, e.ActorName, e.OccurredAt, e.Deadline })
    };

    private Guid CurrentEmployeeId() => Guid.TryParse(User.FindFirstValue("employeeId"), out var id) ? id : Guid.Empty;
    private Guid? CurrentEmployeeIdOrNull() => Guid.TryParse(User.FindFirstValue("employeeId"), out var id) ? id : null;
    private bool IsManager => User.IsInRole("Admin") || User.IsInRole("Manager") || User.IsInRole("HR");
    private async Task<bool> CanManageReport(Guid reportId)
    {
        if (User.IsInRole("Admin") || User.IsInRole("HR")) return true;
        var managerId = CurrentEmployeeId();
        return await db.EmployeeReports.Where(r => r.Id == reportId).AnyAsync(r => r.Employee!.ManagerId == managerId || r.Employee.Department!.ManagerId == managerId);
    }
    private async Task<bool> CanManageEmployee(Guid employeeId)
    {
        if (User.IsInRole("Admin") || User.IsInRole("HR")) return true;
        var managerId = CurrentEmployeeId();
        return await db.Employees.Where(e => e.Id == employeeId).AnyAsync(e => e.ManagerId == managerId || e.Department!.ManagerId == managerId);
    }
    private void AddEvent(EmployeeReport report, string action, string? comment, string? recipient = null, DateTime? deadline = null)
    {
        db.EmployeeReportEvents.Add(new EmployeeReportEvent { ReportId = report.Id, ActionName = action, Comment = comment, Recipient = recipient, ActorId = CurrentEmployeeIdOrNull(), ActorName = User.FindFirstValue("fullName") ?? User.Identity?.Name ?? "Người dùng", OccurredAt = DateTime.UtcNow, Deadline = deadline });
    }
    private string PrivateDirectory => Path.Combine(environment.ContentRootPath, "App_Data", "EmployeeReports");
    private static string? ValidateFiles(IEnumerable<IFormFile> files)
    {
        var selected = files.ToList();
        return selected.Count == 0 ? "Vui lòng chọn file báo cáo." : selected.Any(f => f.Length == 0) ? "File đính kèm không hợp lệ." : selected.Sum(f => f.Length) > MaxFileSize ? "Tổng dung lượng file tối đa 20 MB." : selected.Any(f => !Extensions.Contains(Path.GetExtension(f.FileName))) ? "Chỉ chấp nhận PDF, Excel hoặc Word." : null;
    }
    private async Task SaveFile(IFormFile file, string storedName)
    {
        Directory.CreateDirectory(PrivateDirectory);
        await using var stream = System.IO.File.Create(Path.Combine(PrivateDirectory, storedName));
        await file.CopyToAsync(stream);
    }
    private void DeleteStoredFiles(IEnumerable<string> storedNames)
    {
        foreach (var storedName in storedNames)
        {
            try { System.IO.File.Delete(Path.Combine(PrivateDirectory, Path.GetFileName(storedName))); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }
    private static string MimeFor(string? name) => Path.GetExtension(name ?? "").ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".xls" => "application/vnd.ms-excel",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        _ => "application/octet-stream"
    };
}

public class ReportSubmitForm
{
    public Guid? ReportId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ReportType { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public string? Deadline { get; set; }
    public IFormFile? File { get; set; }
    public List<IFormFile>? Files { get; set; }
    public string? Overview { get; set; }
    public string? Results { get; set; }
    public string? Issues { get; set; }
    public string? Recommendations { get; set; }
}

public class ReviewForm { public int Status { get; set; } public string? Comment { get; set; } }
public class ForwardForm { public string Recipient { get; set; } = string.Empty; public Guid? RecipientEmployeeId { get; set; } public string? Note { get; set; } }
public class UpperRequestForm { public int Status { get; set; } public string Request { get; set; } = string.Empty; public DateTime? Deadline { get; set; } }
public class RespondForm { public string Comment { get; set; } = string.Empty; public bool TransferToEmployee { get; set; } }
