using M.Core.Base;
using ModelViews.UserInfoModelView;
using ModelViews.UserModelView;

namespace M.Contract.Services.Interface
{
    public interface IUserService
    {
        Task<BasePaginatedList<UserResponseModelView>> GetAllAsync(int pageNumber, int pageSize);
        Task<UserResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateUserModelView model);

        Task UpdateAsync(UpdateUserModelView user);

        Task SoftDeleteAsync(Guid id);
        Task DeleteAsync(Guid id);
        Task BlockUserAsync(Guid userId);
        Task UnblockUserAsync(Guid userId);




    }
}
