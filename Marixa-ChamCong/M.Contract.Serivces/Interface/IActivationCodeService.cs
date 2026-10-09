using M.Core.Base;
using ModelViews.ActivationCodeModelView;

namespace M.Contract.Services.Interface
{
    public interface IActivationCodeService
    {
        Task<BasePaginatedList<ActivationCodeResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<ActivationCodeResponseModelView> GetByIdAsync(Guid id);

        Task CreateAsync(CreateActivationCodeModelView model);

        Task UpdateAsync(UpdateActivationCodeModelView model);

        Task SoftDeleteAsync(Guid id);

        Task DeleteAsync(Guid id);
    }
}
