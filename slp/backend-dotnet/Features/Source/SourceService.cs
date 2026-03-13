using System;
using System.IO;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace backend_dotnet.Features.Source;

public class SourceService : ISourceService
{
    private readonly ISourceRepository _sourceRepository;
    private readonly ILogger<SourceService> _logger;
    private readonly string _uploadPath;

    public SourceService(ISourceRepository sourceRepository, ILogger<SourceService> logger, IWebHostEnvironment env)
    {
        _sourceRepository = sourceRepository;
        _logger = logger;
        _uploadPath = Path.Combine(env.WebRootPath ?? env.ContentRootPath, "uploads");
        if (!Directory.Exists(_uploadPath))
            Directory.CreateDirectory(_uploadPath);
    }

    public async Task<SourceDto?> GetSourceByIdAsync(int id, int? currentUserId)
    {
        var source = await _sourceRepository.GetByIdAsync(id);
        if (source == null)
            return null;

        // If source is not owned by current user, we may still return if public? For now, only owner can view.
        if (source.UserId != currentUserId)
            return null;

        return MapToDto(source);
    }

    public async Task<IEnumerable<SourceListDto>> GetUserSourcesAsync(int userId)
    {
        var sources = await _sourceRepository.GetUserSourcesAsync(userId);
        return sources.Select(MapToListDto);
    }

    public async Task<SourceDto> UploadSourceAsync(int userId, IFormFile file, string? title)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("No file uploaded.");

        // Generate unique filename
        var ext = Path.GetExtension(file.FileName);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(_uploadPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Extract text based on file type (mock for now)
        string? rawText = null;
        if (ext.ToLower() == ".txt")
        {
            rawText = await File.ReadAllTextAsync(filePath);
        }
        else if (ext.ToLower() == ".pdf")
        {
            // Mock PDF extraction: just log
            _logger.LogInformation("PDF extraction not implemented, storing file only.");
            rawText = "[PDF content extraction placeholder]";
        }

        var source = new Source
        {
            UserId = userId,
            Type = ext?.TrimStart('.') ?? "unknown",
            Title = title ?? file.FileName,
            FilePath = filePath,
            RawText = rawText,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _sourceRepository.CreateAsync(source);
        return MapToDto(created);
    }

    public async Task<SourceDto> CreateSourceFromUrlAsync(int userId, string url, string? title)
    {
        // Mock URL fetching: just store URL and metadata
        var source = new Source
        {
            UserId = userId,
            Type = "link",
            Title = title ?? url,
            Url = url,
            RawText = "[Content would be fetched from URL]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _sourceRepository.CreateAsync(source);
        return MapToDto(created);
    }

    public async Task<bool> DeleteSourceAsync(int id, int userId, bool isAdmin)
    {
        var source = await _sourceRepository.GetByIdAsync(id);
        if (source == null)
            return false;

        if (!isAdmin && source.UserId != userId)
            return false;

        await _sourceRepository.SoftDeleteAsync(id);

        // Optionally delete physical file?
        if (!string.IsNullOrEmpty(source.FilePath) && File.Exists(source.FilePath))
        {
            try { File.Delete(source.FilePath); } catch { /* ignore */ }
        }

        return true;
    }

    private SourceDto MapToDto(Source s)
    {
        return new SourceDto
        {
            Id = s.Id,
            UserId = s.UserId,
            Type = s.Type,
            Title = s.Title,
            Url = s.Url,
            RawText = s.RawText,
            FilePath = s.FilePath,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,
            Metadata = s.MetadataJson
        };
    }

    private SourceListDto MapToListDto(Source s)
    {
        return new SourceListDto
        {
            Id = s.Id,
            Type = s.Type,
            Title = s.Title,
            Url = s.Url,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        };
    }

    public async Task<SourceDto> CreateSourceFromTextAsync(int userId, string title, string content)
    {
        // Optional: validate input
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.");
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Content cannot be empty.");

        var source = new Source
        {
            UserId = userId,
            Type = "note",                     // matches the database constraint
            Title = title,
            RawText = content,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _sourceRepository.CreateAsync(source);
        return MapToDto(created);
    }
}