import { config } from '../config.js';

export class EmailController {
  constructor(emailService) {
    this.emailService = emailService;
  }

  async sendEmail(req, res) {
    try {
      const { to, subject, html } = req.body;

      if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
      }

      const data = await this.emailService.sendEmail({
        from: config.fromEmail,
        to,
        subject,
        html,
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}