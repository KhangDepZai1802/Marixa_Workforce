using M.Contract.Serivces.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.EmployeeBankAccountModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeeBankAccountController : ControllerBase
    {
        private readonly IEmployeeBankAccountService _employeeBankAccountService;

        public EmployeeBankAccountController(
            IEmployeeBankAccountService employeeBankAccountService)
        {
            _employeeBankAccountService = employeeBankAccountService;
        }

        /// <summary>
        /// Retrieves all employee bank accounts with pagination
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            int pageNumber = 1,
            int pageSize = 5)
        {
            BasePaginatedList<EmployeeBankAccountResponseModelView> result =
                await _employeeBankAccountService.GetAllAsync(
                    pageNumber,
                    pageSize);

            return Ok(new BaseResponse<BasePaginatedList<EmployeeBankAccountResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieves employee bank account by ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            EmployeeBankAccountResponseModelView result =
                await _employeeBankAccountService.GetByIdAsync(id);

            return Ok(new BaseResponse<EmployeeBankAccountResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Creates a new employee bank account
        /// </summary>
        /// <summary>
        /// Retrieves records for a specific employee
        /// </summary>
        [HttpGet("by-employee/{employeeId}")]
        public async Task<IActionResult> ByEmployee(Guid employeeId)
        {
            List<EmployeeBankAccountResponseModelView> result =
                await _employeeBankAccountService.ByEmployeeIdAsync(employeeId);

            return Ok(new BaseResponse<List<EmployeeBankAccountResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }


        [Authorize(Roles = "Admin")]
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateEmployeeBankAccountModelView model)
        {
            await _employeeBankAccountService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee bank account created successfully!"
            ));
        }

        /// <summary>
        /// Updates employee bank account information
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateEmployeeBankAccountModelView model)
        {
            await _employeeBankAccountService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee bank account updated successfully!"
            ));
        }

        /// <summary>
        /// Soft deletes employee bank account by ID
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _employeeBankAccountService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee bank account deleted successfully!"
            ));
        }

        /// <summary>
        /// Permanently deletes employee bank account by ID
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _employeeBankAccountService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee bank account permanently deleted successfully!"
            ));
        }
    }
}
