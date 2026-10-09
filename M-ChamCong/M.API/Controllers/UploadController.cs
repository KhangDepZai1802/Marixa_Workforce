using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        private static readonly string[] AllowedExtensions =
            [".jpg", ".jpeg", ".png", ".webp"];
        private const long MaxBytes = 5 * 1024 * 1024; // 5MB

        public UploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        /// <summary>
        /// Upload ảnh chấm công (vào ca / ra ca).
        /// type: "checkin" (vào ca) hoặc "checkout" (ra ca).
        /// Lưu vào wwwroot/uploads/attendance/{type}/yyyyMM/ và trả về
        /// đường dẫn TƯƠNG ĐỐI /uploads/... để lưu CSDL. Client tự ghép
        /// với origin của API -> không phụ thuộc scheme/host (tránh lỗi
        /// mixed-content khi front http/https khác nhau với API).
        /// </summary>
        [HttpPost("photo")]
        public async Task<IActionResult> UploadPhoto(
            IFormFile file,
            string type = "checkin")
        {
            if (file == null || file.Length == 0)
            {
                return Ok(new BaseResponse<string>(
                    StatusCodeHelper.BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Vui lòng chọn file ảnh."));
            }

            string extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension) ||
                file.Length > MaxBytes)
            {
                return Ok(new BaseResponse<string>(
                    StatusCodeHelper.BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Chỉ chấp nhận jpg/png/webp, tối đa 5MB."));
            }

            // Phân loại: ảnh vào ca / ra ca -> 2 thư mục riêng
            string kind = type == "checkout" ? "checkout" : "checkin";
            string folder = DateTime.Now.ToString("yyyyMM");
            string fileName = $"{Guid.NewGuid()}{extension}";

            string absoluteDir = Path.Combine(
                PhotoStore.GetAttendanceFolder(_env, kind), folder);
            Directory.CreateDirectory(absoluteDir);

            string absolutePath = Path.Combine(absoluteDir, fileName);
            await using (var stream = new FileStream(
                absolutePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Đường dẫn tĩnh tương đối - client ghép với origin API khi hiển thị
            string url = $"/uploads/attendance/{kind}/{folder}/{fileName}";

            // QUAN TRỌNG: URL nằm trong `data` (không phải `message`).
            // BaseResponse<string> khi pass (code, url) sẽ rơi vào overload
            // (statusCode, code, message) -> data = null -> client không đọc
            // được URL (hiện "Không" dù file đã lưu).
            return Ok(BaseResponse<string>.OkResponse(url, null));
        }
    }
}
