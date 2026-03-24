import { Injectable, Logger, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { IEmailService } from './email.service.interface';
import { EmailSettings } from './email-settings.dto';
import { EmailRequest } from './email-request.dto';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly settings: EmailSettings;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.settings = {
      apiEndpoint: this.configService.get<string>('email.apiEndpoint') || 'http://localhost:3000/send-email',
      fromEmail: this.configService.get<string>('email.fromEmail') || 'noreply@yourapp.com',
      fromName: this.configService.get<string>('email.fromName') || 'SLP',
      throwOnError: this.configService.get<boolean>('email.throwOnError') || false,
    };
  }

  async sendAsync(to: string, subject: string, body: string): Promise<void> {
    const request: EmailRequest = {
      to,
      subject,
      body,
      from: this.settings.fromEmail,
      fromName: this.settings.fromName,
      isHtml: false,
    };
    await this.sendEmailRequest(request);
  }

  async sendHtmlAsync(to: string, subject: string, htmlBody: string): Promise<void> {
    const request: EmailRequest = {
      to,
      subject,
      html: htmlBody,
      from: this.settings.fromEmail,
      fromName: this.settings.fromName,
      isHtml: true,
    };
    await this.sendEmailRequest(request);
  }

  async sendWithTemplateAsync(to: string, templateName: string, model: any): Promise<void> {
    const subject = `Email from template: ${templateName}`;
    const body = `Template: ${templateName}\nModel: ${JSON.stringify(model)}`;
    await this.sendAsync(to, subject, body);
  }

  private async sendEmailRequest(request: EmailRequest): Promise<void> {
    // Build payload that the microservice expects
    const payload = {
      to: request.to,
      subject: request.subject,
      html: request.isHtml ? request.html : request.body,
    };

    this.logger.debug(`Sending email via microservice to ${request.to}`);

    try {
      const response = await lastValueFrom(
        this.httpService.post(this.settings.apiEndpoint, payload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Email sent successfully to ${request.to}`);
      } else {
        const errorMsg = `Email microservice returned ${response.status}`;
        this.logger.error(`${errorMsg} for ${request.to}`);
        if (this.settings.throwOnError) {
          throw new HttpException(errorMsg, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    } catch (error) {
      this.logger.error(`HTTP exception while calling email microservice for ${request.to}: ${error.message}`);
      if (this.settings.throwOnError) {
        throw new HttpException('Email service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }
    }
  }
}