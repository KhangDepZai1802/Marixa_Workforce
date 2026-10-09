using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.SalaryGroupModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class SalaryGroupController : ControllerBase
    {
        private readonly ISalaryGroupService _salaryGroupService;

        public SalaryGroupController(ISalaryGroupService salaryGroupService)
        {
            _salaryGroupService = salaryGroupService;
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 5)
        {
            BasePaginatedList<SalaryGroupResponseModelView> result =
                await _salaryGroupService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<SalaryGroupResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            SalaryGroupResponseModelView result =
                await _salaryGroupService.GetByIdAsync(id);

            return Ok(new BaseResponse<SalaryGroupResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateSalaryGroupModelView model)
        {
            await _salaryGroupService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Salary group created successfully!"
            ));
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateSalaryGroupModelView model)
        {
            await _salaryGroupService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Salary group updated successfully!"
            ));
        }

        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _salaryGroupService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Salary group deleted successfully!"
            ));
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _salaryGroupService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Salary group permanently deleted successfully!"
            ));
        }
    }
}
