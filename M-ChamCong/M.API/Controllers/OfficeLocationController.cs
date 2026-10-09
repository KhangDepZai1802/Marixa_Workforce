using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.OfficeLocationModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OfficeLocationController : ControllerBase
    {
        private readonly IOfficeLocationService _officeLocationService;

        public OfficeLocationController(IOfficeLocationService officeLocationService)
        {
            _officeLocationService = officeLocationService;
        }

        /// <summary>
        /// Lấy danh sách địa điểm văn phòng (phân trang)
        /// </summary>
        [HttpGet("get-all")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<OfficeLocationResponseModelView> result =
                await _officeLocationService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<OfficeLocationResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Lấy địa điểm chính (mốc tham chiếu GPS mặc định cho chấm công)
        /// </summary>
        [HttpGet("primary")]
        public async Task<IActionResult> GetPrimary()
        {
            OfficeLocationResponseModelView? result =
                await _officeLocationService.GetPrimaryAsync();

            return Ok(new BaseResponse<OfficeLocationResponseModelView?>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Lấy 1 địa điểm theo ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            OfficeLocationResponseModelView result = await _officeLocationService.GetByIdAsync(id);

            return Ok(new BaseResponse<OfficeLocationResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Tạo địa điểm văn phòng (admin)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateOfficeLocationModelView model)
        {
            await _officeLocationService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Office location created successfully!"
            ));
        }

        /// <summary>
        /// Cập nhật địa điểm văn phòng (admin)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateOfficeLocationModelView model)
        {
            await _officeLocationService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Office location updated successfully!"
            ));
        }

        /// <summary>
        /// Soft delete (admin)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _officeLocationService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Office location soft-deleted successfully!"
            ));
        }
    }
}
