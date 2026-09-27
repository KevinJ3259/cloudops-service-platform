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

    public DbSet<IncidentWorkNote> IncidentWorkNotes { get; set; }

    public DbSet<IncidentCommunication> IncidentCommunications { get; set; }

    public DbSet<IncidentAttachment> IncidentAttachments { get; set; }

    public DbSet<KnowledgeArticle> KnowledgeArticles => Set<KnowledgeArticle>();

    public DbSet<IncidentKnowledgeArticle> IncidentKnowledgeArticles =>
    Set<IncidentKnowledgeArticle>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<IncidentKnowledgeArticle>()
            .HasOne(link => link.Incident)
            .WithMany(incident => incident.KnowledgeArticles)
            .HasForeignKey(link => link.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<IncidentKnowledgeArticle>()
            .HasOne(link => link.KnowledgeArticle)
            .WithMany(article => article.Incidents)
            .HasForeignKey(link => link.KnowledgeArticleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<IncidentKnowledgeArticle>()
            .HasIndex(link => new
            {
                link.IncidentId,
                link.KnowledgeArticleId
            })
            .IsUnique();
    }
}