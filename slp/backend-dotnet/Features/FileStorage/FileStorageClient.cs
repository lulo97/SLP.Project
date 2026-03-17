using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace backend_dotnet.Features.FileStorage;

public sealed class FileStorageClient : IFileStorageClient
{
    private readonly HttpClient _http;
    private readonly FileStorageSettings _settings;
    private readonly ILogger<FileStorageClient> _logger;

    public FileStorageClient(
        HttpClient http,
        IOptions<FileStorageSettings> settings,
        ILogger<FileStorageClient> logger)
    {
        _http     = http;
        _settings = settings.Value;
        _logger   = logger;

        _http.BaseAddress = new Uri(_settings.BaseUrl.TrimEnd('/') + "/");
    }

    // ── Upload ────────────────────────────────────────────────────────────────

    public async Task<string> UploadAvatarAsync(
        byte[] data,
        string contentType,
        string originalFileName)
    {
        using var content = new MultipartFormDataContent();

        var fileContent = new ByteArrayContent(data);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        content.Add(fileContent, "file", originalFileName);

        using var request = new HttpRequestMessage(HttpMethod.Post, "upload")
        {
            Content = content,
        };
        request.Headers.Add("X-API-Key", _settings.ApiKey);

        var response = await _http.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "File storage upload failed – HTTP {Status}: {Body}",
                (int)response.StatusCode, body);
            throw new InvalidOperationException(
                $"File storage service returned HTTP {(int)response.StatusCode}.");
        }

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        // The service returns { url, filename }; we store only the filename.
        if (!doc.RootElement.TryGetProperty("filename", out var filenameEl) ||
            filenameEl.ValueKind != JsonValueKind.String)
            throw new InvalidOperationException(
                "File storage service returned an unexpected response (missing 'filename').");

        return filenameEl.GetString()!;
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public async Task DeleteFileAsync(string filename)
    {
        if (string.IsNullOrWhiteSpace(filename)) return;

        using var request = new HttpRequestMessage(
            HttpMethod.Delete, $"files/{Uri.EscapeDataString(filename)}");
        request.Headers.Add("X-API-Key", _settings.ApiKey);

        var response = await _http.SendAsync(request);

        if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning(
                "File storage delete returned HTTP {Status} for '{Filename}'",
                (int)response.StatusCode, filename);
        }
    }
}