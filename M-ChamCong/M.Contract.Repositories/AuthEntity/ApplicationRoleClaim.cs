using M.Core.Utils;
using Microsoft.AspNetCore.Identity;

namespace M.Contract.Repositories.Entity
{
    public class ApplicationRoleClaim : IdentityRoleClaim<Guid>
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
        // Thời gian xóa (nếu có)
        public DateTimeOffset? DeletedTime { get; set; }

        // Khởi tạo mặc định cho timestamp
        public ApplicationRoleClaim()
        {
            CreatedTime = CoreHelper.SystemTimeNow;
            LastUpdatedTime = CreatedTime;
        }
    }
}
