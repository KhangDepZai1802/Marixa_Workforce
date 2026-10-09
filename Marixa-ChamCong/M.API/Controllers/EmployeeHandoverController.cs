using System.Security.Claims;
using System.Text.Json;
using M.Contract.Repositories.Entities;
using M.Core.Base;
using M.Core.Store;
using M.Repositories.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace M.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EmployeeHandoverController(DatabaseContext db, IWebHostEnvironment environment) : ControllerBase
{
    private const long MaxAttachmentSize = 10 * 1024 * 1024;
    private const long MaxRequestSize = 20 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip" };

    // Frontend gửi AssetsJson/ProjectsJson ở camelCase (assetType, projectName...)
    // còn model C# dùng PascalCase. Dùng chung 1 options để bind đọc/ghi nhất quán
    // (camelCase + không phân biệt hoa thường) -> hết lỗi 400 "Vui lòng nhập dự án".
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var employeeId = CurrentEmployeeId();
        if (employeeId == Guid.Empty) return BadRequest("Tài khoản chưa liên kết hồ sơ nhân viên.");
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
            await Rows().Where(x => x.EmployeeId == employeeId).OrderByDescending(x => x.CreatedTime).ToListAsync()));
    }

    [HttpGet("get-all")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> GetAll()
    {
        var query = Rows();
        if (!User.IsInRole("Admin") && !User.IsInRole("HR"))
        {
            var managerId = CurrentEmployeeId();
            query = query.Where(x => x.ManagerId == managerId);
        }
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
            await query.OrderByDescending(x => x.CreatedTime).ToListAsync()));
    }

    [HttpPost("request")]
    [RequestSizeLimit(MaxRequestSize + 1024 * 1024)]
    public async Task<IActionResult> SubmitRequest([FromForm] HandoverRequest form)
    {
        var employeeId = CurrentEmployeeId();
        if (employeeId == Guid.Empty) return BadRequest("Tài khoản chưa liên kết hồ sơ nhân viên.");
        if (form.LastWorkingDate.Date < DateTime.UtcNow.Date) return BadRequest("Ngày làm việc cuối cùng không được ở quá khứ.");
        if (string.IsNullOrWhiteSpace(form.Reason)) return BadRequest("Vui lòng nhập lý do nghỉ việc.");
        List<HandoverAssetRow> assets;
        List<HandoverProjectRow> projects;
        List<HandoverAttachmentInput> attachmentInputs;
        try
        {
            assets = JsonSerializer.Deserialize<List<HandoverAssetRow>>(form.AssetsJson, Json) ?? [];
            projects = JsonSerializer.Deserialize<List<HandoverProjectRow>>(form.ProjectsJson, Json) ?? [];
            attachmentInputs = JsonSerializer.Deserialize<List<HandoverAttachmentInput>>(form.AttachmentMetadataJson, Json) ?? [];
        }
        catch (JsonException) { return BadRequest("Thông tin tài sản hoặc dự án không hợp lệ."); }
        if (projects.Count == 0 || projects.Any(x => string.IsNullOrWhiteSpace(x.ProjectName) || x.Progress is < 0 or > 100))
            return BadRequest("Vui lòng nhập dự án bàn giao và tiến độ từ 0 đến 100%.");
        // Frontend gửi ProjectsJson với documents/handoverFiles rỗng; file thật nằm trong
        // multipart "Attachments" và chỉ gắn vào project sau khi lưu. Vì vậy kiểm tra bắt buộc
        // phải dựa trên metadata đính kèm (mỗi dự án cần >=1 tài liệu và >=1 file bàn giao).
        for (var i = 0; i < projects.Count; i++)
        {
            var hasDoc = attachmentInputs.Any(x => x.ProjectIndex == i && x.Kind == "documents");
            var hasFile = attachmentInputs.Any(x => x.ProjectIndex == i && x.Kind == "handoverFiles");
            if (!hasDoc) return BadRequest($"Dự án #{i + 1} phải có ít nhất một tài liệu dự án.");
            if (!hasFile) return BadRequest($"Dự án #{i + 1} phải có ít nhất một file bàn giao.");
        }
        var files = form.Attachments ?? [];
        if (files.Count != attachmentInputs.Count) return BadRequest("Danh sách tệp đính kèm không khớp.");
        if (files.Any(f => f.Length == 0 || f.Length > MaxAttachmentSize || !AllowedExtensions.Contains(Path.GetExtension(f.FileName))) || files.Sum(f => f.Length) > MaxRequestSize)
            return BadRequest("Tệp phải là PDF, Office hoặc ZIP; tối đa 10 MB mỗi tệp và 20 MB tổng cộng.");
        if (attachmentInputs.Any(x => x.ProjectIndex < 0 || x.ProjectIndex >= projects.Count || (x.Kind != "documents" && x.Kind != "handoverFiles")))
            return BadRequest("Vị trí tệp đính kèm không hợp lệ.");

        var employee = await db.Employees.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == employeeId);
        if (employee == null) return NotFound("Không tìm thấy hồ sơ nhân viên.");
        if (employee.Status is EmployeeStatus.Resigned or EmployeeStatus.Terminated) return Conflict("Nhân viên đã nghỉ việc hoặc chấm dứt hợp đồng.");
        var managerId = employee.ManagerId ?? employee.Department?.ManagerId;
        if (!managerId.HasValue || managerId == employeeId) return BadRequest("Hồ sơ chưa có quản lý trực tiếp để duyệt bàn giao.");
        if (await db.EmployeeHandovers.AnyAsync(x => x.EmployeeId == employeeId && x.Status == EmployeeHandoverStatus.Pending))
            return Conflict("Bạn đang có yêu cầu bàn giao chờ duyệt.");

        var handover = new EmployeeHandover
        {
            EmployeeId = employeeId,
            ManagerId = managerId.Value,
            LastWorkingDate = form.LastWorkingDate.Date,
            Reason = form.Reason.Trim(),
            CompanyAssets = string.Join("\n", assets.Select(x => $"{x.AssetCode} · {x.AssetType} · {x.Condition}")),
            WorkProgress = string.Join("\n", projects.Select(x => $"{x.ProjectCode} · {x.ProjectName} · {x.Progress}%")),
            AssetsJson = JsonSerializer.Serialize(assets, Json),
            ProjectsJson = JsonSerializer.Serialize(projects, Json),
            AccountIssued = employee.UserId.HasValue,
            Status = EmployeeHandoverStatus.Pending
        };
        var uploadDirectory = Path.Combine(PhotoStore.GetRoot(environment), "handovers", handover.Id.ToString("N"));
        Directory.CreateDirectory(uploadDirectory);
        for (var i = 0; i < files.Count; i++)
        {
            var file = files[i];
            var metadata = attachmentInputs[i];
            var storedName = Guid.NewGuid().ToString("N") + Path.GetExtension(file.FileName).ToLowerInvariant();
            var fullPath = Path.Combine(uploadDirectory, storedName);
            await using (var stream = System.IO.File.Create(fullPath)) await file.CopyToAsync(stream);
            var info = new HandoverFileInfo { FileName = Path.GetFileName(file.FileName), StoredName = storedName, FileSize = file.Length };
            if (metadata.Kind == "documents") projects[metadata.ProjectIndex].Documents.Add(info);
            else projects[metadata.ProjectIndex].HandoverFiles.Add(info);
        }
        handover.ProjectsJson = JsonSerializer.Serialize(projects, Json);
        db.EmployeeHandovers.Add(handover);
        await db.SaveChangesAsync();
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS, new { message = "Đã gửi yêu cầu bàn giao cho cấp trên." }));
    }

    [HttpGet("{id:guid}/files/{storedName}")]
    public async Task<IActionResult> DownloadFile(Guid id, string storedName)
    {
        var handover = await db.EmployeeHandovers.FirstOrDefaultAsync(x => x.Id == id);
        if (handover == null) return NotFound();
        if (!await CanAccess(handover)) return Forbid();
        var projects = JsonSerializer.Deserialize<List<HandoverProjectRow>>(handover.ProjectsJson, Json) ?? [];
        var metadata = projects.SelectMany(x => x.Documents.Concat(x.HandoverFiles)).FirstOrDefault(x => x.StoredName == storedName);
        if (metadata == null || Path.GetFileName(storedName) != storedName) return NotFound();
        var path = Path.Combine(PhotoStore.GetRoot(environment), "handovers", id.ToString("N"), storedName);
        if (!System.IO.File.Exists(path)) return NotFound();
        var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(metadata.FileName, out var contentType)) contentType = "application/octet-stream";
        return PhysicalFile(path, contentType, metadata.FileName);
    }

    [HttpPost("review/{id:guid}")]
    [Authorize(Roles = "Admin,Manager,HR")]
    public async Task<IActionResult> Review(Guid id, HandoverReview form)
    {
        var handover = await db.EmployeeHandovers.FirstOrDefaultAsync(x => x.Id == id);
        if (handover == null) return NotFound();
        if (handover.Status != EmployeeHandoverStatus.Pending) return Conflict("Yêu cầu bàn giao này đã được xử lý.");
        var elevated = User.IsInRole("Admin") || User.IsInRole("HR");
        var reviewerId = CurrentEmployeeId();
        if (!elevated && (!User.IsInRole("Manager") || handover.ManagerId != reviewerId)) return Forbid();
        if (!form.Approve && string.IsNullOrWhiteSpace(form.Note)) return BadRequest("Vui lòng nhập lý do từ chối.");

        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var employee = await db.Employees.FirstOrDefaultAsync(x => x.Id == handover.EmployeeId);
        if (employee == null) return NotFound("Không tìm thấy hồ sơ nhân viên.");
        handover.Status = form.Approve ? EmployeeHandoverStatus.Approved : EmployeeHandoverStatus.Rejected;
        handover.ReviewNote = form.Note?.Trim();
        handover.ReviewedByEmployeeId = reviewerId == Guid.Empty ? null : reviewerId;
        handover.ReviewedByName = reviewerId == Guid.Empty
            ? User.Identity?.Name ?? "Quản trị viên"
            : await db.Employees.Where(x => x.Id == reviewerId).Select(x => x.GivenName + " " + x.FamilyName).FirstOrDefaultAsync() ?? User.Identity?.Name;
        handover.ReviewedAt = DateTime.UtcNow;
        if (form.Approve)
        {
            employee.Status = EmployeeStatus.Resigned;
            employee.LastUpdatedTime = DateTimeOffset.UtcNow;
            employee.LastUpdatedBy = handover.ReviewedByName;
        }
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new BaseResponse<object>(StatusCodeHelper.OK, ResponseCodeConstants.SUCCESS,
            new { message = form.Approve ? "Đã duyệt bàn giao và chuyển hồ sơ sang danh sách nhân viên đã nghỉ." : "Đã từ chối yêu cầu bàn giao." }));
    }

    private IQueryable<HandoverRow> Rows() =>
        from h in db.EmployeeHandovers
        join e in db.Employees on h.EmployeeId equals e.Id
        join manager in db.Employees on h.ManagerId equals manager.Id
        join department in db.Departments on e.DepartmentId equals department.Id into departments
        from department in departments.DefaultIfEmpty()
        select new HandoverRow
        {
            Id = h.Id, EmployeeId = e.Id, EmployeeCode = e.EmployeeCode,
            EmployeeName = e.GivenName + " " + e.FamilyName,
            DepartmentName = department == null ? "" : department.Name,
            ManagerId = h.ManagerId, ManagerName = manager.GivenName + " " + manager.FamilyName,
            LastWorkingDate = h.LastWorkingDate, Reason = h.Reason, CompanyAssets = h.CompanyAssets,
            WorkProgress = h.WorkProgress, AccountIssued = h.AccountIssued, Status = h.Status,
            AssetsJson = h.AssetsJson, ProjectsJson = h.ProjectsJson,
            ReviewNote = h.ReviewNote, ReviewedByName = h.ReviewedByName,
            ReviewedAt = h.ReviewedAt, CreatedTime = h.CreatedTime
        };

    private Guid CurrentEmployeeId() => Guid.TryParse(User.FindFirstValue("employeeId"), out var id) ? id : Guid.Empty;

    private Task<bool> CanAccess(EmployeeHandover handover) => Task.FromResult(
        User.IsInRole("Admin") || User.IsInRole("HR") ||
        handover.EmployeeId == CurrentEmployeeId() ||
        (User.IsInRole("Manager") && handover.ManagerId == CurrentEmployeeId()));
}

