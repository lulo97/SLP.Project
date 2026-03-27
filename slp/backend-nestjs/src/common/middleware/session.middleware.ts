import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { SessionTokenService } from "../../modules/session/session-token.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Session } from "../../modules/session/session.entity";
import { User } from "../../modules/user/user.entity";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers["x-session-token"] as string;
    console.log(
      `[SessionMiddleware] Token received: ${token ? token.substring(0, 20) + "..." : "none"}`,
    );

    if (token) {
      const hash = SessionTokenService.hashToken(token);
      console.log(`[SessionMiddleware] Computed token hash: ${hash}`);

      const session = await this.sessionRepository.findOne({
        where: { tokenHash: hash, revoked: false },
        relations: ["user"],
      });

      if (session) {
        console.log(
          `[SessionMiddleware] Session found. ID: ${session.id}, revoked: ${session.revoked}, expiresAt: ${session.expiresAt}`,
        );
        if (session.expiresAt > new Date()) {
          const user = session.user;
          if (!user) {
            this.logger.error(
              "[SessionMiddleware] Session valid but user is null!",
            );
            throw new Error("Session valid but user null, this cannot happen");
          }
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            sessionId: session.id,
          };
          console.log(
            `[SessionMiddleware] User attached: ${user.username} (id: ${user.id})`,
          );
        } else {
          this.logger.warn(
            `[SessionMiddleware] Session expired at ${session.expiresAt}, current time: ${new Date()}`,
          );
        }
      } else {
        this.logger.warn(
          `[SessionMiddleware] No active session found for token hash: ${hash}`,
        );
      }
    } else {
      console.log("[SessionMiddleware] No X-Session-Token header present");
    }

    next();
  }
}
