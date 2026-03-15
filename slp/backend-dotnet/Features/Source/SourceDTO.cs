using System;

namespace backend_dotnet.Features.Source;

public class SourceDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string? RawText { get; set; }

    /// <summary>
    /// TipTap JSON (stored as raw string so frontend can parse directly).
    /// Null if the source has no rich-text content.
    /// </summary>
    public string? ContentJson { get; set; }

    public string? FilePath { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? Metadata { get; set; }
}

public class SourceListDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Url { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UploadSourceRequest
{
    public required IFormFile File { get; set; }
    public required string Title { get; set; }
}

public class CreateNoteSourceRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}