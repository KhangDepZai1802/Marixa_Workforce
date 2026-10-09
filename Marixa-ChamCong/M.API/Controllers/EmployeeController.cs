using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.EmployeeModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmployeeController : ControllerBase
    {
        private readonly IEmployeeService _employeeService;

        public EmployeeController(IEmployeeService employeeService)
        {
            _employeeService = employeeService;
        }

        /// <summary>
        /// Retrieves all employees with pagination
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            int pageNumber = 1,
            int pageSize = 5)
        {
            BasePaginatedList<EmployeeResponseModelView> result =
                await _employeeService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<EmployeeResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieves employee by ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            EmployeeResponseModelView result =
                await _employeeService.GetByIdAsync(id);

            return Ok(new BaseResponse<EmployeeResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Creates a new employee
        /// </summary>
        /// <summary>
        /// Retrieves the employee record linked to a user account
        /// </summary>
        [HttpGet("get-by-user/{userId}")]
        public async Task<IActionResult> GetByUser(Guid userId)
        {
            EmployeeResponseModelView? result =
                await _employeeService.GetByUserIdAsync(userId);

            if (result == null)
            {
                return NotFound(new BaseResponse<string>(
                    statusCode: StatusCodeHelper.NotFound,
                    code: ResponseCodeConstants.NOT_FOUND,
                    data: "Employee not found"
                ));
            }

            return Ok(new BaseResponse<EmployeeResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }


        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateEmployeeModelView model)
        {
            Guid employeeId = await _employeeService.CreateAsync(model);

            return Ok(new BaseResponse<Guid>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: employeeId
            ));
        }

        /// <summary>
        /// Updates employee information
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateEmployeeModelView model)
        {
            await _employeeService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee updated successfully!"
            ));
        }

        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpGet("get-archived")]
        public async Task<IActionResult> GetArchived(int pageNumber = 1, int pageSize = 500)
        {
            var result = await _employeeService.GetArchivedAsync(pageNumber, pageSize);
            return Ok(new BaseResponse<BasePaginatedList<EmployeeResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpPost("restore/{id}")]
        public async Task<IActionResult> Restore(Guid id)
        {
            await _employeeService.RestoreAsync(id);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee restored successfully!"
            ));
        }

        /// <summary>
        /// Soft deletes employee by ID
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _employeeService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee deleted successfully!"
            ));
        }

        /// <summary>
        /// Permanently deletes employee by ID
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _employeeService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Employee permanently deleted successfully!"
            ));
        }
    }
}
