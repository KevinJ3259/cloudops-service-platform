using System.Text.Json.Serialization;

namespace CloudOps.Api.Models;

public class KnowledgeArticle
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public string Category { get; set; } = "General";

    public string Status { get; set; } = "Draft";

    public string Author { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public ICollection<IncidentKnowledgeArticle> Incidents { get; set; }
        = new List<IncidentKnowledgeArticle>();
}