using System.Text.Json.Serialization;

namespace CloudOps.Api.Models;

public class IncidentWorkNote
{
    public int Id { get; set; }

    public int IncidentId { get; set; }

    public string Author { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Incident? Incident { get; set; }
}