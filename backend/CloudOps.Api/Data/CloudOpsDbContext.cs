using CloudOps.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudOps.Api.Data;

public class CloudOpsDbContext : DbContext
{
    public CloudOpsDbContext(DbContextOptions<CloudOpsDbContext> options)
        : base(options)
    {
    }

    public DbSet<Incident> Incidents => Set<Incident>();
    public DbSet<IncidentActivity> IncidentActivities { get; set; }
}