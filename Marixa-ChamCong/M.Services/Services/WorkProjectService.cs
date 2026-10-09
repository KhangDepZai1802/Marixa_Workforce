using M.Contract.Repositories.Entities;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using ModelViews.WorkProjectModelView;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class WorkProjectService : IWorkProjectService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public WorkProjectService(
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        private IGenericRepository<WorkProject> ProjectRepo => _unitOfWork.GetRepository<WorkProject>();
        private IGenericRepository<WorkProjectMember> MemberRepo => _unitOfWork.GetRepository<WorkProjectMember>();
        private IGenericRepository<Employee> EmpRepo => _unitOfWork.GetRepository<Employee>();

        // ---------- Triggers ----------
        public async Task<List<SelectableEmployeeRow>> GetAssignableAsync(Guid ownerId, bool fullScope)
        {
            Employee? me = await EmpRepo.Entities.AsNoTracking().FirstOrDefaultAsync(e => e.Id == ownerId);
            if (me is null) return new List<SelectableEmployeeRow>();

            var rows = await EmpRepo.Entities.AsNoTracking()
                .Where(e => e.Status != EmployeeStatus.Resigned)
                .Select(e => new EmpRow
                {
                    Id = e.Id,
                    EmployeeCode = e.EmployeeCode,
                    Name = e.GivenName + " " + e.FamilyName,
                    DepartmentId = e.DepartmentId,
                    PositionId = e.PositionId,
                    ManagerId = e.ManagerId,
                    DeptName = e.Department!.Name,
                    PosName = e.Position!.Name
                })
                .ToListAsync();

            if (fullScope)
            {
                return rows.Select(r => ToSelectable(r, "subordinate")).ToList();
            }

            // Manager: chỉ CẤP DƯỚI (descendants đệ quy), không gồm self / peer / cấp trên.
            var descendants = Descendants(rows, me.Id);
            return rows
                .Where(r => descendants.Contains(r.Id))
                .Select(r => ToSelectable(r, "subordinate"))
                .ToList();
        }

        public async Task<List<WorkProjectRow>> GetMineAsync(Guid ownerId)
        {
            var ids = await MemberRepo.Entities.AsNoTracking()
                .Where(m => m.EmployeeId == ownerId).Select(m => m.ProjectId).ToListAsync();
            ids.Add(ownerId); // tôi là owner
            var projects = await ProjectRepo.Entities.AsNoTracking()
                .Where(p => ids.Contains(p.Id)).OrderByDescending(p => p.CreatedTime).ToListAsync();
            return await ToRowsAsync(projects);
        }

        public async Task<List<WorkProjectRow>> GetAllAsync()
        {
            var projects = await ProjectRepo.Entities.AsNoTracking()
                .OrderByDescending(p => p.CreatedTime).ToListAsync();
            return await ToRowsAsync(projects);
        }

        private async Task<List<WorkProjectRow>> ToRowsAsync(List<WorkProject> projects)
        {
            var ids = projects.Select(p => p.Id).ToList();
            var members = await MemberRepo.Entities.AsNoTracking()
                .Where(m => ids.Contains(m.ProjectId)).ToListAsync();
            return projects.Select(p =>
            {
                var ms = members.Where(m => m.ProjectId == p.Id).ToList();
                return new WorkProjectRow
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    StartDate = p.StartDate,
                    EndDate = p.EndDate,
                    FileName = p.FileName,
                    FileUrl = p.FileUrl,
                    Color = p.Color,
                    OwnerEmployeeCode = p.OwnerEmployeeCode,
                    OwnerName = p.OwnerName,
                    Status = p.Status,
                    MemberCount = ms.Count,
                    Members = ms.Select(m => new WorkProjectMemberRow
                    {
                        Id = m.EmployeeId,
                        EmployeeCode = m.EmployeeCode,
                        Name = m.EmployeeName,
                        PositionName = null
                    }).ToList()
                };
            }).ToList();
        }

        public async Task<WorkProjectRow> CreateAsync(Guid ownerId, CreateWorkProjectModelView model)
        {
            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            var me = await EmpRepo.Entities.FirstOrDefaultAsync(e => e.Id == ownerId)
                ?? throw new ErrorException(StatusCodes.Status400BadRequest, "VALIDATION", "Tài khoản chưa liên kết hồ sơ nhân viên.");

            var project = new WorkProject
            {
                Name = model.Name.Trim(),
                Description = model.Description?.Trim(),
                StartDate = model.StartDate.Date,
                EndDate = model.EndDate.Date,
                FileName = model.FileName,
                FileUrl = model.FileUrl,
                Color = model.Color,
                OwnerEmployeeId = me.Id,
                OwnerEmployeeCode = me.EmployeeCode,
                OwnerName = $"{me.GivenName} {me.FamilyName}",
                Status = 0,
                CreatedBy = currentUser
            };
            await ProjectRepo.InsertAsync(project);

            int memberCount = 0;
            var allowed = model.MemberIds ?? new List<Guid>();
            if (allowed.Count > 0)
            {
                var selected = await EmpRepo.Entities.AsNoTracking()
                    .Where(e => allowed.Contains(e.Id))
                    .ToListAsync();
                foreach (var s in selected)
                {
                    await MemberRepo.InsertAsync(new WorkProjectMember
                    {
                        ProjectId = project.Id,
                        EmployeeId = s.Id,
                        EmployeeCode = s.EmployeeCode,
                        EmployeeName = $"{s.GivenName} {s.FamilyName}"
                    });
                    memberCount++;
                }
            }
            project.MemberCount = memberCount;
            await ProjectRepo.UpdateAsync(project);
            await _unitOfWork.SaveAsync();

            var rows = await ToRowsAsync(new List<WorkProject> { project });
            return rows[0];
        }

        // ---------- Helpers ----------
        private static SelectableEmployeeRow ToSelectable(EmpRow r, string level) => new()
        {
            Id = r.Id,
            EmployeeCode = r.EmployeeCode,
            Name = r.Name,
            DepartmentName = r.DeptName,
            PositionName = r.PosName,
            Level = level
        };

        private class EmpRow
        {
            public Guid Id { get; set; }
            public string EmployeeCode { get; set; } = "";
            public string Name { get; set; } = "";
            public Guid? DepartmentId { get; set; }
            public Guid? PositionId { get; set; }
            public Guid? ManagerId { get; set; }
            public string? DeptName { get; set; }
            public string? PosName { get; set; }
        }

        private static HashSet<Guid> Descendants(List<EmpRow> rows, Guid root)
        {
            var map = new Dictionary<Guid, List<Guid>>();
            foreach (var r in rows)
            {
                if (r.ManagerId is null) continue;
                if (!map.TryGetValue(r.ManagerId.Value, out var list))
                {
                    list = new List<Guid>();
                    map[r.ManagerId.Value] = list;
                }
                list.Add(r.Id);
            }
            var result = new HashSet<Guid>();
            var queue = new Queue<Guid>();
            queue.Enqueue(root);
            var guard = 0;
            while (queue.Count > 0 && guard++ < 5000)
            {
                var cur = queue.Dequeue();
                if (!result.Add(cur)) continue;
                if (map.TryGetValue(cur, out var kids))
                    foreach (var k in kids) queue.Enqueue(k);
            }
            return result;
        }
    }
}
