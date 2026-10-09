using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace M.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class EmployeePromotions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmployeePromotions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CurrentEmployeeCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CurrentPositionName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    NewPositionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NewPositionName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    NewPositionCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NewEmployeeCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TargetRoleName = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ProposedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProposedByEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProposedByName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ProposalType = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    AdditionalNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DecisionNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedByEmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedByName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AppliedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastUpdatedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DeletedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeePromotions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeePromotions_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeePromotions_EmployeeId_Status",
                table: "EmployeePromotions",
                columns: new[] { "EmployeeId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeePromotions");
        }
    }
}
