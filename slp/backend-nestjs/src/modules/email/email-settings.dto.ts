export class EmailSettings {
  apiEndpoint: string = 'http://localhost:3000/send-email';
  fromEmail: string = 'noreply@yourapp.com';
  fromName: string = 'SLP';
  throwOnError: boolean = false;
}