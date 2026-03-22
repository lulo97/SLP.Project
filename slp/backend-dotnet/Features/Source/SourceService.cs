using backend_dotnet.Features.Helpers;

namespace backend_dotnet.Features.Source;

public class SourceService : ISourceService
{
    private readonly ISourceRepository _sourceRepository;
    private readonly ILogger<SourceService> _logger;
    private readonly string _uploadPath;
    private readonly IParserClient _parserClient;

    private static readonly Dictionary<string, string> ExtensionTypeMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
        { "pdf",  "pdf"  },
        { "txt",  "text" },
        { "html", "text" },
        { "htm",  "text" },
        { "md",   "text" },
        { "epub", "text" },
        };

    public SourceService(
        ISourceRepository sourceRepository,
        ILogger<SourceService> logger,
        IWebHostEnvironment env,
        IParserClient parserClient)
    {
        _sourceRepository = sourceRepository;
        _logger = logger;
        _uploadPath = Path.Combine(env.WebRootPath ?? env.ContentRootPath, "uploads");
        if (!Directory.Exists(_uploadPath))
            Directory.CreateDirectory(_uploadPath);
        _parserClient = parserClient;
    }

    // ── GET single ───────────────────────────────────────────────────────────
    public async Task<SourceDto?> GetSourceByIdAsync(int id, int? currentUserId)
    {
        var source = await _sourceRepository.GetByIdAsync(id);
        if (source == null || source.UserId != currentUserId)
            return null;
        return MapToDto(source);
    }

    // ── GET paged list ───────────────────────────────────────────────────────
    public async Task<PaginatedResult<SourceListDto>> GetUserSourcesAsync(
        int userId,
        SourceQueryParams query)
    {
        var (items, total) = await _sourceRepository.GetUserSourcesAsync(userId, query);

        return new PaginatedResult<SourceListDto>
        {
            Items = items.Select(MapToListDto).ToList(),
            Total = total,
            Page = Math.Max(query.Page, 1),
            PageSize = Math.Clamp(query.PageSize, 1, 100),
        };
    }

    // ── Upload file ──────────────────────────────────────────────────────────
    public async Task<SourceDto> UploadSourceAsync(int userId, IFormFile file, string? title)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("No file uploaded.");
        if (file.Length > 20 * 1024 * 1024)
            throw new ArgumentException("File too large.");

        using var parseStream = file.OpenReadStream();
        var parseResult = await _parserClient.ParseFileAsync(parseStream, file.FileName, title);

        var ext = Path.GetExtension(file.FileName).TrimStart('.');
        var fileName = $"{Guid.NewGuid()}.{ext}";
        var filePath = Path.Combine(_uploadPath, fileName);

        using (var fs = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(fs);

        var sourceType = ExtensionTypeMap.TryGetValue(ext, out var mapped) ? mapped : "txt";

        var source = new Source
        {
            UserId = userId,
            Type = sourceType,
            Title = parseResult.Title ?? title ?? file.FileName,
            FilePath = filePath,
            RawText = parseResult.RawText,
            RawHtml = parseResult.RawHtml,
            ContentJson = parseResult.ContentJson?.ToString(),
            MetadataJson = parseResult.Metadata?.ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        return MapToDto(await _sourceRepository.CreateAsync(source));
    }

    // ── Create from URL ──────────────────────────────────────────────────────
    public async Task<SourceDto> CreateSourceFromUrlAsync(int userId, string url, string? title)
    {
        var parseResult = await _parserClient.ParseUrlAsync(url, title);

        var source = new Source
        {
            UserId = userId,
            Type = "link",
            Title = parseResult.Title ?? title ?? url,
            Url = url,
            RawText = parseResult.RawText,
            RawHtml = parseResult.RawHtml,
            ContentJson = parseResult.ContentJson?.ToString(),
            MetadataJson = parseResult.Metadata?.ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        return MapToDto(await _sourceRepository.CreateAsync(source));
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    public async Task<bool> DeleteSourceAsync(int id, int userId, bool isAdmin)
    {
        var source = await _sourceRepository.GetByIdAsync(id);
        if (source == null) return false;
        if (!isAdmin && source.UserId != userId) return false;

        await _sourceRepository.SoftDeleteAsync(id);

        if (!string.IsNullOrEmpty(source.FilePath) && File.Exists(source.FilePath))
            try { File.Delete(source.FilePath); } catch { /* ignore */ }

        return true;
    }

    // ── Create note ──────────────────────────────────────────────────────────
    public async Task<SourceDto> CreateTextSourceAsync(int userId, string title, string content)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("Title is required.");
        if (string.IsNullOrWhiteSpace(content)) throw new ArgumentException("Content cannot be empty.");

        var source = new Source
        {
            UserId = userId,
            Type = "text",
            Title = title,
            RawText = content,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        return MapToDto(await _sourceRepository.CreateAsync(source));
    }

    // ── Mappers ──────────────────────────────────────────────────────────────
    private static SourceDto MapToDto(Source s) => new()
    {
        Id = s.Id,
        UserId = s.UserId,
        Type = s.Type,
        Title = s.Title,
        Url = s.Url,
        RawText = s.RawText,
        ContentJson = s.ContentJson,
        FilePath = s.FilePath,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt,
        Metadata = s.MetadataJson,
    };

    private static SourceListDto MapToListDto(Source s) => new()
    {
        Id = s.Id,
        Type = s.Type,
        Title = s.Title,
        Url = s.Url,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt,
    };
}