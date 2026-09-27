using CloudOps.Api.Data;
using CloudOps.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CloudOps.Api.Controllers;

[Route("api/knowledge-articles")]
[ApiController]
public class KnowledgeArticlesController : ControllerBase
{
    private readonly CloudOpsDbContext _context;

    public KnowledgeArticlesController(CloudOpsDbContext context)
    {
        _context = context;
    }

    // GET: api/knowledge-articles
    [HttpGet]
    public async Task<ActionResult<IEnumerable<KnowledgeArticle>>> GetArticles(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? status)
    {
        var query = _context.KnowledgeArticles
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();

            query = query.Where(article =>
                article.Title.ToLower().Contains(term) ||
                article.Summary.ToLower().Contains(term) ||
                article.Content.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(article =>
                article.Category.ToLower() == category.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(article =>
                article.Status.ToLower() == status.Trim().ToLower());
        }

        return await query
            .OrderByDescending(article => article.UpdatedAt)
            .ToListAsync();
    }

    // GET: api/knowledge-articles/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<KnowledgeArticle>> GetArticle(int id)
    {
        var article = await _context.KnowledgeArticles
            .AsNoTracking()
            .FirstOrDefaultAsync(article => article.Id == id);

        if (article is null)
        {
            return NotFound();
        }

        return article;
    }

    // POST: api/knowledge-articles
    [HttpPost]
    public async Task<ActionResult<KnowledgeArticle>> CreateArticle(
        KnowledgeArticle article)
    {
        if (string.IsNullOrWhiteSpace(article.Title))
        {
            return BadRequest("Title is required.");
        }

        if (string.IsNullOrWhiteSpace(article.Content))
        {
            return BadRequest("Content is required.");
        }

        article.Id = 0;
        article.Title = article.Title.Trim();
        article.Summary = article.Summary?.Trim() ?? string.Empty;
        article.Content = article.Content.Trim();
        article.Category = NormalizeCategory(article.Category);
        article.Status = NormalizeStatus(article.Status);
        article.Author = article.Author?.Trim() ?? string.Empty;
        article.CreatedAt = DateTime.UtcNow;
        article.UpdatedAt = DateTime.UtcNow;

        _context.KnowledgeArticles.Add(article);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetArticle),
            new { id = article.Id },
            article);
    }

    // PUT: api/knowledge-articles/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateArticle(
        int id,
        KnowledgeArticle updatedArticle)
    {
        var article = await _context.KnowledgeArticles.FindAsync(id);

        if (article is null)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(updatedArticle.Title))
        {
            return BadRequest("Title is required.");
        }

        if (string.IsNullOrWhiteSpace(updatedArticle.Content))
        {
            return BadRequest("Content is required.");
        }

        article.Title = updatedArticle.Title.Trim();
        article.Summary = updatedArticle.Summary?.Trim() ?? string.Empty;
        article.Content = updatedArticle.Content.Trim();
        article.Category = NormalizeCategory(updatedArticle.Category);
        article.Status = NormalizeStatus(updatedArticle.Status);
        article.Author = updatedArticle.Author?.Trim() ?? string.Empty;
        article.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/knowledge-articles/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteArticle(int id)
    {
        var article = await _context.KnowledgeArticles.FindAsync(id);

        if (article is null)
        {
            return NotFound();
        }

        _context.KnowledgeArticles.Remove(article);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static string NormalizeCategory(string? category)
    {
        return string.IsNullOrWhiteSpace(category)
            ? "General"
            : category.Trim();
    }

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "Draft";
        }

        return status.Trim().ToLowerInvariant() switch
        {
            "draft" => "Draft",
            "published" => "Published",
            "archived" => "Archived",
            _ => "Draft"
        };
    }
}