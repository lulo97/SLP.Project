using backend_dotnet.Features.Email;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;

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
        try
        {
            var emailRequest = new EmailRequest
            {
                To = to,
                Subject = subject,
                Body = body,
                From = _settings.FromEmail,
                FromName = _settings.FromName
            };

            var json = JsonSerializer.Serialize(emailRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // Call the email Docker container API
            var response = await _httpClient.PostAsync(_settings.ApiEndpoint, content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Email sent successfully to {To}", to);
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to send email to {To}. Status: {StatusCode}, Error: {Error}",
                    to, response.StatusCode, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception while sending email to {To}", to);
            throw;
        }
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

        await SendEmailRequest(emailRequest);
    }

    public async Task SendWithTemplateAsync(string to, string templateName, object model)
    {
        // In a real implementation, you would load and render a template
        // For now, just create a simple email based on template name
        string subject = $"Email from template: {templateName}";
        string body = $"Template: {templateName}\nModel: {JsonSerializer.Serialize(model)}";

        await SendAsync(to, subject, body);
    }

    private async Task SendEmailRequest(EmailRequest emailRequest)
    {
        try
        {
            var json = JsonSerializer.Serialize(emailRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(_settings.ApiEndpoint, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Email API returned {StatusCode}: {Error}",
                    response.StatusCode, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via API");
            // Don't throw in development/fake mode
            if (_settings.ThrowOnError)
                throw;
        }
    }
}

public class EmailRequest
{
    public string To { get; set; } = "";
    public string? From { get; set; }
    public string? FromName { get; set; }
    public string Subject { get; set; } = "";
    public string? Body { get; set; }
    public string? HtmlBody { get; set; }
    public bool IsHtml { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
}

public class EmailSettings
{
    public string ApiEndpoint { get; set; } = "http://localhost:8025/api/send";
    public string FromEmail { get; set; } = "noreply@yourapp.com";
    public string FromName { get; set; } = "Your App";
    public bool ThrowOnError { get; set; } = false;
}