using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace M.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class UpperRecipientEmployee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UpperRecipientEmployeeId",
                table: "EmployeeReports",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE r
                SET UpperRecipientEmployeeId = e.Id
                FROM EmployeeReports r
                INNER JOIN Employees e ON r.UpperRecipient LIKE N'% · ' + e.EmployeeCode + N' · %'
                WHERE r.UpperRecipientEmployeeId IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UpperRecipientEmployeeId",
                table: "EmployeeReports");
        }
    }
}
