using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.LeaveLedgerModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LeaveLedgerController : ControllerBase
    {
        private readonly ILeaveLedgerService _leaveLedgerService;

        public LeaveLedgerController(ILeaveLedgerService leaveLedgerService)
        {
            _leaveLedgerService = leaveLedgerService;
        }

        /// <summary>
        /// Danh sách giao dịch sổ phép (phân trang)
        /// </summary>
        [HttpGet("get-all")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<LeaveLedgerResponseModelView> result =
                await _leaveLedgerService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<LeaveLedgerResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Lấy 1 giao dịch theo ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            LeaveLedgerResponseModelView result = await _leaveLedgerService.GetByIdAsync(id);

            return Ok(new BaseResponse<LeaveLedgerResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Lịch sử giao dịch theo nhân viên + năm
        /// </summary>
        [HttpGet("by-employee/{employeeId}/year/{year}")]
        public async Task<IActionResult> ByEmployeeYear(Guid employeeId, int year)
        {
            List<LeaveLedgerResponseModelView> result =
                await _leaveLedgerService.ByEmployeeYearAsync(employeeId, year);

            return Ok(new BaseResponse<List<LeaveLedgerResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Số dư phép (Tổng đã cấp / Đã dùng / Còn lại) theo năm
        /// </summary>
        [HttpGet("summary/{employeeId}/year/{year}")]
        public async Task<IActionResult> Summary(Guid employeeId, int year)
        {
            LeaveLedgerSummaryModelView result =
                await _leaveLedgerService.GetSummaryAsync(employeeId, year);

            return Ok(new BaseResponse<LeaveLedgerSummaryModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Ghi 1 giao dịch sổ phép (cấp/điều chỉnh/trừ/hoàn).
        /// Trừ/hoàn liên quan đơn nghỉ phải do HR/admin sau khi đơn được xử lý.
        /// </summary>
        [HttpPost("create-entry")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> CreateEntry([FromBody] CreateLeaveLedgerEntryModelView model)
        {
            await _leaveLedgerService.CreateEntryAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Leave ledger entry created successfully!"
            ));
        }
    }
}
