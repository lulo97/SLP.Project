import { Inject, Injectable } from "@nestjs/common";
import type { IReportRepository } from "./report.repository";
import { AdminLogRepository } from "../admin/admin-log.repository";
import { Report } from "./report.entity";
import { ReportDto } from "./dto/report.dto";
import { CreateReportRequest } from "./dto/create-report-request.dto";

export interface IReportService {
  getById(id: number): Promise<ReportDto | null>;
  getUnresolved(): Promise<ReportDto[]>;
  create(userId: number, request: CreateReportRequest): Promise<ReportDto>;
  resolve(adminId: number, reportId: number): Promise<boolean>;
  getByUserId(userId: number): Promise<ReportDto[]>;
  delete(userId: number, reportId: number): Promise<boolean>;
}

@Injectable()
export class ReportService implements IReportService {
  constructor(
    @Inject("IReportRepository") private readonly reportRepo: IReportRepository,
    private readonly adminLogRepo: AdminLogRepository,
  ) {}

  async getById(id: number): Promise<ReportDto | null> {
    const report = await this.reportRepo.findById(id);
    return report ? this.mapToDto(report) : null;
  }

  async getUnresolved(): Promise<ReportDto[]> {
    const reports = await this.reportRepo.findUnresolved();
    return reports.map((r) => this.mapToDto(r));
  }

  async create(
    userId: number,
    request: CreateReportRequest,
  ): Promise<ReportDto> {
    const report = new Report();
    report.userId = userId;
    report.targetType = request.targetType;
    report.targetId = request.targetId;
    report.reason = request.reason;
    report.attemptId = request.attemptId ?? null;
    report.createdAt = new Date();

    const created = await this.reportRepo.create(report);
    return this.mapToDto(created);
  }

  async resolve(adminId: number, reportId: number): Promise<boolean> {
    const success = await this.reportRepo.resolve(reportId, adminId);
    if (success) {
      await this.adminLogRepo.log({
        adminId,
        action: "resolve_report",
        targetType: "report",
        targetId: reportId,
      });
    }
    return success;
  }

  async getByUserId(userId: number): Promise<ReportDto[]> {
    const reports = await this.reportRepo.findByUserId(userId);
    return reports.map((r) => this.mapToDto(r));
  }

  async delete(userId: number, reportId: number): Promise<boolean> {
    const report = await this.reportRepo.findById(reportId);
    if (!report) return false;
    if (report.userId !== userId) return false;
    if (report.resolved) return false;

    return await this.reportRepo.delete(reportId);
  }

  private mapToDto(report: Report): ReportDto {
    return {
      id: report.id,
      userId: report.userId,
      username: report.user?.username ?? "unknown",
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      resolved: report.resolved,
      resolvedAt: report.resolvedAt ?? undefined,
      createdAt: report.createdAt,
      attemptId: report.attemptId ?? undefined,
    };
  }
}
