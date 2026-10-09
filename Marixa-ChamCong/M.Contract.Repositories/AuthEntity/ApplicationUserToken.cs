using M.Core.Utils;
using Microsoft.AspNetCore.Identity;

namespace M.Contract.Repositories.Entity
{
    public class ApplicationUserToken : IdentityUserToken<Guid>
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
        public ApplicationUserToken()
        {
            CreatedTime = CoreHelper.SystemTimeNow;
            LastUpdatedTime = CreatedTime;
        }
    }
}
