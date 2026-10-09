using M.Core.Base;
using ModelViews.RoleModelView;

namespace M.Contract.Services.Interface
{
    public interface IRoleService
    {
        Task<BasePaginatedList<RoleResponseModelView>> GetAllAsync(int pageNumber, int pageSize);
        Task<RoleResponseModelView> GetByIdAsync(Guid id);
        Task CreateAsync(CreateRoleModelView role);
        Task UpdateAsync(UpdateRoleModelView role);
        Task DeleteAsync(Guid id);
        Task SoftDeleteAsync(Guid id);
    }
}
