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
    console.log(
      "[SessionGuard] Token extracted:",
      token ? token.substring(0, 20) + "..." : "none",
    );

    if (!token) {
      throw new UnauthorizedException("Session required");
    }

    const hash = SessionTokenService.hashToken(token);
    console.log("[SessionGuard] Token hash:", hash);

    const session = await this.sessionRepo.getByTokenHash(hash);
    console.log(
      "[SessionGuard] Session found:",
      !!session,
      session?.revoked,
      session?.expiresAt,
    );

    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired session");
    }

    request.user = { id: session.userId, sessionId: session.id };
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
