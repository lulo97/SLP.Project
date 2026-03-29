import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { FavoriteItem } from './favorite-item.entity';
import { PaginatedResult } from './dto/paginated-result.dto';

@Injectable()
export class FavoriteRepository {
  constructor(
    @InjectRepository(FavoriteItem)
    private readonly repo: Repository<FavoriteItem>,
  ) {}

  async getByUser(
    userId: number,
    search?: string,
    page = 1,
    pageSize = 10,
  ): Promise<PaginatedResult<FavoriteItem>> {
    const query = this.repo.createQueryBuilder('f')
      .where('f.userId = :userId', { userId });

    if (search && search.trim().length > 0) {
      const lower = search.toLowerCase();
      query.andWhere(
        '(LOWER(f.text) LIKE :search OR LOWER(f.note) LIKE :search)',
        { search: `%${lower}%` },
      );
    }

    const [items, total] = await query
      .orderBy('f.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total, page, pageSize };
  }

  async getById(id: number): Promise<FavoriteItem | null> {
    return this.repo.findOneBy({ id });
  }

  async create(item: FavoriteItem): Promise<FavoriteItem> {
    const saved = await this.repo.save(item);
    return saved;
  }

  async update(item: FavoriteItem): Promise<FavoriteItem> {
    item.updatedAt = new Date();
    return this.repo.save(item);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}