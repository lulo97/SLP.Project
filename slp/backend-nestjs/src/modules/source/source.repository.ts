import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Like, MoreThanOrEqual, IsNull } from 'typeorm';
import { Source } from './source.entity';
import { SourceQueryParams } from './source.dto';

export interface ISourceRepository {
  getById(id: number): Promise<Source | null>;
  getUserSources(
    userId: number,
    query: SourceQueryParams,
    includeDeleted?: boolean,
  ): Promise<{ items: Source[]; total: number }>;
  create(source: Source): Promise<Source>;
  update(source: Source): Promise<void>;
  softDelete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
}

@Injectable()
export class SourceRepository implements ISourceRepository {
  constructor(
    @InjectRepository(Source)
    private readonly repo: Repository<Source>,
  ) {}

  async getById(id: number): Promise<Source | null> {
    return this.repo.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async getUserSources(
    userId: number,
    query: SourceQueryParams,
    includeDeleted = false,
  ): Promise<{ items: Source[]; total: number }> {
    const qb = this.repo.createQueryBuilder('source')
      .where('source.userId = :userId', { userId });

    if (!includeDeleted) {
      qb.andWhere('source.deletedAt IS NULL');
    }

    if (query.search) {
      qb.andWhere('LOWER(source.title) LIKE LOWER(:search)', { search: `%${query.search}%` });
    }

    if (query.type) {
      qb.andWhere('source.type = :type', { type: query.type });
    }

    const total = await qb.getCount();

    const page = Math.max(query.page || 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    const items = await qb
      .orderBy('source.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getMany();

    return { items, total };
  }

  async create(source: Source): Promise<Source> {
    return this.repo.save(source);
  }

  async update(source: Source): Promise<void> {
    source.updatedAt = new Date();
    await this.repo.save(source);
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.update(id, { deletedAt: new Date() });
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.repo.count({
      where: { id, deletedAt: IsNull() },
    });
    return count > 0;
  }
}