public class HandoverRequest
{
    public DateTime LastWorkingDate { get; set; }
    [System.ComponentModel.DataAnnotations.MaxLength(2000)] public string Reason { get; set; } = string.Empty;
    public string AssetsJson { get; set; } = "[]";
    public string ProjectsJson { get; set; } = "[]";
    public string AttachmentMetadataJson { get; set; } = "[]";
    public List<IFormFile> Attachments { get; set; } = [];
}

public class HandoverAssetRow
{
    public string AssetType { get; set; } = string.Empty;
    public string AssetCode { get; set; } = string.Empty;
    public string Condition { get; set; } = string.Empty;
    public string? Note { get; set; }
}

public class HandoverProjectRow
{
    public string ProjectCode { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string Partner { get; set; } = string.Empty;
    public int Progress { get; set; }
    public List<HandoverFileInfo> Documents { get; set; } = [];
    public List<HandoverFileInfo> HandoverFiles { get; set; } = [];
}

public class HandoverAttachmentInput
{
    public int ProjectIndex { get; set; }
    public string Kind { get; set; } = string.Empty;
}

public class HandoverFileInfo
{
    public string FileName { get; set; } = string.Empty;
    public string StoredName { get; set; } = string.Empty;
    public long FileSize { get; set; }
}

public class HandoverReview
{
    public bool Approve { get; set; }
    public string? Note { get; set; }
}

public class HandoverRow
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public Guid ManagerId { get; set; }
    public string ManagerName { get; set; } = string.Empty;
    public DateTime LastWorkingDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? CompanyAssets { get; set; }
    public string WorkProgress { get; set; } = string.Empty;
    public string AssetsJson { get; set; } = "[]";
    public string ProjectsJson { get; set; } = "[]";
    public bool AccountIssued { get; set; }
    public int Status { get; set; }
    public string? ReviewNote { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTimeOffset CreatedTime { get; set; }
}
