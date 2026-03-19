using backend_dotnet.Features.Email;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend_dotnet.Features.Email;

public class EmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<EmailService> _logger;
    private readonly EmailSettings _settings;

    public EmailService(
        HttpClient httpClient,
        ILogger<EmailService> logger,
        IOptions<EmailSettings> options)
    {
        _httpClient = httpClient;
        _logger = logger;
        _settings = options.Value;
    }

    public async Task SendAsync(string to, string subject, string body)
    {
        var emailRequest = new EmailRequest
        {
            To = to,
            Subject = subject,
            Body = body,
            From = _settings.FromEmail,
            FromName = _settings.FromName
        };

        await SendEmailRequestAsync(emailRequest);
    }

    public async Task SendHtmlAsync(string to, string subject, string htmlBody)
    {
        var emailRequest = new EmailRequest
        {
            To = to,
            Subject = subject,
            HtmlBody = htmlBody,
            IsHtml = true,
            From = _settings.FromEmail,
            FromName = _settings.FromName
        };

        await SendEmailRequestAsync(emailRequest);
    }

    public async Task SendWithTemplateAsync(string to, string templateName, object model)
    {
        string subject = $"Email from template: {templateName}";
        string body = $"Template: {templateName}\nModel: {JsonSerializer.Serialize(model)}";
        await SendAsync(to, subject, body);
    }

    private async Task SendEmailRequestAsync(EmailRequest emailRequest)
    {
        // Build payload with only the fields the microservice expects
        var payload = new
        {
            to = emailRequest.To,
            subject = emailRequest.Subject,
            html = emailRequest.IsHtml ? emailRequest.HtmlBody : emailRequest.Body
            // If plain text, you may need to convert to HTML – here we just use Body as HTML (fallback)
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        _logger.LogDebug("Sending email via microservice to {To}", emailRequest.To);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsync(_settings.ApiEndpoint, content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HTTP exception while calling email microservice for {To}", emailRequest.To);
            throw new Exception("Email service unavailable", ex);
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Email microservice returned {StatusCode}: {Error} for {To}",
                response.StatusCode, errorContent, emailRequest.To);

            string errorMessage = $"Email service error ({(int)response.StatusCode})";
            try
            {
                var errorJson = JsonSerializer.Deserialize<JsonElement>(errorContent);
                if (errorJson.TryGetProperty("error", out var errorProp) && errorProp.ValueKind == JsonValueKind.String)
                {
                    errorMessage = errorProp.GetString() ?? errorMessage;
                }
            }
            catch { /* ignore parsing errors */ }

            throw new Exception(errorMessage);
        }

        _logger.LogInformation("Email sent successfully to {To}", emailRequest.To);
    }
}

public class EmailRequest
{
    [JsonPropertyName("to")]
    public string To { get; set; } = "";

    [JsonPropertyName("from")]
    public string? From { get; set; }

    [JsonPropertyName("fromName")]
    public string? FromName { get; set; }

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = "";

    [JsonPropertyName("body")]
    public string? Body { get; set; }

    [JsonPropertyName("html")]
    public string? HtmlBody { get; set; }

    [JsonPropertyName("isHtml")]
    public bool IsHtml { get; set; }

    [JsonPropertyName("headers")]
    public Dictionary<string, string>? Headers { get; set; }
}

public class EmailSettings
{
    public string ApiEndpoint { get; set; } = "http://mail:3000/send-email";
    public string FromEmail { get; set; } = "noreply@yourapp.com";
    public string FromName { get; set; } = "Your App";
}