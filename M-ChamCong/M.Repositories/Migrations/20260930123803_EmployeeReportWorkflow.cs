using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace M.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class EmployeeReportWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Issues",
                table: "EmployeeReports",
                type: "nvarchar(max)",
                maxLength: 6000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Overview",
                table: "EmployeeReports",
                type: "nvarchar(max)",
                maxLength: 6000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Recommendations",
                table: "EmployeeReports",
                type: "nvarchar(max)",
                maxLength: 6000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Results",
                table: "EmployeeReports",
                type: "nvarchar(max)",
                maxLength: 6000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpperRequest",
                table: "EmployeeReports",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpperRequestDeadline",
                table: "EmployeeReports",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EmployeeReportAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VersionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    StoredName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastUpdatedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DeletedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeReportAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeReportAttachments_EmployeeReportVersions_VersionId",
                        column: x => x.VersionId,
                        principalTable: "EmployeeReportVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeReportEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActionName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Recipient = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ActorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ActorName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Deadline = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastUpdatedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DeletedTime = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeReportEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeReportEvents_EmployeeReports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "EmployeeReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeReportAttachments_VersionId",
                table: "EmployeeReportAttachments",
                column: "VersionId");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeReportEvents_ReportId",
                table: "EmployeeReportEvents",
                column: "ReportId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeeReportAttachments");

            migrationBuilder.DropTable(
                name: "EmployeeReportEvents");

            migrationBuilder.DropColumn(
                name: "Issues",
                table: "EmployeeReports");

            migrationBuilder.DropColumn(
                name: "Overview",
                table: "EmployeeReports");

            migrationBuilder.DropColumn(
                name: "Recommendations",
                table: "EmployeeReports");

            migrationBuilder.DropColumn(
                name: "Results",
                table: "EmployeeReports");

            migrationBuilder.DropColumn(
                name: "UpperRequest",
                table: "EmployeeReports");

            migrationBuilder.DropColumn(
                name: "UpperRequestDeadline",
                table: "EmployeeReports");
        }
    }
}
