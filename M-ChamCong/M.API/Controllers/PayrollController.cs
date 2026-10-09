using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.PayrollModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class PayrollController : ControllerBase
    {
        private readonly IPayrollService _payrollService;

        public PayrollController(IPayrollService payrollService)
        {
            _payrollService = payrollService;
        }

        /// <summary>
        /// Retrieves all payrolls with pagination
        /// </summary>
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            int pageNumber = 1,
            int pageSize = 5)
        {
            BasePaginatedList<PayrollResponseModelView> result =
                await _payrollService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<PayrollResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieves payroll by ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            PayrollResponseModelView result =
                await _payrollService.GetByIdAsync(id);

            return Ok(new BaseResponse<PayrollResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Creates a new payroll
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreatePayrollModelView model)
        {
            await _payrollService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Payroll created successfully!"
            ));
        }

        /// <summary>
        /// Updates payroll information
        /// </summary>
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdatePayrollModelView model)
        {
            await _payrollService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Payroll updated successfully!"
            ));
        }

        /// <summary>
        /// Soft deletes payroll by ID
        /// </summary>
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _payrollService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Payroll deleted successfully!"
            ));
        }

        /// <summary>
        /// Permanently deletes payroll by ID
        /// </summary>
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _payrollService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Payroll permanently deleted successfully!"
            ));
        }
    }
}