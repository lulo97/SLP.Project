import * as crypto from 'crypto';

export class SessionTokenService {
  static generateToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('base64');
  }
}