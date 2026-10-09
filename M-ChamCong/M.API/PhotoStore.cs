using Microsoft.AspNetCore.Hosting;

namespace M.API
{
    /// <summary>
    /// Thư mục lưu ảnh chấm công, DUY NHẤT 1 nơi cố định:
    ///   &lt;thư mục project M.API&gt;/wwwroot/uploads/attendance/{checkin|checkout}
    ///
    /// Neo vào thư mục có chứa file .csproj (root của project) thay vì
    /// WebRootPath, để KHÔNG phụ thuộc cách chạy:
    ///   - dotnet run (cwd = M.API)          -> M.API\wwwroot\uploads
    ///   - VS Debug (cwd = bin\Debug\net8.0) -> vẫn M.API\wwwroot\uploads
    /// trước đây ảnh bị phân vào 2 nơi nên người dùng mở folder "không thấy".
    /// </summary>
    public static class PhotoStore
    {
        /// <summary>
        /// Tìm thư mục project (chứa *.csproj) bằng cách đi lên từ ContentRootPath.
        /// Chạy bằng VS (cwd nằm trong bin\...\net8.0) thì vẫn tìm ra M.API.
        /// </summary>
        public static string GetProjectRoot(IWebHostEnvironment env)
        {
            DirectoryInfo dir = new(env.ContentRootPath);
            while (dir != null)
            {
                if (dir.EnumerateFiles("*.csproj").Any())
                {
                    return dir.FullName;
                }
                dir = dir.Parent;
            }
            // Không tìm thấy (VD publish 1 thư mục) -> dùng chính ContentRootPath
            return env.ContentRootPath;
        }

        public static string GetRoot(IWebHostEnvironment env)
        {
            string projectRoot = GetProjectRoot(env);
            string webRoot = Path.Combine(projectRoot, "wwwroot");
            Directory.CreateDirectory(webRoot);

            string uploadRoot = Path.Combine(webRoot, "uploads");
            Directory.CreateDirectory(uploadRoot);
            return uploadRoot;
        }

        /// <summary>
        /// Thư mục ảnh chấm công theo loại: vào ca (checkin) / ra ca (checkout).
        /// </summary>
        public static string GetAttendanceFolder(
            IWebHostEnvironment env,
            string type = "checkin")
        {
            string kind = type == "checkout" ? "checkout" : "checkin";
            string dir = Path.Combine(GetRoot(env), "attendance", kind);
            Directory.CreateDirectory(dir);
            return dir;
        }
    }
}
