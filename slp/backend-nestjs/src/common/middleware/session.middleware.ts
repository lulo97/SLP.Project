import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../modules/session/session.entity';
import { User } from '../../modules/user/user.entity';
import * as crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['x-session-token'] as string;

    if (token) {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await this.sessionRepository.findOne({
        where: { tokenHash: hash, revoked: false },
        relations: ['user'],
      });

      if (session && session.expiresAt > new Date()) {
        const user = session.user;
        if (user) {
          // Attach user to request
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            sessionId: session.id,
          };
        }
      }
    }
    next();
  }
}