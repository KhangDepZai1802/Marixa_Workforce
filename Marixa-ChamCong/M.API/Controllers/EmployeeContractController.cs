using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.EmployeeContractModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeeContractController : ControllerBase
    {
        private readonly IEmployeeContractService _employeeContractService;

        public EmployeeContractController(
            IEmployeeContractService employeeContractService)
        {
            _employeeContractService = employeeContractService;
        }

        /// <summary>
        /// Retrieves all employee contracts with pagination
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            int pageNumber = 1,
            int pageSize = 5)
        {
            BasePaginatedList<EmployeeContractResponseModelView> result =
                await _employeeContractService.GetAllAsync(
                    pageNumber,
                    pageSize);

            return Ok(new BaseResponse<BasePaginatedList<EmployeeContractResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieves employee contract by ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            EmployeeContractResponseModelView result =
                await _employeeContractService.GetByIdAsync(id);

            return Ok(new BaseResponse<EmployeeContractResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Creates a new employee contract
        /// </summary>
        /// <summary>
        /// Retrieves records for a specific employee
        /// </summary>
        [HttpGet("by-employee/{employeeId}")]
        public async Task<IActionResult> ByEmployee(Guid employeeId)
        {
            List<EmployeeContractResponseModelView> result =
                await _employeeContractService.ByEmployeeIdAsync(employeeId);

            return Ok(new BaseResponse<List<EmployeeContractResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }


        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateEmployeeContractModelView model)
        {
            await _employeeContractService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee contract created successfully!"
            ));
        }

        /// <summary>
        /// Updates employee contract information
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateEmployeeContractModelView model)
        {
            await _employeeContractService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee contract updated successfully!"
            ));
        }

        /// <summary>
        /// Soft deletes employee contract by ID
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _employeeContractService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee contract deleted successfully!"
            ));
        }

        /// <summary>
        /// Permanently deletes employee contract by ID
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _employeeContractService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee contract permanently deleted successfully!"
            ));
        }
    }
}
