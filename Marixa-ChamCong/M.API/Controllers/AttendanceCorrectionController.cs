using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.AttendanceCorrectionModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AttendanceCorrectionController : ControllerBase
    {
        private readonly IAttendanceCorrectionService _attendanceCorrectionService;

        public AttendanceCorrectionController(IAttendanceCorrectionService attendanceCorrectionService)
        {
            _attendanceCorrectionService = attendanceCorrectionService;
        }

        /// <summary>
        /// Lấy danh sách yêu cầu sửa công (phân trang)
        /// </summary>
        [HttpGet("get-all")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<AttendanceCorrectionResponseModelView> result =
                await _attendanceCorrectionService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<AttendanceCorrectionResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Lấy 1 yêu cầu sửa công theo ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            AttendanceCorrectionResponseModelView result =
                await _attendanceCorrectionService.GetByIdAsync(id);

            return Ok(new BaseResponse<AttendanceCorrectionResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Danh sách yêu cầu theo nhân viên
        /// </summary>
        [HttpGet("by-employee/{employeeId}")]
        public async Task<IActionResult> ByEmployee(Guid employeeId)
        {
            List<AttendanceCorrectionResponseModelView> result =
                await _attendanceCorrectionService.ByEmployeeIdAsync(employeeId);

            return Ok(new BaseResponse<List<AttendanceCorrectionResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Tạo yêu cầu sửa công (nhân viên / HR / admin)
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAttendanceCorrectionModelView model)
        {
            await _attendanceCorrectionService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance correction requested successfully!"
            ));
        }

        /// <summary>
        /// Duyệt / từ chối yêu cầu sửa công (HR/admin; không tự duyệt chính mình).
        /// Khi duyệt, giá trị đề nghị được áp dụng vào bản ghi chấm công gốc.
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpPost("review")]
        public async Task<IActionResult> Review([FromBody] ReviewAttendanceCorrectionModelView model)
        {
            await _attendanceCorrectionService.ReviewAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance correction reviewed successfully!"
            ));
        }
    }
}
