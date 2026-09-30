using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudOps.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPostIncidentReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PostIncidentReviewCompletedAt",
                table: "Incidents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreventiveAction",
                table: "Incidents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolutionSummary",
                table: "Incidents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolvedBy",
                table: "Incidents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RootCause",
                table: "Incidents",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PostIncidentReviewCompletedAt",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "PreventiveAction",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "ResolutionSummary",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "ResolvedBy",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "RootCause",
                table: "Incidents");
        }
    }
}
