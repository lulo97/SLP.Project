export interface IEmailService {
  sendHtml(to: string, subject: string, html: string): Promise<void>;
}