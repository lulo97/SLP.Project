import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Comment } from "./comment.entity";

@Injectable()
export class CommentRepository {
  constructor(
    @InjectRepository(Comment)
    private readonly repo: Repository<Comment>,
  ) {}

  async findAllWithUserPaginated(
    includeDeleted = false,
    search?: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: Comment[]; total: number }> {
    const query = this.repo
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.user", "user")
      .orderBy("comment.createdAt", "DESC");

    if (!includeDeleted) {
      query.andWhere("comment.deletedAt IS NULL");
    }

    if (search) {
      query.andWhere(
        "(LOWER(comment.content) LIKE :search OR LOWER(user.username) LIKE :search)",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const total = await query.getCount();

    const items = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { items, total };
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
