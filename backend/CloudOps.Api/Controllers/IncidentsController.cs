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

    // POST: api/incidents
    [HttpPost]
    public async Task<ActionResult<Incident>> CreateIncident(Incident incident)
    {
        incident.Id = 0;
        incident.CreatedAt = DateTime.UtcNow;

        _context.Incidents.Add(incident);
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

        incident.Title = updatedIncident.Title;
        incident.Description = updatedIncident.Description;
        incident.Severity = updatedIncident.Severity;
        incident.Status = updatedIncident.Status;
        incident.AssignedTo = updatedIncident.AssignedTo;
        incident.ResolvedAt = updatedIncident.ResolvedAt;
        incident.ResolutionNotes = updatedIncident.ResolutionNotes;

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
}