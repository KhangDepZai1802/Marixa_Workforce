using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace M.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class EmployeeHandovers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmployeeHandovers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ManagerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LastWorkingDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    CompanyAssets = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    WorkProgress = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    AccountIssued = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ReviewNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ReviewedByEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedByName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastUpdatedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DeletedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeHandovers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeHandovers_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeHandovers_EmployeeId_Status",
                table: "EmployeeHandovers",
                columns: new[] { "EmployeeId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeeHandovers");
        }
    }
}
