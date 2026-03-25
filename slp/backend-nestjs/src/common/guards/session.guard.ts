import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionRepository } from '../../modules/session/session.repository';
import { SessionTokenService } from '../../modules/session/session-token.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private sessionRepo: SessionRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Session required');
    }

    const hash = SessionTokenService.hashToken(token);
    const session = await this.sessionRepo.getByTokenHash(hash);
    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach user info to request
    request.user = { id: session.userId, sessionId: session.id };
    return true;
  }

  private extractTokenFromHeader(request): string | undefined {
    // 1. Check X-Session-Token (used by Angular interceptor)
    const sessionToken = request.headers['x-session-token'];
    if (sessionToken) return sessionToken;

    // 2. Fallback to Authorization: Bearer
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    return undefined;
  }
}