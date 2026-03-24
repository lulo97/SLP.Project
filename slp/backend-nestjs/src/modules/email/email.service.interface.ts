export interface IEmailService {
  sendAsync(to: string, subject: string, body: string): Promise<void>;
  sendHtmlAsync(to: string, subject: string, htmlBody: string): Promise<void>;
  sendWithTemplateAsync(to: string, templateName: string, model: any): Promise<void>;
}