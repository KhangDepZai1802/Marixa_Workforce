using M.Core.Utils;
using Microsoft.AspNetCore.Identity;

namespace M.Contract.Repositories.Entity
{
    // Lớp biểu diễn quan hệ giữa user và role
    public class ApplicationUserRole : IdentityUserRole<Guid>
    {
        // Ai tạo
        public string? CreatedBy { get; set; }
        // Ai cập nhật
        public string? LastUpdatedBy { get; set; }
        // Ai xóa
        public string? DeletedBy { get; set; }
        // Thời gian tạo
        public DateTimeOffset CreatedTime { get; set; }
        // Thời gian cập nhật
        public DateTimeOffset LastUpdatedTime { get; set; }
        // Thời gian xóa
        public DateTimeOffset? DeletedTime { get; set; }

        // Khởi tạo timestamp mặc định
        public ApplicationUserRole()
        {
            CreatedTime = CoreHelper.SystemTimeNow;
            LastUpdatedTime = CreatedTime;
        }
    }
}
