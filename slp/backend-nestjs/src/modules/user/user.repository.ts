import { Repository, EntityManager, IsNull } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { UserStatsDto } from "./dto/user-stats.dto";

export interface IUserRepository {
  getById(id: number): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  getByResetToken(token: string): Promise<User | null>;
  getByEmailVerificationToken(token: string): Promise<User | null>;
  update(user: User): Promise<void>;
  create(user: User): Promise<void>;
  delete(user: User): Promise<void>;
  getAllWithSearchPaginated(
    search?: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ items: User[]; total: number }>;
  getUserStats(userId: number): Promise<UserStatsDto>;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly entityManager: EntityManager,
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

  async getAllWithSearchPaginated(
    search?: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: User[]; total: number }> {
    const query = this.repo.createQueryBuilder("user");

    if (search) {
      query.where(
        "LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const total = await query.getCount();

    const items = await query
      .orderBy("user.id", "ASC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { items, total };
  }

  async getUserStats(userId: number): Promise<UserStatsDto> {
    // Count quizzes (only those not disabled)
    const quizCount = await this.entityManager.count("Quiz", {
      where: { userId, disabled: false },
    });

    // Count questions
    const questionCount = await this.entityManager.count("Question", {
      where: { userId },
    });

    // Count sources (only those not soft-deleted)
    const sourceCount = await this.entityManager.count("Source", {
      where: { userId, deletedAt: IsNull() },
    });

    // Count favorite items
    const favoriteCount = await this.entityManager.count("FavoriteItem", {
      where: { userId },
    });

    return {
      quizCount,
      questionCount,
      sourceCount,
      favoriteCount,
    };
  }
}
