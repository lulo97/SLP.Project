import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { SessionRepository } from "./session.repository";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private sessionRepo: SessionRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Session required");
    }

    const hash = SessionTokenService.hashToken(token);

    const session = await this.sessionRepo.getByTokenHash(hash);

    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired session");
    }

    request.user = {
      id: session.userId,
      sessionId: session.id,
      role: session.user?.role,
      username: session.user?.username,
      email: session.user?.email,
    };
    return true;
  }

  private extractTokenFromHeader(request): string | undefined {
    const sessionToken = request.headers["x-session-token"];
    if (sessionToken) return sessionToken.trim();
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.split(" ")[1].trim();
    }
    return undefined;
  }
}
