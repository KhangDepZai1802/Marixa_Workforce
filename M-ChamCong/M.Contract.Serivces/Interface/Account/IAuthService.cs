using M.Contract.Repositories.Entity;
using ModelViews.ActivationCodeModelView;
using ModelViews.AuthModelView;
using M.Core.Base;

namespace M.Contract.Services.Interface
{
    public interface IAuthService
    {
        Task<AuthResponseModelView> LoginAsync(LoginModelView loginModel);
        Task RegisterAsync(RegisterModelView registerModelView);

        // Kích hoạt tài khoản bằng mã kích hoạt (đặt mật khẩu mới)
        Task ActivateAsync(ActivateAccountModelView model);

        // Đổi mật khẩu (đã xác thực)
        Task ChangePasswordAsync(ChangePasswordModelView model);

        // Tạo mã kích hoạt cho nhân viên (bàn giao / kích hoạt)
        Task<ActivationCodeResponseModelView> CreateActivationCodeAsync(
            CreateActivationCodeModelView model);

        Task VerifyAndLinkEmployeeAccountAsync(VerifyEmployeeActivationModelView model);
    }
}
