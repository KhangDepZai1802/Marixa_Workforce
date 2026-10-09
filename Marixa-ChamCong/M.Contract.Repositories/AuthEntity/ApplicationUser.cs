using M.Contract.Repositories.Entities;
using M.Core.Utils;
using Microsoft.AspNetCore.Identity;

namespace M.Contract.Repositories.Entity
{
    public class ApplicationUser : IdentityUser<Guid>
    {
        // =========================================================
        // THÔNG TIN NHÂN VIÊN
        // =========================================================

        public virtual Employee? Employee { get; set; }

        // Mã nhân viên liên kết (cột AspNetUsers.EmployeeId, có sẵn từ migration gốc).
        // Được đồng bộ với Employees.UserId khi tạo/cấp tài khoản.
        public Guid? EmployeeId { get; set; }


        // =========================================================
        // AUDIT
        // =========================================================

        // Ai tạo bản ghi
        public string? CreatedBy { get; set; }

        // Ai cập nhật lần cuối
        public string? LastUpdatedBy { get; set; }

        // Ai xóa
        public string? DeletedBy { get; set; }

        // Thời gian tạo
        public DateTimeOffset CreatedTime { get; set; }

        // Thời gian cập nhật lần cuối
        public DateTimeOffset LastUpdatedTime { get; set; }

        // Thời gian xóa (nếu có)
        public DateTimeOffset? DeletedTime { get; set; }


        // Khởi tạo thời gian mặc định khi tạo user
        public ApplicationUser()
        {
            CreatedTime = CoreHelper.SystemTimeNow;
            LastUpdatedTime = CreatedTime;
        }
    }
}