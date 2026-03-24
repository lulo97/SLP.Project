import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserStatsDto } from './dto/user-stats.dto';

export interface IUserRepository {
  getById(id: number): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  getByResetToken(token: string): Promise<User | null>;
  getByEmailVerificationToken(token: string): Promise<User | null>;
  update(user: User): Promise<void>;
  create(user: User): Promise<void>;
  delete(user: User): Promise<void>;
  getAll(): Promise<User[]>;
  getUserStats(userId: number): Promise<UserStatsDto>;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async getById(id: number): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  async getByUsername(username: string): Promise<User | null> {
    return this.repo.findOneBy({ username });
  }

  async getByResetToken(token: string): Promise<User | null> {
    return this.repo.findOneBy({ passwordResetToken: token });
  }

  async getByEmailVerificationToken(token: string): Promise<User | null> {
    return this.repo.findOneBy({ emailVerificationToken: token });
  }

  async update(user: User): Promise<void> {
    await this.repo.save(user);
  }

  async create(user: User): Promise<void> {
    await this.repo.save(user);
  }

  async delete(user: User): Promise<void> {
    await this.repo.remove(user);
  }

  async getAll(): Promise<User[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async getUserStats(userId: number): Promise<UserStatsDto> {
    // Placeholder – actual counts require relations to other tables
    // You'll need to inject other repositories or use query builder
    return {
      quizCount: 0,
      questionCount: 0,
      sourceCount: 0,
      favoriteCount: 0,
    };
  }
}