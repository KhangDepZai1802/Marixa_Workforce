using System.Text;

namespace M.API;

/// <summary>
/// Render cấp connection string PostgreSQL dạng URI (postgresql://user:pass@host/db).
/// Builder của Npgsql do EF Core sử dụng không chấp nhận URI trong code path này,
/// nên rành mạch chuyển về dạng keyword/value: Host=...;Port=...;Database=...;Username=...;Password=...
/// </summary>
public static class NpgsqlConnectionStringNormalizer
{
    public static string Normalize(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        string cs = connectionString.Trim();
        bool isUri =
            cs.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            cs.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

        if (!isUri)
        {
            return connectionString; // Đã là dạng keyword/value -> dùng nguyên.
        }

        var uri = new Uri(cs);
        var sb = new StringBuilder();
        sb.Append("Host=").Append(uri.Host);

        if (uri.Port != -1)
        {
            sb.Append(";Port=").Append(uri.Port);
        }

        sb.Append(";Database=").Append(uri.AbsolutePath.TrimStart('/'));

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            int sep = uri.UserInfo.IndexOf(':');
            string user = sep >= 0 ? uri.UserInfo[..sep] : uri.UserInfo;
            string pass = sep >= 0 ? uri.UserInfo[(sep + 1)..] : string.Empty;
            sb.Append(";Username=").Append(Uri.UnescapeDataString(user));
            sb.Append(";Password=").Append(Uri.UnescapeDataString(pass));
        }

        // sslmode=require (Render) => tin certificate của server.
        foreach (var pair in uri.Query.TrimStart('?').Split('&'))
        {
            var kv = pair.Split('=', 2);
            if (kv.Length == 2 &&
                kv[0].Equals("sslmode", StringComparison.OrdinalIgnoreCase) &&
                kv[1].Equals("require", StringComparison.OrdinalIgnoreCase))
            {
                sb.Append(";TrustServerCertificate=true");
                break;
            }
        }

        return sb.ToString();
    }
}
