
using System;
using System.ComponentModel.DataAnnotations;

namespace CloudOps.Api.Models;

public class Problem
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [MaxLength(30)]
    public string Status { get; set; } = "Open";

    [MaxLength(30)]
    public string Priority { get; set; } = "Medium";

    [MaxLength(100)]
    public string AssignedTeam { get; set; } = "Service Desk";

    public string? RootCause { get; set; }

    public string? Workaround { get; set; }

    public string? PermanentFix { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }
}
