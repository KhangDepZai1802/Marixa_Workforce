using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ModelViews.UserInfoModelView;
using ModelViews.UserModelView;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        #region User


        /// <summary>
        /// Retrieves all users with pagination
        /// </summary>
        [HttpGet("get-all")]
        [Authorize(Roles = "Admin,Manager,HR")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<UserResponseModelView> result = await _userService.GetAllAsync(pageNumber, pageSize);
            return Ok(new BaseResponse<BasePaginatedList<UserResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }
        /// <summary>
        /// Retrieves a user by ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        [Authorize(Roles = "Admin,User")]
        public async Task<IActionResult> GetById(Guid id)
        {
            UserResponseModelView result = await _userService.GetByIdAsync(id);

            return Ok(new BaseResponse<UserResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }
        /// <summary>
        /// Creates a new user
        /// </summary>
        [HttpPost("create")]
        [Authorize(Roles = "Admin,User")]
        public async Task<IActionResult> Create([FromBody] CreateUserModelView model)
        {
            await _userService.CreateAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Create user successfully!"
            ));
        }

        /// <summary>
        /// Updates user information
        /// </summary>
        [HttpPut("update")]
        [Authorize(Roles = "Admin,User")]
        public async Task<IActionResult> Update([FromBody] UpdateUserModelView model)
        {
            await _userService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Update user successfully!"
            ));
        }


        /// <summary>
        /// Soft deletes a user
        /// </summary>
        [HttpDelete("soft-delete/{id}")]
        [Authorize(Roles = "Admin,User")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _userService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User soft deleted successfully!"
            ));
        }

        /// <summary>
        /// Permanently deletes a user
        /// </summary>
        [HttpDelete("delete/{id}")]
        [Authorize(Roles = "Admin,User")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _userService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User deleted successfully!"
            ));
        }

        /// <summary>
        /// Blocks a user (they cannot log in)
        /// </summary>
        [HttpPost("{id}/block")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Block(Guid id)
        {
            await _userService.BlockUserAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User blocked successfully!"
            ));
        }

        /// <summary>
        /// Unblocks a user
        /// </summary>
        [HttpPost("{id}/unblock")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Unblock(Guid id)
        {
            await _userService.UnblockUserAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User unblocked successfully!"
            ));
        }
        #endregion

    }
}
