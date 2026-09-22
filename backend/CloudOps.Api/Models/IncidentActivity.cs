namespace CloudOps.Api.Models;

public class IncidentActivity
{
    public int Id { get; set; }

    public int IncidentId { get; set; }

    public string ActivityType { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? PreviousValue { get; set; }

    public string? NewValue { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Incident? Incident { get; set; }
}