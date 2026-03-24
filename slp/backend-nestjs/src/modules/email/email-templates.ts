export class EmailTemplates {
  static getPasswordResetEmail(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset='UTF-8'>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
              .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class='container'>
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to set a new password:</p>
              <p><a href='${resetLink}' class='button'>Reset Password</a></p>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p>This link will expire in 1 hour.</p>
          </div>
      </body>
      </html>`;
  }

  static getEmailVerificationEmail(verifyLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset='UTF-8'>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
              .button { display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class='container'>
              <h2>Verify Your Email Address</h2>
              <p>Thanks for registering! Please verify your email address by clicking the button below:</p>
              <p><a href='${verifyLink}' class='button'>Verify Email</a></p>
              <p>If you didn't create an account, you can ignore this email.</p>
              <p>This link will expire in 24 hours.</p>
          </div>
      </body>
      </html>`;
  }
}