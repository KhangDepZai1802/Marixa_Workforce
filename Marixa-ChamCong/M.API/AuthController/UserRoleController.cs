using M.Contract.Services.Interface;
using M.Core.Base;
using M.Core.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace M.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UserRoleController : ControllerBase
    {
        private readonly IUserRoleService _userRoleService;

        public UserRoleController(IUserRoleService userRoleService)
        {
            _userRoleService = userRoleService;
        }
        /// <summary>
        /// Assigns a role to a user
        /// </summary>
        [HttpPost("add-role")]
        public async Task<IActionResult> AddRoleToUser(Guid UserId, Guid RoleId)
        {
            await _userRoleService.AddRoleToUserAsync(UserId, RoleId);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Role added to user successfully!"
            ));
        }
        /// <summary>
        /// Removes a role from a user
        /// </summary>
        [HttpDelete("remove-role")]
        public async Task<IActionResult> RemoveRoleFormUser(Guid UserId, Guid RoleId)
        {
            await _userRoleService.RemoveRoleFromUserAsync(UserId, RoleId);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Role removed from user successfully!"
            ));
        }




        /// <summary>
        /// Retrieves the list of role names assigned to a user
        /// </summary>
        [HttpGet("get-roles/{userId}")]
        public async Task<IActionResult> GetRolesByUser(Guid userId)
        {
            IList<string> roles = await _userRoleService.GetRolesByUserAsync(userId);
            return Ok(new BaseResponse<IList<string>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: roles
            ));
        }
    }
}
