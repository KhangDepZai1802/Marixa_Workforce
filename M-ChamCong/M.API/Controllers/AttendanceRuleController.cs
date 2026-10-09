using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.AttendanceRuleModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AttendanceRuleController : ControllerBase
    {
        private readonly IAttendanceRuleService _attendanceRuleService;

        public AttendanceRuleController(
            IAttendanceRuleService attendanceRuleService)
        {
            _attendanceRuleService = attendanceRuleService;
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<AttendanceRuleResponseModelView> result =
                await _attendanceRuleService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<AttendanceRuleResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result));
        }

        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            AttendanceRuleResponseModelView result =
                await _attendanceRuleService.GetByIdAsync(id);

            return Ok(new BaseResponse<AttendanceRuleResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result));
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateAttendanceRuleModelView model)
        {
            await _attendanceRuleService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance rule created successfully!"));
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateAttendanceRuleModelView model)
        {
            await _attendanceRuleService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance rule updated successfully!"));
        }

        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _attendanceRuleService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance rule deleted successfully!"));
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _attendanceRuleService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance rule permanently deleted successfully!"));
        }
    }
}
