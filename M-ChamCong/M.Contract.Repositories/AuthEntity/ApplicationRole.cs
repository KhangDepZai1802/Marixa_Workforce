using M.Core.Utils;
using Microsoft.AspNetCore.Identity;

namespace M.Contract.Repositories.Entity
{
    // Lớp đại diện cho vai trò (role) trong hệ thống, kế thừa IdentityRole<Guid>
    public class ApplicationRole : IdentityRole<Guid>
    {
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
        // Mô tả vai trò
        public string? Description { get; set; } = string.Empty;

        // Khởi tạo mặc định khởi tạo thời gian tạo / cập nhật
        public ApplicationRole()
        {
            CreatedTime = CoreHelper.SystemTimeNow;
            LastUpdatedTime = CreatedTime;
        }
    }
}