import dotenv from 'dotenv';

dotenv.config();

export const config = {
  resendApiKey: process.env.MAIL_RESEND_KEY,
  fromEmail: process.env.MAIL_FROM,
  port: parseInt(process.env.MAIL_PORT || '3000', 10),
};