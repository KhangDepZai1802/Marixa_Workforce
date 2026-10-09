namespace M.Contract.Services.Interface
{
    public interface IUserRoleService
    {
        Task AddRoleToUserAsync(Guid userId, Guid roleId);
        Task RemoveRoleFromUserAsync(Guid userId, Guid roleId);
        Task<IList<string>> GetRolesByUserAsync(Guid userId);
    }
}
