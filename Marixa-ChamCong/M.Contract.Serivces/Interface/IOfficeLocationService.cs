using M.Core.Base;
using ModelViews.OfficeLocationModelView;

namespace M.Contract.Services.Interface
{
    public interface IOfficeLocationService
    {
        Task<BasePaginatedList<OfficeLocationResponseModelView>> GetAllAsync(
            int pageNumber,
            int pageSize);

        Task<OfficeLocationResponseModelView> GetByIdAsync(Guid id);

        // Lấy địa điểm chính đang hoạt động (mốc tham chiếu GPS mặc định)
        Task<OfficeLocationResponseModelView?> GetPrimaryAsync();

        Task CreateAsync(CreateOfficeLocationModelView model);

        Task UpdateAsync(UpdateOfficeLocationModelView model);

        Task SoftDeleteAsync(Guid id);
    }
}
