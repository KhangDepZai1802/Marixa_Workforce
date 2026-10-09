using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.EmployeeSalaryModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeeSalaryController : ControllerBase
    {
        private readonly IEmployeeSalaryService _employeeSalaryService;

        public EmployeeSalaryController(
            IEmployeeSalaryService employeeSalaryService)
        {
            _employeeSalaryService = employeeSalaryService;
        }

        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            int pageNumber = 1,
            int pageSize = 5)
        {
            BasePaginatedList<EmployeeSalaryResponseModelView> result =
                await _employeeSalaryService.GetAllAsync(
                    pageNumber,
                    pageSize);

            return Ok(new BaseResponse<BasePaginatedList<EmployeeSalaryResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            EmployeeSalaryResponseModelView result =
                await _employeeSalaryService.GetByIdAsync(id);

            return Ok(new BaseResponse<EmployeeSalaryResponseModelView>(
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
            List<EmployeeSalaryResponseModelView> result =
                await _employeeSalaryService.ByEmployeeIdAsync(employeeId);

            return Ok(new BaseResponse<List<EmployeeSalaryResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }


        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateEmployeeSalaryModelView model)
        {
            await _employeeSalaryService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee salary created successfully!"
            ));
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateEmployeeSalaryModelView model)
        {
            await _employeeSalaryService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee salary updated successfully!"
            ));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _employeeSalaryService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee salary deleted successfully!"
            ));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _employeeSalaryService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee salary permanently deleted successfully!"
            ));
        }
    }
}
