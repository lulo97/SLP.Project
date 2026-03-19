export class EmailService {
  constructor(provider) {
    this.provider = provider;
  }

  async sendEmail(options) {
    // You can add validation, logging, or other business rules here
    return this.provider.sendEmail(options);
  }
}