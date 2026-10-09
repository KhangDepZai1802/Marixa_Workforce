using M.API;
using M.API.Middleware;
using M.Repositories.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    // Normalize every DateTime/DateTime? on all controller input models to
    // Kind=Utc BEFORE actions run. PostgreSQL/Npgsql requires UTC for
    // timestamptz columns both as query parameters AND as stored values.
    // No-op on SQL Server (local dev). Covers all controllers in one place.
    options.Filters.Add(new M.API.Filters.DateTimeUtcKindFilter());
});

// File báo cáo tối đa 20MB (upload ảnh vẫn được giới hạn riêng trong API chấm công).
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 21 * 1024 * 1024;
});

var jwtKey = builder.Configuration["JwtSettings:Key"]
    ?? "FALLBACK-DEV-JWT-KEY-CHANGE-ME-32CHARS!";

builder.Services.AddEndpointsApiExplorer();

// Add all services to this
builder.Services.AddConfig(builder.Configuration);


var app = builder.Build();

// Render đưa request qua load balancer; tin header X-Forwarded-* để Kestrel
// thấy đúng IP và scheme của client (chạy sau khi build, trước các middleware khác).
app.UseForwardedHeaders();

// Tạo schema CSDL khi khởi động.
// - PostgreSQL (Render): dùng EnsureCreated, vì các migration đã commit chứa
//   T-SQL (IF COL_LENGTH...) chỉ chạy được trên SQL Server.
// - SQL Server (dev local): chạy migration thật.
string dbProvider = app.Configuration["Database:Provider"]
    ?? Environment.GetEnvironmentVariable("Database__Provider")
    ?? "SqlServer";

try
{
    using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
    if (dbProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
    {
        await db.Database.EnsureCreatedAsync();

        // Generic schema drift sync: compare EF model to actual PostgreSQL schema,
        // auto-add any missing columns (idempotent, runs every boot).
        // Handles ALL future model changes without hardcoding ALTER TABLE.
        try
        {
            await M.API.PostgresSchemaSync.EnsureColumnsAsync(db, app.Services);
        }
        catch (Exception syncEx)
        {
            app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup")
                .LogWarning(syncEx, "PostgreSQL schema sync FAILED: {Reason}", syncEx.Message);
        }
    }
    else
    {
        await db.Database.MigrateAsync();
    }
}
}
catch (Exception ex)
{
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup").LogWarning(
        "DB init skipped at startup (retry next boot): {Reason}", ex.Message);
}

// Dev: tu dong migrate CSDL local de khua schema moi (AttendanceLogs, ChangeSummary,
// EmployeeReports, EmployeePromotions, EmployeeHandovers...). Idempotent + chi chay
// Development (khong dong CSDL Somee trong Production). Khua loi 500 "invalid column/table".
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    try
    {
        await scope.ServiceProvider
            .GetRequiredService<M.Repositories.Context.DatabaseContext>()
            .Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup").LogWarning(
            "Auto-migrate skipped at startup: {Reason}", ex.Message);
    }
}

try
{
    await M.API.Seed.RoleSeeder.SeedAsync(app.Services);
}
catch (Exception ex)
{
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup").LogWarning(
        "RoleSeeder skipped at startup: {Reason}", ex.Message);
}

// Seed quy định chấm công mặc định 8h-17h (idempotent).
try
{
    await M.API.Seed.AttendanceRuleSeeder.SeedAsync(app.Services);
}
catch (Exception ex)
{
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup").LogWarning(
        "AttendanceRuleSeeder skipped at startup: {Reason}", ex.Message);
}

// Táº¹o/á»Ÿ cå© tháº§m táº¹i khoáº£n quáº£n trá» (admin), idempotent. Cå“i tä¿u:
// Seed:Admin:Username / Seed:Admin:Email / Seed:Admin:Password.
try
{
    await M.API.Seed.AdminSeeder.SeedAsync(app.Services);
}
catch (Exception ex)
{
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup").LogWarning(
        "AdminSeeder skipped at startup: {Reason}", ex.Message);
}

//Catch error
//app.UseDeveloperExceptionPage();
app.UseMiddleware<ExceptionMiddleware>();
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("ReactPolicy");
// Render đã có HTTPS ở load balancer (không chạy Kestrel bằng SSL),
// nên KHÔNG dùng UseHttpsRedirection để tránh vòng lặp redirect.

// Ảnh chấm công đã upload -> /uploads (lưu trong wwwroot/uploads, ổn định)
var uploadDir = PhotoStore.GetRoot(app.Environment);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadDir),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SPA fallback: moi duong dan React Router (/login, /employees, ...) -> tra index.html
// (chi cho duong dan cua app; /api, /uploads, /swagger van trai 404 dung).
app.MapFallbackToFile("index.html");

app.Run();
