import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminLog } from "./admin-log.entity";

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
}
