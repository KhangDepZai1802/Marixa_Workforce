using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace M.Repositories.Migrations
{
    /// <inheritdoc />
    public partial class HandoverJsonColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF COL_LENGTH('dbo.EmployeeHandovers', 'AssetsJson') IS NULL ALTER TABLE [dbo].[EmployeeHandovers] ADD [AssetsJson] nvarchar(max) NOT NULL CONSTRAINT [DF_EmployeeHandovers_AssetsJson] DEFAULT N'';");
            migrationBuilder.Sql("IF COL_LENGTH('dbo.EmployeeHandovers', 'ProjectsJson') IS NULL ALTER TABLE [dbo].[EmployeeHandovers] ADD [ProjectsJson] nvarchar(max) NOT NULL CONSTRAINT [DF_EmployeeHandovers_ProjectsJson] DEFAULT N'';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This duplicate migration shares its schema changes with AddHandoverAssetAndProjectJson.
        }
    }
}
