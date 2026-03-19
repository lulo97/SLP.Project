import Joi from 'joi';
import { config } from '../config.js';

export class EmailController {
  constructor(emailService) {
    this.emailService = emailService;
    
    // Define validation schema
    this.schema = Joi.object({
      to: Joi.string().email().required(),
      subject: Joi.string().min(3).max(200).required(),
      html: Joi.string().required()
    });
  }

  async sendEmail(req, res, next) {
    try {
      // 1. Validate Input
      const { error, value } = this.schema.validate(req.body);
      
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      // 2. Execute Service
      const data = await this.emailService.sendEmail({
        from: config.fromEmail,
        to: value.to,
        subject: value.subject,
        html: value.html,
      });

      res.json({ success: true, data });
    } catch (error) {
      // Pass error to the global handler in app.js
      next(error);
    }
  }
}