using System.Text.Json.Serialization;

namespace CloudOps.Api.Models;

public class IncidentKnowledgeArticle
{
    public int Id { get; set; }

    public int IncidentId { get; set; }

    public int KnowledgeArticleId { get; set; }

    public DateTime LinkedAt { get; set; } = DateTime.UtcNow;

    public string LinkedBy { get; set; } = string.Empty;

    [JsonIgnore]
    public Incident? Incident { get; set; }

    public KnowledgeArticle? KnowledgeArticle { get; set; }
}