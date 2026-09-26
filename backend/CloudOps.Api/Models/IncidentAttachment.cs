namespace CloudOps.Api.Models;

public class IncidentAttachment
{
    public int Id { get; set; }

    public int IncidentId { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public string StoragePath { get; set; } = string.Empty;

    public string UploadedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Incident? Incident { get; set; }
}