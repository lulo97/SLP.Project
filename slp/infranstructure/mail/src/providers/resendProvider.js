import { Resend } from 'resend';
import { IEmailProvider } from '../interfaces/IEmailProvider.js';

export class ResendProvider extends IEmailProvider {
  constructor(apiKey) {
    super();
    this.resend = new Resend(apiKey);
  }

  async sendEmail({ from, to, subject, html }) {
    return this.resend.emails.send({
      from,
      to,
      subject,
      html,
    });
  }
}