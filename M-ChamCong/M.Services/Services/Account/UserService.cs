using M.Contract.Repositories.Entities;
using M.Contract.Repositories.Entity;
using M.Contract.Repositories.IUOW;
using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Utils;
using M.Services.Mappings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ModelViews.UserInfoModelView;
using ModelViews.UserModelView;
using Services.Mappings;
using static M.Core.Base.BaseException;

namespace M.Services.Service
{
    public class UserService : IUserService
    {
        private readonly IUnitOfWork _unitOfWork;

        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<ApplicationUser> _userManager;

        private readonly IConfiguration _configuration;

        public UserService(
            IUnitOfWork unitOfWork,
            UserManager<ApplicationUser> userManager,
            IHttpContextAccessor httpContextAccessor,
            IConfiguration configuration)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _httpContextAccessor = httpContextAccessor;
            _configuration = configuration;
        }


        #region Create - Get - Update - Delete

        public async Task CreateAsync(CreateUserModelView model)
        {
            ApplicationUser user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                EmailConfirmed = true
            };

            // Create Identity User
            IdentityResult result = await _userManager.CreateAsync(user, model.Password);

            if (!result.Succeeded)
            {
                string error = result.Errors.FirstOrDefault()?.Description
                               ?? "Unknown error occurred";

                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.INVALID_INPUT,
                    error);
            }

            // Assign role
            bool roleExists = await _userManager.IsInRoleAsync(user, model.Role);

            if (!roleExists)
            {
                IdentityResult roleResult = await _userManager.AddToRoleAsync(
                    user,
                    model.Role);

                if (!roleResult.Succeeded)
                {
                    string error = roleResult.Errors.FirstOrDefault()?.Description
                                   ?? "Failed to assign role";

                    throw new ErrorException(
                        StatusCodes.Status400BadRequest,
                        ResponseCodeConstants.FAILED,
                        error);
                }
            }

            // Create Employee
            if (model.CreateEmployeeModelView != null)
            {
                model.CreateEmployeeModelView.UserId = user.Id;

                Employee employee = model.CreateEmployeeModelView.ToEntity();

                await _unitOfWork
                    .GetRepository<Employee>()
                    .InsertAsync(employee);
            }
            else
            {
                Employee employee = new Employee
                {
                    UserId = user.Id,
                    EmployeeCode = $"EMP{DateTime.UtcNow:yyyyMMddHHmmss}",
                    GivenName = user.UserName ?? "User",
                    FamilyName = string.Empty,
                    Email = user.Email,
                    Gender = GenderType.RatherNotSay,
                    LaborType = LaborType.FullTime,
                    Status = EmployeeStatus.Probation,
                    StartDate = DateTime.UtcNow
                };

                await _unitOfWork
                    .GetRepository<Employee>()
                    .InsertAsync(employee);
            }

            await _unitOfWork.SaveAsync();
        }


        public async Task<BasePaginatedList<UserResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
        {
            IGenericRepository<ApplicationUser> userRepo = _unitOfWork.GetRepository<ApplicationUser>();

            IQueryable<ApplicationUser> query = userRepo.Entities
                .Where(u => !u.DeletedTime.HasValue)
                .OrderBy(u => u.CreatedTime);

            int totalItems = await query.CountAsync();

            List<ApplicationUser> users = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            List<UserResponseModelView> result = users.ToViewModelList();

            return new BasePaginatedList<UserResponseModelView>(
                result.AsReadOnly(),
                totalItems,
                pageNumber,
                pageSize
            );
        }

        public async Task<UserResponseModelView> GetByIdAsync(Guid id)
        {
            ApplicationUser? user = await _unitOfWork.GetRepository<ApplicationUser>().Entities
                .Where(u => u.Id == id && !u.DeletedTime.HasValue)
                .FirstOrDefaultAsync()
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found"
                );

            // Mapping
            UserResponseModelView userViewModel = user.ToViewModel();
            return userViewModel;
        }

        public async Task UpdateAsync(UpdateUserModelView request)
        {
            var userRepo = _unitOfWork.GetRepository<ApplicationUser>();

            ApplicationUser user = await userRepo.Entities
                .FirstOrDefaultAsync(u => u.Id == request.Id && !u.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found"
                );

            // Update
            request.ToEntity(user);
            user.LastUpdatedBy = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            user.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await userRepo.UpdateAsync(user);
            await _unitOfWork.SaveAsync();
        }


        #region Delete

        public async Task SoftDeleteAsync(Guid id)
        {
            IGenericRepository<ApplicationUser> userRepo = _unitOfWork.GetRepository<ApplicationUser>();

            ApplicationUser? user = await userRepo.Entities
                .FirstOrDefaultAsync(u => u.Id == id && !u.DeletedTime.HasValue)
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found"
                );

            // audit
            string currentUser = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";

            // Soft delete Employee liên kết
            IGenericRepository<Employee> employeeRepo = _unitOfWork.GetRepository<Employee>();

            Employee? employee = await employeeRepo.Entities
                .FirstOrDefaultAsync(e => e.UserId == id && !e.DeletedTime.HasValue);

            if (employee != null)
            {
                employee.LastUpdatedBy = currentUser;
                employee.LastUpdatedTime = CoreHelper.SystemTimeNow;
                employee.DeletedBy = currentUser;
                employee.DeletedTime = CoreHelper.SystemTimeNow;

                await employeeRepo.UpdateAsync(employee);
            }

            // Soft delete user
            user.DeletedBy = currentUser;
            user.DeletedTime = CoreHelper.SystemTimeNow;

            await userRepo.UpdateAsync(user);
            await _unitOfWork.SaveAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            // Hard delete Employee liên kết trước
            IGenericRepository<Employee> employeeRepo = _unitOfWork.GetRepository<Employee>();

            Employee? employee = await employeeRepo.Entities
                .FirstOrDefaultAsync(e => e.UserId == id && !e.DeletedTime.HasValue);

            if (employee != null)
            {
                await employeeRepo.DeleteAsync(employee);
                await _unitOfWork.SaveAsync();
            }

            // Xóa luôn user
            ApplicationUser user = await _userManager.FindByIdAsync(id.ToString())
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found"
                );

            IdentityResult result = await _userManager.DeleteAsync(user);

            if (!result.Succeeded)
            {
                string errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.FAILED,
                    errors
                );
            }
        }

        #endregion


        #endregion


        #region Password Management

        // Set password if user didn't have one (e.g., Google login)
        public async Task SetPasswordAsync(Guid userId, string token, string newPassword)
        {
            ApplicationUser user = await _userManager.FindByIdAsync(userId.ToString())
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found"
                );

            IdentityResult result = await _userManager.ResetPasswordAsync(user, token, newPassword);

            if (!result.Succeeded)
            {
                string errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.FAILED,
                    $"{errors}"
                );
            }

            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);
        }

        // Change password when user knows the current password
        public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
        {
            ApplicationUser user = await _userManager.FindByIdAsync(userId.ToString())
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found."
                );

            // Dùng Identity ChangePasswordAsync để đảm bảo current password đúng
            IdentityResult result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);

            if (!result.Succeeded)
            {
                string errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new ErrorException(
                    StatusCodes.Status400BadRequest,
                    ResponseCodeConstants.FAILED,
                    errors
                );
            }

            // Cập nhật audit
            user.LastUpdatedBy = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            user.LastUpdatedTime = CoreHelper.SystemTimeNow;

            await _userManager.UpdateAsync(user);
        }


        #endregion



        #region Block / Unblock

        public async Task BlockUserAsync(Guid userId)
        {
            ApplicationUser user = await _userManager.FindByIdAsync(userId.ToString())
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found");

            user.LockoutEnabled = true;
            user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);

            user.LastUpdatedBy = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            user.LastUpdatedTime = CoreHelper.SystemTimeNow;
            await _userManager.UpdateAsync(user);
        }

        public async Task UnblockUserAsync(Guid userId)
        {
            ApplicationUser user = await _userManager.FindByIdAsync(userId.ToString())
                ?? throw new ErrorException(
                    StatusCodes.Status404NotFound,
                    ResponseCodeConstants.NOT_FOUND,
                    "User not found");

            user.LockoutEnabled = false;
            user.LockoutEnd = null;

            user.LastUpdatedBy = _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "System";
            user.LastUpdatedTime = CoreHelper.SystemTimeNow;
            await _userManager.UpdateAsync(user);
        }

        #endregion

    }

}