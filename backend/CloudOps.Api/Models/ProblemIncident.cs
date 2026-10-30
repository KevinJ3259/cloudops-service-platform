
namespace CloudOps.Api.Models;

public class ProblemIncident
{
    public int Id { get; set; }

    public int ProblemId { get; set; }

    public Problem Problem { get; set; } = null!;

    public int IncidentId { get; set; }

    public Incident Incident { get; set; } = null!;

    public DateTime LinkedAt { get; set; } = DateTime.UtcNow;
}
