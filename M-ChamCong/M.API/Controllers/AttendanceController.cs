using M.Contract.Serivces.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.AttendanceModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;

        public AttendanceController(IAttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        /// <summary>
        /// Retrieves all attendances with pagination
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            int pageNumber = 1,
            int pageSize = 5)
        {
            BasePaginatedList<AttendanceResponseModelView> result =
                await _attendanceService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<AttendanceResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieves attendance by ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            AttendanceResponseModelView result =
                await _attendanceService.GetByIdAsync(id);

            return Ok(new BaseResponse<AttendanceResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Creates a new attendance
        /// </summary>
        /// <summary>
        /// Retrieves attendance records for a specific employee
        /// </summary>
        [HttpGet("by-employee/{employeeId}")]
        public async Task<IActionResult> ByEmployee(Guid employeeId)
        {
            List<AttendanceResponseModelView> result =
                await _attendanceService.ByEmployeeIdAsync(employeeId);

            return Ok(new BaseResponse<List<AttendanceResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Chấm công thực tế (VÀO CA / RA CA) cho ngày hiện tại.
        /// Tự tạo bản ghi Attendance của ngày nếu chưa có,
        /// thêm log, đồng bộ ảnh và tính giờ thực tế.
        /// </summary>
        [HttpPost("checkin")]
        public async Task<IActionResult> CheckIn(
            [FromBody] CheckInAttendanceModelView model)
        {
            CheckInAttendanceResponseModelView result =
                await _attendanceService.CheckInAsync(model);

            return Ok(new BaseResponse<CheckInAttendanceResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateAttendanceModelView model)
        {
            await _attendanceService.CreateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance created successfully!"
            ));
        }

        /// <summary>
        /// Updates attendance information
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateAttendanceModelView model)
        {
            await _attendanceService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance updated successfully!"
            ));
        }

        /// <summary>
        /// Approves / rejects an attendance record (duyệt ngày công)
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpPost("approve")]
        public async Task<IActionResult> Approve(
            [FromBody] ApproveAttendanceModelView model)
        {
            await _attendanceService.ApproveAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance approval status updated successfully!"
            ));
        }

        /// <summary>
        /// Soft deletes attendance by ID
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _attendanceService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance deleted successfully!"
            ));
        }

        /// <summary>
        /// Permanently deletes attendance by ID
        /// </summary>
        [Authorize(Roles = "Admin,Manager,HR")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _attendanceService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Attendance permanently deleted successfully!"
            ));
        }
    }
}
