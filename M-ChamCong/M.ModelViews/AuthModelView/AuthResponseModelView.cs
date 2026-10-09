using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations.Schema;

namespace ModelViews.AuthModelView
{
    public class AuthResponseModelView
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiredAt { get; set; }

        //UserInfo
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? FamilyName { get; set; }
        public string GivenName { get; set; } = string.Empty;
        public string? Picture { get; set; }
        public DateTime? BirthDate { get; set; }
        public GenderType Gender { get; set; }

        // Employee
        public Guid? EmployeeId { get; set; }
        public string? EmployeeCode { get; set; }

        // Roles
        public List<string> Roles { get; set; } = new();

        [NotMapped]
        public string FullName => string.IsNullOrWhiteSpace(FamilyName) ? GivenName : $"{GivenName} {FamilyName}";
    }
}
