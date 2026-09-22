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

    public IncidentsController(CloudOpsDbContext context)
    {
        _context = context;
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

    // POST: api/incidents
    [HttpPost]
    public async Task<ActionResult<Incident>> CreateIncident(Incident incident)
    {
        incident.Id = 0;
        incident.CreatedAt = DateTime.UtcNow;

        _context.Incidents.Add(incident);
        await _context.SaveChangesAsync();

        var activity = new IncidentActivity
        {
            IncidentId = incident.Id,
            ActivityType = "IncidentCreated",
            Description = $"Incident created with status {incident.Status}.",
            NewValue = incident.Status,
            CreatedAt = DateTime.UtcNow
        };

        _context.IncidentActivities.Add(activity);
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

        incident.Title = updatedIncident.Title;
        incident.Description = updatedIncident.Description;
        incident.Severity = updatedIncident.Severity;
        incident.Status = updatedIncident.Status;
        incident.AssignedTo = updatedIncident.AssignedTo;
        incident.ResolvedAt = updatedIncident.ResolvedAt;
        incident.ResolutionNotes = updatedIncident.ResolutionNotes;

        if (activities.Count > 0)
        {
            _context.IncidentActivities.AddRange(activities);
        }

        await _context.SaveChangesAsync();

        return NoContent();
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