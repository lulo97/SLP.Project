import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminLog } from "./admin-log.entity";
import { AdminLogFilterDto } from "./dto/admin-log-filter.dto";

export interface CreateLogDto {
  adminId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  details?: any;
}

@Injectable()
export class AdminLogRepository {
  constructor(
    @InjectRepository(AdminLog)
    private readonly repo: Repository<AdminLog>,
  ) {}

  async log(data: CreateLogDto): Promise<void> {
    const log = this.repo.create(data); // TypeORM can handle the object directly
    await this.repo.save(log);
  }

  async getRecent(limit: number = 100): Promise<AdminLog[]> {
    return this.repo.find({
      relations: ["admin"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async getRecentWithFilterPaginated(
    filter: AdminLogFilterDto,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: AdminLog[]; total: number }> {
    const query = this.repo
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.admin", "admin");

    if (filter.from) {
      query.andWhere("log.createdAt >= :from", { from: filter.from });
    }
    if (filter.to) {
      query.andWhere("log.createdAt <= :to", { to: filter.to });
    }
    if (filter.adminId) {
      query.andWhere("log.adminId = :adminId", { adminId: filter.adminId });
    }
    if (filter.action) {
      query.andWhere("log.action = :action", { action: filter.action });
    }
    if (filter.targetType) {
      query.andWhere("log.targetType = :targetType", {
        targetType: filter.targetType,
      });
    }

    if (filter.search) {
      const searchTerm = `%${filter.search.toLowerCase()}%`;
      query.andWhere(
        `(
        LOWER(admin.username) LIKE :search OR
        LOWER(log.action) LIKE :search OR
        LOWER(log.targetType) LIKE :search OR
        CAST(log.targetId AS TEXT) LIKE :search OR
        CAST(log.details AS TEXT) LIKE :search
      )`,
        { search: searchTerm },
      );
    }

    const total = await query.getCount();

    const items = await query
      .orderBy("log.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { items, total };
  }
}
