using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.EmployeeInsuranceModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeeInsuranceController : ControllerBase
    {
        private readonly IEmployeeInsuranceService _employeeInsuranceService;

        public EmployeeInsuranceController(
            IEmployeeInsuranceService employeeInsuranceService)
        {
            _employeeInsuranceService = employeeInsuranceService;
        }

        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            int pageNumber = 1,
            int pageSize = 5)
        {
            BasePaginatedList<EmployeeInsuranceResponseModelView> result =
                await _employeeInsuranceService.GetAllAsync(
                    pageNumber,
                    pageSize);

            return Ok(new BaseResponse<BasePaginatedList<EmployeeInsuranceResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            EmployeeInsuranceResponseModelView result =
                await _employeeInsuranceService.GetByIdAsync(id);

            return Ok(new BaseResponse<EmployeeInsuranceResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieves records for a specific employee
        /// </summary>
        [HttpGet("by-employee/{employeeId}")]
        public async Task<IActionResult> ByEmployee(Guid employeeId)
        {
            List<EmployeeInsuranceResponseModelView> result =
                await _employeeInsuranceService.ByEmployeeIdAsync(employeeId);

            return Ok(new BaseResponse<List<EmployeeInsuranceResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }


        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateEmployeeInsuranceModelView model)
        {
            await _employeeInsuranceService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee insurance created successfully!"
            ));
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateEmployeeInsuranceModelView model)
        {
            await _employeeInsuranceService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee insurance updated successfully!"
            ));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _employeeInsuranceService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee insurance deleted successfully!"
            ));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _employeeInsuranceService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee insurance permanently deleted successfully!"
            ));
        }
    }
}
