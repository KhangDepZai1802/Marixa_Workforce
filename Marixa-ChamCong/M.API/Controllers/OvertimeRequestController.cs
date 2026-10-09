using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.OvertimeRequestModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OvertimeRequestController : ControllerBase
    {
        private readonly IOvertimeRequestService _overtimeRequestService;

        public OvertimeRequestController(IOvertimeRequestService overtimeRequestService)
        {
            _overtimeRequestService = overtimeRequestService;
        }

        /// <summary>
        /// Lấy danh sách yêu cầu tăng ca (phân trang)
        /// </summary>
        [HttpGet("get-all")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<OvertimeRequestResponseModelView> result =
                await _overtimeRequestService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<OvertimeRequestResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Lấy 1 yêu cầu tăng ca theo ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            OvertimeRequestResponseModelView result =
                await _overtimeRequestService.GetByIdAsync(id);

            return Ok(new BaseResponse<OvertimeRequestResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Lấy danh sách theo nhân viên
        /// </summary>
        [HttpGet("by-employee/{employeeId}")]
        public async Task<IActionResult> ByEmployee(Guid employeeId)
        {
            List<OvertimeRequestResponseModelView> result =
                await _overtimeRequestService.ByEmployeeIdAsync(employeeId);

            return Ok(new BaseResponse<List<OvertimeRequestResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Tạo yêu cầu tăng ca mới (nhân viên / HR / admin)
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateOvertimeRequestModelView model)
        {
            await _overtimeRequestService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Overtime request created successfully!"
            ));
        }

        /// <summary>
        /// Cập nhật yêu cầu tăng ca (chỉ khi còn Pending)
        /// </summary>
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateOvertimeRequestModelView model)
        {
            await _overtimeRequestService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Overtime request updated successfully!"
            ));
        }

        /// <summary>
        /// Duyệt / từ chối yêu cầu tăng ca (HR / admin; không tự duyệt chính mình)
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpPost("review")]
        public async Task<IActionResult> Review([FromBody] ReviewOvertimeRequestModelView model)
        {
            await _overtimeRequestService.ReviewAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Overtime request reviewed successfully!"
            ));
        }

        /// <summary>
        /// Soft delete
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _overtimeRequestService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Overtime request soft-deleted successfully!"
            ));
        }
    }
}
