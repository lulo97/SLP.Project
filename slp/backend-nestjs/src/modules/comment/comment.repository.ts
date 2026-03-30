import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';

@Injectable()
export class CommentRepository {
  constructor(
    @InjectRepository(Comment)
    private readonly repo: Repository<Comment>,
  ) {}

  async findAllWithUser(includeDeleted: boolean = false): Promise<Comment[]> {
    const query = this.repo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .orderBy('comment.createdAt', 'DESC');

    if (!includeDeleted) {
      query.andWhere('comment.deletedAt IS NULL');
    }
    return query.getMany();
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await this.repo.softDelete(id);
    return (result.affected || 0) > 0;
  }

  async restore(id: number): Promise<boolean> {
    const result = await this.repo.restore(id);
    return (result.affected || 0) > 0;
  }
}