using M.Contract.Repositories.Entities;
using M.Contract.Repositories.Entity;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Repositories.Context;
using M.Services.Mappings;
using M.Services.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ModelViews.ActivationCodeModelView;
using ModelViews.AuthModelView;
using System.Net.Mail;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly IConfiguration _configuration;
        private readonly DatabaseContext _dbContext;
        private readonly JwtGenerator _jwtGenerator;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            RoleManager<ApplicationRole> roleManager,
            IConfiguration configuration,
            DatabaseContext dbContext,
            JwtGenerator jwtGenerator)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _configuration = configuration;
            _dbContext = dbContext;
            _jwtGenerator = jwtGenerator;
        }

        #region Register

        public async Task RegisterAsync(RegisterModelView model)
        {
            model.Email = model.Email.Trim();
            model.Username = model.Username.Trim();

            if (string.IsNullOrEmpty(model.Username))
                throw new BadRequestException(
                    "INVALID_USERNAME",
                    "Username cannot be empty");

            if (string.IsNullOrEmpty(model.Email) ||
                !MailAddress.TryCreate(model.Email, out _))
                throw new BadRequestException(
                    "INVALID_EMAIL",
                    "Email is not valid");

            if (string.IsNullOrEmpty(model.Password) ||
                model.Password != model.ConfirmPassword)
                throw new BadRequestException(
                    "INVALID_PASSWORD",
                    "Password cannot be empty or does not match");

            ValidatePasswordPolicy(model.Password);

            // Kiểm tra username
            if (await _userManager.FindByNameAsync(model.Username) != null)
                throw new BadRequestException(
                    "DUPLICATE_USERNAME",
                    "Username already exists");

            // Kiểm tra email
            if (await _userManager.FindByEmailAsync(model.Email) != null)
                throw new BadRequestException(
                    "DUPLICATE_EMAIL",
                    "Email already exists");

            ApplicationUser user = new()
            {
                UserName = model.Username,
                Email = model.Email,
                EmailConfirmed = true
            };

            IdentityResult createResult =
                await _userManager.CreateAsync(user, model.Password);

            if (!createResult.Succeeded)
            {
                throw new BadRequestException(
                    "INVALID_INPUT",
                    createResult.Errors.FirstOrDefault()?.Description
                    ?? "Unknown error occurred");
            }

            // Chỉ gán role nếu tồn tại (DB chỉ có Admin/Employee)
            bool roleExists =
                await _roleManager.RoleExistsAsync("Employee");
            if (roleExists)
            {
                await _userManager.AddToRoleAsync(user, "Employee");
            }

            Employee employee = new()
            {
                UserId = user.Id,
                EmployeeCode = model.Username,
                GivenName = model.Username,
                FamilyName = string.Empty,
                Email = model.Email,
                BirthDate = null,
                Gender = GenderType.RatherNotSay,
                Status = EmployeeStatus.Probation,
                LaborType = LaborType.FullTime,
                StartDate = DateTime.UtcNow
            };

            await _dbContext.Set<Employee>().AddAsync(employee);
            await _dbContext.SaveChangesAsync();
        }

        #endregion

        #region Login

        public async Task<AuthResponseModelView> LoginAsync(
            LoginModelView loginModelView)
        {
            string login = loginModelView.Username?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(login))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Username, email, phone number or employee code is required.");
            }

            if (string.IsNullOrWhiteSpace(loginModelView.Password))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Password is required.");
            }

            // Tìm user linh hoạt: Username / Email / Phone
            ApplicationUser? user = await _userManager.Users
                .FirstOrDefaultAsync(x =>
                    x.UserName == login ||
                    x.Email == login ||
                    x.PhoneNumber == login);

            if (user == null)
            {
                // Fallback: tìm theo Mã nhân viên
                Employee? employeeByCode = await _dbContext.Set<Employee>()
                    .FirstOrDefaultAsync(x =>
                        x.EmployeeCode == login &&
                        !x.DeletedTime.HasValue &&
                        x.UserId.HasValue);

                if (employeeByCode?.UserId.HasValue == true)
                {
                    user = await _userManager.Users
                        .FirstOrDefaultAsync(x => x.Id == employeeByCode.UserId.Value);
                }
            }

            if (user == null)
            {
                throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "Account not found.");
            }

            if (user.DeletedTime.HasValue)
            {
                throw new ErrorException(
                    StatusCodes.Status403Forbidden,
                    ResponseCodeConstants.FORBIDDEN,
                    "User account has been deactivated.");
            }

            // Kiểm tra password (cho phép lockout khi sai)
            SignInResult result =
                await _signInManager.PasswordSignInAsync(
                    user,
                    loginModelView.Password,
                    loginModelView.RememberMe,
                    lockoutOnFailure: false);

            if (!result.Succeeded)
            {
                throw new ErrorException(
                    StatusCodes.Status401Unauthorized,
                    ResponseCodeConstants.UNAUTHORIZED,
                    "Username, email/phone/employee code or password is incorrect.");
            }

            // Lấy Employee (optional - hỗ trợ tài khoản admin thuần)
            Employee? employee = await _dbContext.Set<Employee>()
                .FirstOrDefaultAsync(x =>
                    x.UserId == user.Id &&
                    !x.DeletedTime.HasValue);

            // Generate JWT (thông qua JwtGenerator - đã gán claim role)
            DateTime expires = DateTime.UtcNow.AddMinutes(
                int.Parse(_configuration["Jwtsettings:ExpirationMinutes"]!));
            string token = await _jwtGenerator.GenerateAsync(user, employee);

            return new AuthResponseModelView
            {
                Token = token,
                ExpiredAt = expires,
                UserId = user.Id,
                UserName = user.UserName ?? string.Empty,
                GivenName = employee?.GivenName ?? user.UserName ?? string.Empty,
                FamilyName = employee?.FamilyName,
                EmployeeId = employee?.Id,
                EmployeeCode = employee?.EmployeeCode,
                Roles = (await _userManager.GetRolesAsync(user)).ToList()
            };
        }

        #endregion

        #region Activate (mã kích hoạt)

        public async Task ActivateAsync(ActivateAccountModelView model)
        {
            model.Code = model.Code.Trim();
            model.Password = model.Password.Trim();

            if (string.IsNullOrWhiteSpace(model.Code))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Activation code is required.");
            }

            if (string.IsNullOrWhiteSpace(model.Password))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Password is required.");
            }

            if (!string.IsNullOrWhiteSpace(model.ConfirmPassword) &&
                model.Password != model.ConfirmPassword)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Password and confirmation do not match.");
            }

            ValidatePasswordPolicy(model.Password);

            ActivationCode activationCode = await _dbContext.Set<ActivationCode>()
                .FirstOrDefaultAsync(x =>
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "Activation code not found.");

            if (activationCode.IsUsed || activationCode.UsedAt.HasValue)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Activation code has already been used.");
            }

            if (activationCode.ExpiresAt < DateTime.UtcNow)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Activation code has expired.");
            }

            // Xác định user cần kích hoạt
            Guid? userId = activationCode.UserId;

            if (userId == null)
            {
                Employee employee = await _dbContext.Set<Employee>()
                    .FirstOrDefaultAsync(x =>
                        x.Id == activationCode.EmployeeId &&
                        !x.DeletedTime.HasValue)
                    ?? throw new ErrorException(
                        StatusCodes.Status404NotFound,
                        ResponseCodeConstants.NOT_FOUND,
                        "Employee not found.");

                // Mã có thể được cấp trước khi hệ thống "đảm bảo tài khoản":
                // tự tạo user cho nhân viên (username = Mã NV) rồi tiếp tục.
                if (employee.UserId == null)
                {
                    await EnsureUserForAsync(employee, "Hactv");
                    await _dbContext.SaveChangesAsync();
                }

                userId = employee.UserId;
            }

            if (userId == null)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "No user account linked to this activation code.");
            }

            ApplicationUser user = await _userManager.Users
                .FirstOrDefaultAsync(x => x.Id == userId.Value)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User account not found.");

            // Đặt lại mật khẩu: gỡ mật khẩu cũ (nếu có) rồi đặt mật khẩu mới
            if (await _userManager.HasPasswordAsync(user))
            {
                await _userManager.RemovePasswordAsync(user);
            }

            IdentityResult passwordResult =
                await _userManager.AddPasswordAsync(user, model.Password);

            if (!passwordResult.Succeeded)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    passwordResult.Errors.FirstOrDefault()?.Description
                    ?? "Failed to set password.");
            }

            // Đánh dấu mã đã dùng
            activationCode.IsUsed = true;
            activationCode.UsedAt = DateTime.UtcNow;
            activationCode.ActivatedBy = user.UserName;
            activationCode.UserId = userId;
            activationCode.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await _dbContext.SaveChangesAsync();
        }

        public async Task<ActivationCodeResponseModelView>
            CreateActivationCodeAsync(CreateActivationCodeModelView model)
        {
            Employee employee = await _dbContext.Set<Employee>()
                .FirstOrDefaultAsync(x =>
                    x.Id == model.EmployeeId &&
                    !x.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "Employee not found.");

            bool codeExists = await _dbContext.Set<ActivationCode>()
                .AnyAsync(x =>
                    x.Code == model.Code &&
                    !x.DeletedTime.HasValue);

            if (codeExists)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Activation code already exists.");
            }

            // (1) Đảm bảo nhân viên có tài khoản đăng nhập trước khi cấp mã
            // Đảm bảo nhân viên có tài khoản đăng nhập (ApplicationUser)
            // trước khi cấp mã - tránh mã không gắn được user.
            if (employee.UserId == null)
            {
                await EnsureUserForAsync(employee, "Hactv");
                await _dbContext.SaveChangesAsync();
            }

            // (2) Vô hiệu hóa các mã kích hoạt cũ (chưa dùng, chưa hết hạn)
            DateTime now = DateTime.UtcNow;
            List<ActivationCode> previousCodes = await _dbContext.Set<ActivationCode>()
                .Where(x => x.EmployeeId == employee.Id && !x.IsUsed && x.ExpiresAt > now && !x.DeletedTime.HasValue)
                .ToListAsync();
            foreach (ActivationCode previousCode in previousCodes)
            {
                previousCode.ExpiresAt = now;
                previousCode.LastUpdatedTime = now;            }

            ActivationCode entity = model.ToEntity();
            entity.EmployeeId = employee.Id;
            entity.UserId = employee.UserId;
            entity.Code = model.Code.Trim();
            entity.CreatedBy = employee.UserId.HasValue ? "Reissue" : "System";
            entity.CreatedTime = CoreHelper.SystemTimeNow;

            await _dbContext.Set<ActivationCode>().AddAsync(entity);
            await _dbContext.SaveChangesAsync();

            return entity.ToViewModel();
        }

        public async Task VerifyAndLinkEmployeeAccountAsync(VerifyEmployeeActivationModelView model)
        {
            var employee = await _dbContext.Employees.FirstOrDefaultAsync(e =>
                e.Id == model.EmployeeId && !e.DeletedTime.HasValue)
                ?? throw new ErrorException(404, ResponseCodeConstants.NOT_FOUND, "Không tìm thấy nhân viên.");

            var code = await _dbContext.Set<ActivationCode>().FirstOrDefaultAsync(c =>
                c.EmployeeId == employee.Id && c.Code == model.Code.Trim() && !c.DeletedTime.HasValue)
                ?? throw new ErrorException(400, ResponseCodeConstants.BAD_REQUEST, "Mã kích hoạt không khớp với nhân viên.");

            if (code.IsUsed || code.UsedAt.HasValue)
                throw new ErrorException(400, ResponseCodeConstants.BAD_REQUEST, "Mã kích hoạt đã được sử dụng.");
            if (code.ExpiresAt <= DateTime.UtcNow)
                throw new ErrorException(400, ResponseCodeConstants.BAD_REQUEST, "Mã kích hoạt đã hết hạn.");
            if (employee.UserId.HasValue)
            {
                if (code.UserId.HasValue && code.UserId != employee.UserId)
                    throw new ErrorException(400, ResponseCodeConstants.BAD_REQUEST, "Mã kích hoạt không thuộc tài khoản của nhân viên.");

                code.UserId = employee.UserId;
                await _dbContext.SaveChangesAsync();
                return;
            }

            var username = employee.EmployeeCode.Trim();
            if (await _userManager.FindByNameAsync(username) != null)
                throw new ErrorException(400, ResponseCodeConstants.BAD_REQUEST, "Mã nhân viên đã được dùng làm tên đăng nhập.");

            var user = new ApplicationUser
            {
                UserName = username,
                Email = string.IsNullOrWhiteSpace(employee.Email) ? null : employee.Email.Trim(),
                EmailConfirmed = !string.IsNullOrWhiteSpace(employee.Email)
            };
            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
                throw new ErrorException(400, ResponseCodeConstants.BAD_REQUEST,
                    createResult.Errors.FirstOrDefault()?.Description ?? "Không thể tạo tài khoản.");

            if (await _roleManager.RoleExistsAsync("Employee"))
            {
                var roleResult = await _userManager.AddToRoleAsync(user, "Employee");
                if (!roleResult.Succeeded)
                {
                    await _userManager.DeleteAsync(user);
                    throw new ErrorException(400, ResponseCodeConstants.BAD_REQUEST,
                        roleResult.Errors.FirstOrDefault()?.Description ?? "Không thể gán quyền nhân viên.");
                }
            }

            employee.UserId = user.Id;
            code.UserId = user.Id;
            await _dbContext.SaveChangesAsync();
        }

        #endregion

        #region Change Password

        public async Task ChangePasswordAsync(ChangePasswordModelView model)
        {
            if (model.UserId == Guid.Empty)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "User id is required.");
            }

            if (string.IsNullOrWhiteSpace(model.CurrentPassword) ||
                string.IsNullOrWhiteSpace(model.NewPassword))
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Current and new passwords are required.");
            }

            if (!string.IsNullOrWhiteSpace(model.ConfirmPassword) &&
                model.NewPassword != model.ConfirmPassword)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Password and confirmation do not match.");
            }

            ValidatePasswordPolicy(model.NewPassword);

            ApplicationUser user = await _userManager.Users
                .FirstOrDefaultAsync(x => x.Id == model.UserId)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found.");

            bool currentValid =
                await _userManager.CheckPasswordAsync(user, model.CurrentPassword);

            if (!currentValid)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    "Current password is incorrect.");
            }

            IdentityResult changeResult = await _userManager.ChangePasswordAsync(
                user, model.CurrentPassword, model.NewPassword);

            if (!changeResult.Succeeded)
            {
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.BAD_REQUEST,
                    changeResult.Errors.FirstOrDefault()?.Description
                    ?? "Failed to change password.");
            }
        }

        #endregion

        #region Private

        // Đảm bảo nhân viên có tài khoản ApplicationUser (tạo mới nếu thiếu).
        // - Username: Mã NV (VD: NV-003) nếu còn trống, nếu trùng thì thêm hậu tố.
        // - Role: Employee (nếu tồn tại).
        // - Email: lấy từ hồ sơ nhân viên.
        // - Mật khẩu tạm: không đặt — nhân viên sẽ tự đặt qua kích hoạt
        //   (hoặc admin đặt riêng).
        private async Task EnsureUserForAsync(Employee employee, string passwordSuffix = "Hactv")
        {
            if (employee.UserId != null) return;

            string baseName = !string.IsNullOrWhiteSpace(employee.EmployeeCode)
                ? employee.EmployeeCode
                : "NV-" + Guid.NewGuid().ToString("N")[..8].ToUpper();

            // Trùng username? thêm hậu tố số duy nhất
            string candidate = baseName;
            int i = 1;
            while (await _userManager.FindByNameAsync(candidate) != null)
            {
                candidate = baseName + "-" + i++;
            }

            string email = !string.IsNullOrWhiteSpace(employee.Email)
                ? employee.Email.Trim()
                : $"{candidate.ToLowerInvariant()}@local";

            // Trùng email? thêm hậu tố số để luôn tạo được
            string finalEmail = email;
            int j = 1;
            while (await _userManager.FindByEmailAsync(finalEmail) != null)
            {
                finalEmail = email.Contains("@")
                    ? email.Replace("@", $"-{j}@")
                    : email + "-" + j;
                j++;
            }

            ApplicationUser user = new()
            {
                UserName = candidate,
                Email = finalEmail,
                EmailConfirmed = false,
                CreatedBy = "System"
            };

            IdentityResult result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
            {
                throw new ErrorException(
                    StatusCodes.Status500InternalServerError,
                    "CREATE_USER_FAILED",
                    result.Errors.FirstOrDefault()?.Description
                    ?? "Failed to create user account");
            }

            if (await _roleManager.RoleExistsAsync("Employee"))
            {
                await _userManager.AddToRoleAsync(user, "Employee");
            }

            // Đồng bộ quan hệ user <-> employee ở CẢ 2 phía:
            // - Employees.UserId (chính)
            // - AspNetUsers.EmployeeId (cột tương ứng)
            // - Số điện thoại (hỗ trợ đăng nhập linh hoạt)
            employee.UserId = user.Id;
            user.EmployeeId = employee.Id;
            if (!string.IsNullOrWhiteSpace(employee.PhoneNumber))
            {
                user.PhoneNumber = employee.PhoneNumber;
            }
        }

        // Chính sách mật khẩu: tối thiểu 10 ký tự, có chữ hoa, chữ thường,
        // chữ số và ký tự đặc biệt.
        private void ValidatePasswordPolicy(string password)
        {
            if (string.IsNullOrEmpty(password))
            {
                throw new BadRequestException(
                    "INVALID_PASSWORD",
                    "Password cannot be empty");
            }

            if (password.Length < 10)
            {
                throw new BadRequestException(
                    "WEAK_PASSWORD",
                    "Password must be at least 10 characters.");
            }

            bool hasUpper = password.Any(char.IsUpper);
            bool hasLower = password.Any(char.IsLower);
            bool hasDigit = password.Any(char.IsDigit);
            bool hasSpecial = password.Any(c => !char.IsLetterOrDigit(c));

            if (!hasUpper || !hasLower || !hasDigit || !hasSpecial)
            {
                throw new BadRequestException(
                    "WEAK_PASSWORD",
                    "Password must contain uppercase, lowercase, digit and special character.");
            }
        }

        #endregion
    }
}
