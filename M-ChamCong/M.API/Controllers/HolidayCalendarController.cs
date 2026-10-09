using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.HolidayCalendarModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class HolidayCalendarController : ControllerBase
    {
        private readonly IHolidayCalendarService _holidayCalendarService;

        public HolidayCalendarController(
            IHolidayCalendarService holidayCalendarService)
        {
            _holidayCalendarService = holidayCalendarService;
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<HolidayCalendarResponseModelView> result =
                await _holidayCalendarService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<HolidayCalendarResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result));
        }

        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            HolidayCalendarResponseModelView result =
                await _holidayCalendarService.GetByIdAsync(id);

            return Ok(new BaseResponse<HolidayCalendarResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result));
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateHolidayCalendarModelView model)
        {
            await _holidayCalendarService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Holiday created successfully!"));
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateHolidayCalendarModelView model)
        {
            await _holidayCalendarService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Holiday updated successfully!"));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _holidayCalendarService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Holiday deleted successfully!"));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _holidayCalendarService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Holiday permanently deleted successfully!"));
        }
    }
}
