
using CloudOps.Api.Data;
using CloudOps.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CloudOps.Api.Controllers;

[ApiController]
[Route("api/problems")]
public class ProblemsController : ControllerBase
{
    private readonly CloudOpsDbContext _context;

    public ProblemsController(CloudOpsDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Problem>>> GetProblems()
    {
        return Ok(await _context.Problems
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Problem>> GetProblem(int id)
    {
        var problem = await _context.Problems
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (problem == null)
            return NotFound();

        return Ok(problem);
    }

    [HttpPost]
    public async Task<ActionResult<Problem>> CreateProblem(
        [FromBody] ProblemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.Description))
            return BadRequest("Title and description are required.");

        var problem = new Problem
        {
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Status = "Open",
            Priority = request.Priority,
            AssignedTeam = request.AssignedTeam,
            RootCause = request.RootCause,
            Workaround = request.Workaround,
            PermanentFix = request.PermanentFix,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Problems.Add(problem);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetProblem),
            new { id = problem.Id },
            problem);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateProblem(
        int id, [FromBody] ProblemRequest request)
    {
        var problem = await _context.Problems.FindAsync(id);

        if (problem == null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.Description))
            return BadRequest("Title and description are required.");

        problem.Title = request.Title.Trim();
        problem.Description = request.Description.Trim();
        problem.Status = request.Status;
        problem.Priority = request.Priority;
        problem.AssignedTeam = request.AssignedTeam;
        problem.RootCause = request.RootCause;
        problem.Workaround = request.Workaround;
        problem.PermanentFix = request.PermanentFix;
        problem.UpdatedAt = DateTime.UtcNow;

        if (request.Status.Equals("Resolved", StringComparison.OrdinalIgnoreCase))
            problem.ResolvedAt ??= DateTime.UtcNow;
        else
            problem.ResolvedAt = null;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProblem(int id)
    {
        var problem = await _context.Problems.FindAsync(id);

        if (problem == null)
            return NotFound();

        _context.Problems.Remove(problem);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class ProblemRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "Open";
    public string Priority { get; set; } = "Medium";
    public string AssignedTeam { get; set; } = "Service Desk";
    public string? RootCause { get; set; }
    public string? Workaround { get; set; }
    public string? PermanentFix { get; set; }
}
