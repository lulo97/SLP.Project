import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from './session.entity';

export interface ISessionRepository {
  create(session: Session): Promise<void>;
  getByTokenHash(hash: string): Promise<Session | null>;
  revoke(sessionId: string): Promise<void>;
  revokeAllForUser(userId: number): Promise<void>;
}

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  async create(session: Session): Promise<void> {
    await this.repo.save(session);
  }

  async getByTokenHash(hash: string): Promise<Session | null> {
    return this.repo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.repo.update(sessionId, { revoked: true });
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.repo.update({ userId, revoked: false }, { revoked: true });
  }
}