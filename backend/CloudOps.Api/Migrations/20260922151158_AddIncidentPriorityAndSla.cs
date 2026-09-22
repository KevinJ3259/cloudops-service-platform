using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudOps.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentPriorityAndSla : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Incidents",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "SlaDueAt",
                table: "Incidents",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "SlaDueAt",
                table: "Incidents");
        }
    }
}
