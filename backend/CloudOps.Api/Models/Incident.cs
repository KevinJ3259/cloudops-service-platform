namespace CloudOps.Api.Models;

public class Incident
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Severity { get; set; } = "Medium";

    public string Status { get; set; } = "Open";

    public string? AssignedTo { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ResolvedAt { get; set; }

    public string? ResolutionNotes { get; set; }

    public ICollection<IncidentActivity> Activities { get; set; }
    = new List<IncidentActivity>();

    public ICollection<IncidentWorkNote> WorkNotes { get; set; }
    = new List<IncidentWorkNote>();
}