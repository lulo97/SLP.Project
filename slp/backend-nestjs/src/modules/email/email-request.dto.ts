export class EmailRequest {
  to: string;
  from?: string;
  fromName?: string;
  subject: string;
  body?: string;
  html?: string;
  isHtml?: boolean;
  headers?: Record<string, string>;
}