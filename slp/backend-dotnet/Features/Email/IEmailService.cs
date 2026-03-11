namespace backend_dotnet.Features.Email;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string body);
    Task SendHtmlAsync(string to, string subject, string htmlBody);
    Task SendWithTemplateAsync(string to, string templateName, object model);
}