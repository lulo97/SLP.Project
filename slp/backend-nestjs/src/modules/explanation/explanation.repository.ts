import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Explanation } from './explanation.entity';

@Injectable()
export class ExplanationRepository {
  private repo: Repository<Explanation>;

  constructor(private dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(Explanation);
  }

  /**
   * Returns explanations for a source visible to the user:
   * system explanations (user_id IS NULL) + this user's own explanations.
   */
  async getBySourceId(sourceId: number, userId: number): Promise<Explanation[]> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.sourceId = :sourceId', { sourceId })
      .andWhere('(e.userId IS NULL OR e.userId = :userId)', { userId })
      .orderBy('e.createdAt', 'ASC')
      .getMany();
  }

  async getById(id: number): Promise<Explanation | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(entity: Explanation): Promise<Explanation> {
    const saved = await this.repo.save(entity);
    return saved;
  }

  async update(entity: Explanation): Promise<Explanation> {
    entity.updatedAt = new Date();
    return this.repo.save(entity);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}