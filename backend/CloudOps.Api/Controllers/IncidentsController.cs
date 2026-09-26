using CloudOps.Api.Data;
using CloudOps.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CloudOps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IncidentsController : ControllerBase
{
    private readonly CloudOpsDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private const long MaxAttachmentSize = 10 * 1024 * 1024;

    private static readonly HashSet<string> AllowedAttachmentExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ".png", ".jpg", ".jpeg", ".gif", ".webp",
            ".pdf", ".txt", ".log", ".csv", ".json", ".xml", ".zip"
        };

    public IncidentsController(
        CloudOpsDbContext context,
        IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    // GET: api/incidents
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Incident>>> GetIncidents()
    {
        var incidents = await _context.Incidents
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(incidents);
    }

    // GET: api/incidents/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Incident>> GetIncident(int id)
    {
        var incident = await _context.Incidents.FindAsync(id);

        if (incident is null)
        {
            return NotFound();
        }

        return Ok(incident);
    }

    // GET: api/incidents/1/activities
    [HttpGet("{id:int}/activities")]
    public async Task<ActionResult<IEnumerable<IncidentActivity>>>
        GetIncidentActivities(int id)
    {
        var incidentExists = await _context.Incidents
            .AnyAsync(i => i.Id == id);

        if (!incidentExists)
        {
            return NotFound();
        }

        var activities = await _context.IncidentActivities
            .Where(a => a.IncidentId == id)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(activities);
    }

    // GET: api/incidents/1/worknotes
    [HttpGet("{id:int}/worknotes")]
    public async Task<ActionResult<IEnumerable<IncidentWorkNote>>>
        GetIncidentWorkNotes(int id)
    {
        var incidentExists = await _context.Incidents
            .AnyAsync(i => i.Id == id);

        if (!incidentExists)
        {
            return NotFound();
        }

        var workNotes = await _context.IncidentWorkNotes
            .Where(note => note.IncidentId == id)
            .OrderByDescending(note => note.CreatedAt)
            .ToListAsync();

        return Ok(workNotes);
    }

    // POST: api/incidents/1/worknotes
    [HttpPost("{id:int}/worknotes")]
    public async Task<ActionResult<IncidentWorkNote>>
        CreateIncidentWorkNote(int id, IncidentWorkNote workNote)
    {
        var incident = await _context.Incidents.FindAsync(id);

        if (incident is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(workNote.Author))
        {
            return BadRequest("Author is required.");
        }

        if (string.IsNullOrWhiteSpace(workNote.Note))
        {
            return BadRequest("Work note is required.");
        }

        workNote.Id = 0;
        workNote.IncidentId = id;
        workNote.Author = workNote.Author.Trim();
        workNote.Note = workNote.Note.Trim();
        workNote.CreatedAt = DateTime.UtcNow;
        workNote.Incident = null;

        _context.IncidentWorkNotes.Add(workNote);

        _context.IncidentActivities.Add(new IncidentActivity
        {
            IncidentId = id,
            ActivityType = "WorkNoteAdded",
            Description = $"Work note added by {workNote.Author}.",
            NewValue = workNote.Note,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetIncidentWorkNotes),
            new { id },
            workNote
        );
    }

    // GET: api/incidents/1/communications
    [HttpGet("{id:int}/communications")]
    public async Task<ActionResult<IEnumerable<IncidentCommunication>>>
        GetIncidentCommunications(int id)
    {
        var incidentExists = await _context.Incidents.AnyAsync(i => i.Id == id);

        if (!incidentExists)
        {
            return NotFound();
        }

        var communications = await _context.IncidentCommunications
            .Where(c => c.IncidentId == id)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(communications);
    }

    // POST: api/incidents/1/communications
    [HttpPost("{id:int}/communications")]
    public async Task<ActionResult<IncidentCommunication>>
        CreateIncidentCommunication(int id, IncidentCommunication communication)
    {
        var incident = await _context.Incidents.FindAsync(id);

        if (incident is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(communication.Author))
        {
            return BadRequest("Author is required.");
        }

        if (string.IsNullOrWhiteSpace(communication.Message))
        {
            return BadRequest("Communication message is required.");
        }

        var communicationType =
            NormalizeCommunicationType(communication.CommunicationType);

        if (communicationType is null)
        {
            return BadRequest(
                "Communication type must be Customer Update, Internal Stakeholder Update, or Resolution Notice.");
        }

        communication.Id = 0;
        communication.IncidentId = id;
        communication.Author = communication.Author.Trim();
        communication.Message = communication.Message.Trim();
        communication.CommunicationType = communicationType;
        communication.CreatedAt = DateTime.UtcNow;
        communication.Incident = null;

        _context.IncidentCommunications.Add(communication);

        _context.IncidentActivities.Add(new IncidentActivity
        {
            IncidentId = id,
            ActivityType = "CommunicationAdded",
            Description =
                $"{communication.CommunicationType} added by {communication.Author}.",
            NewValue = communication.Message,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetIncidentCommunications),
            new { id },
            communication
        );
    }

    // GET: api/incidents/1/attachments
    [HttpGet("{id:int}/attachments")]
    public async Task<ActionResult<IEnumerable<IncidentAttachment>>> GetIncidentAttachments(int id)
    {
        if (!await _context.Incidents.AnyAsync(i => i.Id == id))
            return NotFound();

        return Ok(await _context.IncidentAttachments
            .Where(a => a.IncidentId == id)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync());
    }

    // POST: api/incidents/1/attachments
    [HttpPost("{id:int}/attachments")]
    [RequestSizeLimit(MaxAttachmentSize)]
    public async Task<ActionResult<IncidentAttachment>> UploadIncidentAttachment(
        int id, [FromForm] IFormFile file, [FromForm] string uploadedBy)
    {
        if (await _context.Incidents.FindAsync(id) is null)
            return NotFound();

        if (file is null || file.Length == 0)
            return BadRequest("A file is required.");

        if (file.Length > MaxAttachmentSize)
            return BadRequest("Attachment size cannot exceed 10 MB.");

        if (string.IsNullOrWhiteSpace(uploadedBy))
            return BadRequest("Uploaded by is required.");

        var originalFileName = Path.GetFileName(file.FileName);
        var extension = Path.GetExtension(originalFileName);

        if (string.IsNullOrWhiteSpace(extension) ||
            !AllowedAttachmentExtensions.Contains(extension))
            return BadRequest("File type is not allowed. Allowed types: PNG, JPG, JPEG, GIF, WEBP, PDF, TXT, LOG, CSV, JSON, XML, ZIP.");

        var root = Path.Combine(_environment.ContentRootPath, "uploads", "incidents", id.ToString());
        Directory.CreateDirectory(root);

        var storedFileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(root, storedFileName);

        try
        {
            await using (var stream = new FileStream(fullPath, FileMode.CreateNew))
                await file.CopyToAsync(stream);

            var attachment = new IncidentAttachment
            {
                IncidentId = id,
                FileName = originalFileName,
                ContentType = string.IsNullOrWhiteSpace(file.ContentType)
                    ? "application/octet-stream" : file.ContentType,
                FileSize = file.Length,
                StoragePath = Path.Combine("uploads", "incidents", id.ToString(), storedFileName),
                UploadedBy = uploadedBy.Trim(),
                CreatedAt = DateTime.UtcNow,
                Incident = null
            };

            _context.IncidentAttachments.Add(attachment);
            _context.IncidentActivities.Add(new IncidentActivity
            {
                IncidentId = id,
                ActivityType = "AttachmentAdded",
                Description = $"Attachment added by {attachment.UploadedBy}.",
                NewValue = attachment.FileName,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetIncidentAttachments), new { id }, attachment);
        }
        catch
        {
            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);
            throw;
        }
    }

    // GET: api/incidents/1/attachments/2
    [HttpGet("{id:int}/attachments/{attachmentId:int}")]
    public async Task<IActionResult> DownloadIncidentAttachment(int id, int attachmentId)
    {
        var attachment = await _context.IncidentAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.IncidentId == id);

        if (attachment is null)
            return NotFound();

        var fullPath = GetAttachmentFullPath(attachment.StoragePath);
        if (!System.IO.File.Exists(fullPath))
            return NotFound("Attachment file was not found on the server.");

        return PhysicalFile(fullPath,
            string.IsNullOrWhiteSpace(attachment.ContentType)
                ? "application/octet-stream" : attachment.ContentType,
            attachment.FileName);
    }

    // DELETE: api/incidents/1/attachments/2
    [HttpDelete("{id:int}/attachments/{attachmentId:int}")]
    public async Task<IActionResult> DeleteIncidentAttachment(int id, int attachmentId)
    {
        if (!await _context.Incidents.AnyAsync(i => i.Id == id))
            return NotFound();

        var attachment = await _context.IncidentAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.IncidentId == id);

        if (attachment is null)
            return NotFound();

        var fullPath = GetAttachmentFullPath(attachment.StoragePath);

        _context.IncidentAttachments.Remove(attachment);
        _context.IncidentActivities.Add(new IncidentActivity
        {
            IncidentId = id,
            ActivityType = "AttachmentDeleted",
            Description = $"Attachment deleted: {attachment.FileName}.",
            PreviousValue = attachment.FileName,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        if (System.IO.File.Exists(fullPath))
            System.IO.File.Delete(fullPath);

        return NoContent();
    }

    // POST: api/incidents
    [HttpPost]
    public async Task<ActionResult<Incident>> CreateIncident(Incident incident)
    {
        incident.Id = 0;
        incident.CreatedAt = DateTime.UtcNow;
        incident.EscalationLevel = "L1 Support";
        incident.EscalatedAt = null;

        var category = NormalizeCategory(incident.Category);
        if (category is null)
            return BadRequest("Category must be Application, Cloud / Infrastructure, Network, Database, Security, Hardware, Access / Identity, or Other.");

        incident.Category = category;
        incident.Subcategory = NormalizeSubcategory(incident.Subcategory);

        ApplyPriorityAndSla(incident);

        _context.Incidents.Add(incident);
        await _context.SaveChangesAsync();

        _context.IncidentActivities.Add(new IncidentActivity
        {
            IncidentId = incident.Id,
            ActivityType = "IncidentCreated",
            Description =
                $"Incident created with status {incident.Status}, " +
                $"priority {incident.Priority}.",
            NewValue = incident.Status,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetIncident),
            new { id = incident.Id },
            incident
        );
    }

    // PUT: api/incidents/1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateIncident(
        int id,
        Incident updatedIncident)
    {
        var incident = await _context.Incidents.FindAsync(id);

        if (incident is null)
        {
            return NotFound();
        }

        var requestedCategory = NormalizeCategory(updatedIncident.Category);
        if (requestedCategory is null)
            return BadRequest("Category must be Application, Cloud / Infrastructure, Network, Database, Security, Hardware, Access / Identity, or Other.");

        var requestedSubcategory = NormalizeSubcategory(updatedIncident.Subcategory);
        var activities = new List<IncidentActivity>();

        AddActivityIfChanged(
            activities,
            id,
            "TitleChanged",
            "Incident title changed.",
            incident.Title,
            updatedIncident.Title
        );

        AddActivityIfChanged(
            activities,
            id,
            "DescriptionChanged",
            "Incident description changed.",
            incident.Description,
            updatedIncident.Description
        );

        AddActivityIfChanged(
            activities,
            id,
            "SeverityChanged",
            "Incident severity changed.",
            incident.Severity,
            updatedIncident.Severity
        );

        AddActivityIfChanged(
            activities,
            id,
            "StatusChanged",
            "Incident status changed.",
            incident.Status,
            updatedIncident.Status
        );

        AddActivityIfChanged(
            activities,
            id,
            "AssignmentChanged",
            "Incident assignment changed.",
            incident.AssignedTo,
            updatedIncident.AssignedTo
        );

        AddActivityIfChanged(
            activities,
            id,
            "ResolutionNotesChanged",
            "Resolution notes updated.",
            incident.ResolutionNotes,
            updatedIncident.ResolutionNotes
        );

        AddActivityIfChanged(
            activities, id, "CategoryChanged", "Incident category changed.",
            incident.Category, requestedCategory
        );

        AddActivityIfChanged(
            activities, id, "SubcategoryChanged", "Incident subcategory changed.",
            incident.Subcategory, requestedSubcategory
        );

        var requestedEscalationLevel =
            NormalizeEscalationLevel(updatedIncident.EscalationLevel);

        if (requestedEscalationLevel is null)
        {
            return BadRequest(
                "Escalation level must be L1 Support, L2 Engineering, or Cloud Operations.");
        }

        var escalationChanged = !string.Equals(
            incident.EscalationLevel,
            requestedEscalationLevel,
            StringComparison.OrdinalIgnoreCase
        );

        if (escalationChanged)
        {
            AddActivityIfChanged(
                activities,
                id,
                "EscalationLevelChanged",
                "Incident escalation level changed.",
                incident.EscalationLevel,
                requestedEscalationLevel
            );
        }

        var severityChanged = !string.Equals(
            incident.Severity,
            updatedIncident.Severity,
            StringComparison.OrdinalIgnoreCase
        );

        var previousPriority = incident.Priority;
        var previousSlaDueAt = incident.SlaDueAt;

        incident.Title = updatedIncident.Title;
        incident.Description = updatedIncident.Description;
        incident.Severity = updatedIncident.Severity;
        incident.Status = updatedIncident.Status;
        incident.AssignedTo = updatedIncident.AssignedTo;
        incident.ResolvedAt = updatedIncident.ResolvedAt;
        incident.ResolutionNotes = updatedIncident.ResolutionNotes;
        incident.Category = requestedCategory;
        incident.Subcategory = requestedSubcategory;

        if (escalationChanged)
        {
            incident.EscalationLevel = requestedEscalationLevel;
            incident.EscalatedAt = DateTime.UtcNow;
        }

        if (severityChanged)
        {
            ApplyPriorityAndSla(incident);

            AddActivityIfChanged(
                activities,
                id,
                "PriorityChanged",
                "Incident priority changed automatically.",
                previousPriority,
                incident.Priority
            );

            AddActivityIfChanged(
                activities,
                id,
                "SlaDueAtChanged",
                "Incident SLA deadline recalculated.",
                FormatDateTime(previousSlaDueAt),
                FormatDateTime(incident.SlaDueAt)
            );
        }

        if (activities.Count > 0)
        {
            _context.IncidentActivities.AddRange(activities);
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/incidents/apply-automatic-escalations
    // Evaluates unresolved incidents and escalates them based on SLA state.
    [HttpPost("apply-automatic-escalations")]
    public async Task<IActionResult> ApplyAutomaticEscalations()
    {
        var incidents = await _context.Incidents
            .Where(i =>
                i.SlaDueAt != null &&
                i.Status.ToLower() != "resolved")
            .ToListAsync();

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

            // Automatic escalation can only move upward, never downward.
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

        if (activities.Count > 0)
        {
            _context.IncidentActivities.AddRange(activities);
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            evaluatedCount = incidents.Count,
            escalatedCount = escalatedIncidentIds.Count,
            incidentIds = escalatedIncidentIds.ToArray(),
            message = escalatedIncidentIds.Count > 0
                ? "Automatic SLA escalation completed successfully."
                : "No incidents require automatic SLA escalation."
        });
    }

    // POST: api/incidents/backfill-sla
    // One-time maintenance endpoint for incidents created before SLA tracking existed.
    [HttpPost("backfill-sla")]
    public async Task<IActionResult> BackfillSla()
    {
        var incidents = await _context.Incidents
            .Where(i => i.SlaDueAt == null)
            .ToListAsync();

        if (incidents.Count == 0)
        {
            return Ok(new
            {
                updatedCount = 0,
                message = "No incidents require SLA backfill."
            });
        }

        var activities = new List<IncidentActivity>();

        foreach (var incident in incidents)
        {
            var previousPriority = incident.Priority;
            var previousSlaDueAt = incident.SlaDueAt;

            ApplyPriorityAndSla(incident);

            activities.Add(new IncidentActivity
            {
                IncidentId = incident.Id,
                ActivityType = "PriorityChanged",
                Description = "Incident priority backfilled automatically.",
                PreviousValue = previousPriority,
                NewValue = incident.Priority,
                CreatedAt = DateTime.UtcNow
            });

            activities.Add(new IncidentActivity
            {
                IncidentId = incident.Id,
                ActivityType = "SlaDueAtChanged",
                Description = "Incident SLA deadline backfilled from original creation time.",
                PreviousValue = FormatDateTime(previousSlaDueAt),
                NewValue = FormatDateTime(incident.SlaDueAt),
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.IncidentActivities.AddRange(activities);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            updatedCount = incidents.Count,
            incidentIds = incidents.Select(i => i.Id).ToArray(),
            message = "SLA backfill completed successfully."
        });
    }

    // POST: api/incidents/backfill-escalation
    // One-time maintenance endpoint for incidents created before escalation tracking existed.
    [HttpPost("backfill-escalation")]
    public async Task<IActionResult> BackfillEscalation()
    {
        var incidents = await _context.Incidents
            .Where(i => i.EscalationLevel == null || i.EscalationLevel == "")
            .ToListAsync();

        if (incidents.Count == 0)
        {
            return Ok(new
            {
                updatedCount = 0,
                message = "No incidents require escalation backfill."
            });
        }

        foreach (var incident in incidents)
        {
            incident.EscalationLevel = "L1 Support";
            incident.EscalatedAt = null;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            updatedCount = incidents.Count,
            incidentIds = incidents.Select(i => i.Id).ToArray(),
            message = "Escalation backfill completed successfully."
        });
    }

    // POST: api/incidents/backfill-category
    // One-time maintenance endpoint for incidents created before classification existed.
    [HttpPost("backfill-category")]
    public async Task<IActionResult> BackfillCategory()
    {
        var incidents = await _context.Incidents
            .Where(i => i.Category == null || i.Category == "")
            .ToListAsync();

        if (incidents.Count == 0)
            return Ok(new { updatedCount = 0, message = "No incidents require category backfill." });

        foreach (var incident in incidents)
            incident.Category = "Application";

        await _context.SaveChangesAsync();

        return Ok(new
        {
            updatedCount = incidents.Count,
            incidentIds = incidents.Select(i => i.Id).ToArray(),
            message = "Incident category backfill completed successfully."
        });
    }


    // DELETE: api/incidents/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteIncident(int id)
    {
        var incident = await _context.Incidents.FindAsync(id);

        if (incident is null)
        {
            return NotFound();
        }

        _context.Incidents.Remove(incident);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private string GetAttachmentFullPath(string storagePath)
    {
        var contentRoot = Path.GetFullPath(_environment.ContentRootPath);
        var fullPath = Path.GetFullPath(Path.Combine(contentRoot, storagePath));
        var expectedRoot = Path.GetFullPath(
            Path.Combine(contentRoot, "uploads", "incidents"));
        var expectedRootWithSeparator =
            expectedRoot.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(expectedRootWithSeparator, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid attachment storage path.");

        return fullPath;
    }

    private static string? NormalizeCategory(string? category)
    {
        var value = category?.Trim();

        if (string.IsNullOrWhiteSpace(value)) return "Application";
        if (value.Equals("Application", StringComparison.OrdinalIgnoreCase)) return "Application";
        if (value.Equals("Cloud / Infrastructure", StringComparison.OrdinalIgnoreCase)) return "Cloud / Infrastructure";
        if (value.Equals("Network", StringComparison.OrdinalIgnoreCase)) return "Network";
        if (value.Equals("Database", StringComparison.OrdinalIgnoreCase)) return "Database";
        if (value.Equals("Security", StringComparison.OrdinalIgnoreCase)) return "Security";
        if (value.Equals("Hardware", StringComparison.OrdinalIgnoreCase)) return "Hardware";
        if (value.Equals("Access / Identity", StringComparison.OrdinalIgnoreCase)) return "Access / Identity";
        if (value.Equals("Other", StringComparison.OrdinalIgnoreCase)) return "Other";

        return null;
    }

    private static string? NormalizeSubcategory(string? subcategory)
    {
        var value = subcategory?.Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }


    private static string? NormalizeCommunicationType(
        string? communicationType)
    {
        var value = communicationType?.Trim();

        if (string.IsNullOrWhiteSpace(value))
        {
            return "Customer Update";
        }

        if (value.Equals("Customer Update", StringComparison.OrdinalIgnoreCase))
            return "Customer Update";

        if (value.Equals(
            "Internal Stakeholder Update",
            StringComparison.OrdinalIgnoreCase))
            return "Internal Stakeholder Update";

        if (value.Equals("Resolution Notice", StringComparison.OrdinalIgnoreCase))
            return "Resolution Notice";

        return null;
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
        var percentRemaining = remaining.TotalMilliseconds / totalSla.TotalMilliseconds;

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

    private static void ApplyPriorityAndSla(Incident incident)
    {
        var severity = incident.Severity?.Trim().ToLowerInvariant();

        switch (severity)
        {
            case "critical":
                incident.Priority = "P1 - Critical";
                incident.SlaDueAt = incident.CreatedAt.AddHours(4);
                break;

            case "high":
                incident.Priority = "P2 - High";
                incident.SlaDueAt = incident.CreatedAt.AddHours(8);
                break;

            case "low":
                incident.Priority = "P4 - Low";
                incident.SlaDueAt = incident.CreatedAt.AddHours(72);
                break;

            case "medium":
            default:
                incident.Priority = "P3 - Medium";
                incident.SlaDueAt = incident.CreatedAt.AddHours(24);
                break;
        }
    }

    private static string? FormatDateTime(DateTime? value)
    {
        return value?.ToUniversalTime()
            .ToString("yyyy-MM-dd HH:mm:ss 'UTC'");
    }

    private static void AddActivityIfChanged(
        ICollection<IncidentActivity> activities,
        int incidentId,
        string activityType,
        string description,
        string? previousValue,
        string? newValue)
    {
        var oldValue = previousValue ?? string.Empty;
        var updatedValue = newValue ?? string.Empty;

        if (string.Equals(
            oldValue,
            updatedValue,
            StringComparison.Ordinal))
        {
            return;
        }

        activities.Add(new IncidentActivity
        {
            IncidentId = incidentId,
            ActivityType = activityType,
            Description = description,
            PreviousValue = previousValue,
            NewValue = newValue,
            CreatedAt = DateTime.UtcNow
        });
    }
}