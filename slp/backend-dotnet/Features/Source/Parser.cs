namespace backend_dotnet.Features.Source;

public interface IParserClient
{
    Task<ParseResult> ParseUrlAsync(string url, string? title = null);
    Task<ParseResult> ParseFileAsync(Stream fileStream, string fileName, string? title = null);
}

public class ParseResult
{
    public string Title { get; set; }
    public string RawText { get; set; }
    public string? RawHtml { get; set; }
    public object? ContentJson { get; set; }
    public object? Metadata { get; set; }
}

public class ParserClient : IParserClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ParserClient> _logger;

    public ParserClient(HttpClient httpClient, ILogger<ParserClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<ParseResult> ParseUrlAsync(string url, string? title = null)
    {
        var request = new { url, title };
        var response = await _httpClient.PostAsJsonAsync("/parse/url", request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ParseResult>();
    }

    public async Task<ParseResult> ParseFileAsync(Stream fileStream, string fileName, string? title = null)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new StreamContent(fileStream);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
        content.Add(fileContent, "file", fileName);
        if (!string.IsNullOrEmpty(title))
            content.Add(new StringContent(title), "title");

        var response = await _httpClient.PostAsync("/parse/file", content);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ParseResult>();
    }
}