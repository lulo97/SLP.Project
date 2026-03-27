import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './report.entity';

export interface IReportRepository {
  findById(id: number): Promise<Report | null>;
  findUnresolved(): Promise<Report[]>;
  findAll(includeResolved?: boolean): Promise<Report[]>;
  create(report: Report): Promise<Report>;
  resolve(id: number, adminId: number): Promise<boolean>;
  findByUserId(userId: number): Promise<Report[]>;
  delete(id: number): Promise<boolean>;
}

@Injectable()
export class ReportRepository implements IReportRepository {
  constructor(
    @InjectRepository(Report)
    private readonly repo: Repository<Report>,
  ) {}

  async findById(id: number): Promise<Report | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findUnresolved(): Promise<Report[]> {
    return this.repo.find({
      where: { resolved: false },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(includeResolved: boolean = false): Promise<Report[]> {
    const where = includeResolved ? {} : { resolved: false };
    return this.repo.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(report: Report): Promise<Report> {
    const entity = this.repo.create(report);
    await this.repo.save(entity);
    return entity;
  }

  async resolve(id: number, adminId: number): Promise<boolean> {
    const result = await this.repo.update(id, {
      resolved: true,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    });
    return result.affected !== 0;
  }

  async findByUserId(userId: number): Promise<Report[]> {
    return this.repo.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return result.affected !== 0;
  }
}