using CloudOps.Api.Data;
using CloudOps.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudOps.Api.Services;

public class AutomaticEscalationBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AutomaticEscalationBackgroundService> _logger;
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(1);

    public AutomaticEscalationBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<AutomaticEscalationBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Automatic SLA escalation background service started. Check interval: {Interval}.",
            CheckInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await EvaluateIncidentsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Automatic SLA escalation background check failed.");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task EvaluateIncidentsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CloudOpsDbContext>();

        var incidents = await context.Incidents
            .Where(i =>
                i.SlaDueAt != null &&
                i.Status.ToLower() != "resolved")
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var activities = new List<IncidentActivity>();
        var escalatedIncidentIds = new List<int>();

        foreach (var incident in incidents)
        {
            var targetLevel = GetAutomaticEscalationLevel(incident, now);

            if (targetLevel is null)
            {
                continue;
            }

            var currentLevel =
                NormalizeEscalationLevel(incident.EscalationLevel) ?? "L1 Support";

            if (GetEscalationRank(targetLevel) <= GetEscalationRank(currentLevel))
            {
                continue;
            }

            var previousLevel = currentLevel;

            incident.EscalationLevel = targetLevel;
            incident.EscalatedAt = now;

            activities.Add(new IncidentActivity
            {
                IncidentId = incident.Id,
                ActivityType = "AutomaticEscalation",
                Description = "Incident automatically escalated based on SLA status.",
                PreviousValue = previousLevel,
                NewValue = targetLevel,
                CreatedAt = now
            });

            escalatedIncidentIds.Add(incident.Id);
        }

        if (activities.Count == 0)
        {
            _logger.LogDebug(
                "Automatic SLA escalation check completed. No incidents required escalation.");
            return;
        }

        context.IncidentActivities.AddRange(activities);
        await context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Automatically escalated {Count} incident(s): {IncidentIds}.",
            escalatedIncidentIds.Count,
            string.Join(", ", escalatedIncidentIds));
    }

    private static string? GetAutomaticEscalationLevel(
        Incident incident,
        DateTime now)
    {
        if (incident.SlaDueAt is null ||
            incident.Status.Equals("Resolved", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var dueAt = incident.SlaDueAt.Value.ToUniversalTime();
        var createdAt = incident.CreatedAt.ToUniversalTime();

        if (now >= dueAt)
        {
            return "Cloud Operations";
        }

        var totalSla = dueAt - createdAt;

        if (totalSla <= TimeSpan.Zero)
        {
            return "Cloud Operations";
        }

        var remaining = dueAt - now;
        var percentRemaining =
            remaining.TotalMilliseconds / totalSla.TotalMilliseconds;

        if (percentRemaining <= 0.25)
        {
            return "L2 Engineering";
        }

        return null;
    }

    private static int GetEscalationRank(string escalationLevel)
    {
        return escalationLevel switch
        {
            "Cloud Operations" => 3,
            "L2 Engineering" => 2,
            _ => 1
        };
    }

    private static string? NormalizeEscalationLevel(string? escalationLevel)
    {
        var value = escalationLevel?.Trim();

        if (string.IsNullOrWhiteSpace(value))
        {
            return "L1 Support";
        }

        if (value.Equals("L1 Support", StringComparison.OrdinalIgnoreCase))
            return "L1 Support";

        if (value.Equals("L2 Engineering", StringComparison.OrdinalIgnoreCase))
            return "L2 Engineering";

        if (value.Equals("Cloud Operations", StringComparison.OrdinalIgnoreCase))
            return "Cloud Operations";

        return null;
    }
}
