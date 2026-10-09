using M.Contract.Repositories.Entity;
using M.Contract.Serivces.Interface;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Repositories.Context;
using M.Services;
using M.Services.Service;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;


namespace M.API
{
    public static class DependencyInjection
    {

        // Production origins are always allowed, regardless of environment
        // variable overrides on the hosted service (Render env vars can mask
        // appsettings arrays by index, so keep a hardcoded safety net here).
        private static readonly HashSet<string> ProductionOrigins = new(StringComparer.OrdinalIgnoreCase)
        {
            "https://m-chamcon-web.onrender.com",
            "https://m-chamcong.onrender.com",
            "https://m-chamcon-api.onrender.com",
        };
        public static void AddConfig(this IServiceCollection services, IConfiguration configuration)
        {
            services.ConfigRoute();
            services.AddDatabase(configuration);
            services.AddIdentity();
            services.AddInfrastructure(configuration);
            services.AddServices();
            services.AddJwtAuthentication(configuration);
            services.AddSwaggerConfig();
            services.AddHttpContextAccessor();
            services.AddMemoryCache();

            services.AddCors(options =>
            {
                options.AddPolicy("ReactPolicy", policy =>
                {
                    policy
                        .SetIsOriginAllowed(origin =>
                            origin.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase)
                            || origin.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase)
                            || origin.StartsWith("http://[::1]", StringComparison.OrdinalIgnoreCase)
                            || ProductionOrigins.Contains(origin)
                            || configuration.GetSection("Cors:AllowedOrigins").GetChildren().Select(o => o.Value)
                                   .Any(v => string.Equals(v, origin, StringComparison.OrdinalIgnoreCase)))
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });
        }
        public static void ConfigRoute(this IServiceCollection services)
        {
            services.Configure<RouteOptions>(options =>
            {
                options.LowercaseUrls = true;
            });
        }
        public static void AddDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<DatabaseContext>(options =>
            {
                //options.UseLazyLoadingProxies().UseSqlServer(configuration.GetConnectionString("MyCnn"));
                string provider = configuration.GetSection("Database:Provider").Value ?? "SqlServer";
                if (provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
                {
                    // Render does not host SQL Server; production uses PostgreSQL.
                    options.UseNpgsql(NpgsqlConnectionStringNormalizer.Normalize(configuration.GetConnectionString("MyCnn")));
                    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.MultipleCollectionIncludeWarning));
                }
                else
                {
                    options.UseSqlServer(configuration.GetConnectionString("MyCnn"));
                    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.MultipleCollectionIncludeWarning));
                }

            });
        }

        public static void AddIdentity(this IServiceCollection services)
        {
            services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 6;

                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.AllowedForNewUsers = true;

                options.User.RequireUniqueEmail = false;
            })
             .AddEntityFrameworkStores<DatabaseContext>()
             .AddDefaultTokenProviders();
        }
        public static void AddServices(this IServiceCollection services)
        {
            services
                .AddScoped<M.Services.Security.JwtGenerator>()
                .AddScoped<IAuthService, AuthService>()
                .AddScoped<IUserService, UserService>()
                .AddScoped<IRoleService, RoleService>()
                .AddScoped<IUserRoleService, UserRoleService>()
                .AddScoped<IUserLoginService, UserLoginService>()
                .AddScoped<IAttendanceLogService, AttendanceLogService>()
                .AddScoped<IAttendanceService, AttendanceService>()
                .AddScoped<IBankService, BankService>()
                .AddScoped<IDepartmentService, DepartmentService>()
                .AddScoped<IEmployeeBankAccountService, EmployeeBankAccountService>()
                .AddScoped<IEmployeeContractService, EmployeeContractService>()
                .AddScoped<IEmployeeDependentService, EmployeeDependentService>()
                .AddScoped<IEmployeeInsuranceService, EmployeeInsuranceService>()
                .AddScoped<IEmployeeSalaryService, EmployeeSalaryService>()
                .AddScoped<IEmployeeService, EmployeeService>()
                .AddScoped<ILeaveRequestService, LeaveRequestService>()
                .AddScoped<ILeaveTypeService, LeaveTypeService>()
                .AddScoped<IPayrollService, PayrollService>()
                .AddScoped<IPositionService, PositionService>()
                .AddScoped<ISalaryGroupService, SalaryGroupService>()
                .AddScoped<IShiftService, ShiftService>()
                .AddScoped<IEmployeeShiftService, EmployeeShiftService>()
                .AddScoped<IHolidayCalendarService, HolidayCalendarService>()
                .AddScoped<IAttendanceRuleService, AttendanceRuleService>()
                .AddScoped<IActivationCodeService, ActivationCodeService>()
                .AddScoped<IOvertimeRequestService, OvertimeRequestService>()
                .AddScoped<ILeaveLedgerService, LeaveLedgerService>()
                .AddScoped<IAttendanceCorrectionService, AttendanceCorrectionService>()
                .AddScoped<IOfficeLocationService, OfficeLocationService>()
                .AddScoped<IWorkTaskService, WorkTaskService>()
                .AddScoped<IWorkProjectService, WorkProjectService>()
                .AddScoped<IWorkPerformanceService, WorkPerformanceService>()
                .AddHttpContextAccessor();
        }

        //JWT
        public static void AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var secret = configuration.GetValue<string>("JwtSettings:Key");
            var key = Encoding.UTF8.GetBytes(secret ?? throw new InvalidOperationException("JWT Key not found"));


            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = configuration["JwtSettings:Issuer"],

                    ValidateAudience = true,
                    ValidAudience = configuration["JwtSettings:Audience"],

                    ValidateLifetime = true,

                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuerSigningKey = true
                };


                // ==========================
                // Handle 401 / 403 Response
                // ==========================
                options.Events = new JwtBearerEvents
                {
                    // Kh�ng c� token ho?c token sai
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();

                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "application/json";


                        var response = new
                        {
                            statusCode = 401,
                            code = ResponseCodeConstants.UNAUTHORIZED,
                            message = "You are not authenticated",
                            data = (object?)null
                        };


                        await context.Response.WriteAsJsonAsync(response);
                    },


                    // C� token nhung kh�ng d? quy?n Role
                    OnForbidden = async context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";


                        var response = new
                        {
                            statusCode = 403,
                            code = ResponseCodeConstants.FORBIDDEN,
                            message = "You do not have permission to access this resource",
                            data = (object?)null
                        };


                        await context.Response.WriteAsJsonAsync(response);
                    }
                };
            });
        }
        //Author
        public static void AddSwaggerConfig(this IServiceCollection services)
        {
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "API", Version = "v1" });

                // C?u h�nh d? Swagger h? tr? DateOnly
                c.MapType<DateOnly>(() => new OpenApiSchema
                {
                    Type = "string",
                    Format = "date", // �?m b?o Swagger hi?u r?ng d�y l� d?nh d?ng ng�y
                });

                // C?u h�nh Authorization
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter your token"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new string[] {}
                    }
                });
            });
        }

        //public static void AddGoogleAuthentication(this IServiceCollection services, IConfiguration configuration)
        //{
        //    var clientId = configuration["Authentication:Google:ClientId"];
        //    var clientSecret = configuration["Authentication:Google:ClientSecret"];

        //    if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        //        throw new InvalidOperationException("Google Authentication configuration is missing (ClientId or ClientSecret).");

        //    services.AddAuthentication()
        //        .AddGoogle(options =>
        //        {
        //            options.ClientId = clientId;
        //            options.ClientSecret = clientSecret;
        //        });
        //}




    }
}
