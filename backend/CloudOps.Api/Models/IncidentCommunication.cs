using System.Text.Json.Serialization;

namespace CloudOps.Api.Models;

public class IncidentCommunication
{
    public int Id { get; set; }

    public int IncidentId { get; set; }

    public string Author { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string CommunicationType { get; set; } = "Customer Update";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Incident? Incident { get; set; }
}