using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudOps.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentEscalationTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EscalatedAt",
                table: "Incidents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EscalationLevel",
                table: "Incidents",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EscalatedAt",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "EscalationLevel",
                table: "Incidents");
        }
    }
}
