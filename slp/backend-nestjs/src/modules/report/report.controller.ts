import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  NotFoundException,
  ConflictException,
  Inject,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SessionGuard } from "../session/session.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../../common/decorators/user.decorator";
import type { IReportService } from "./report.service";
import { CreateReportRequest } from "./dto/create-report-request.dto";
import { ReportDto } from "./dto/report.dto";

@ApiTags("reports")
@Controller("api/reports")
export class ReportController {
  constructor(
    @Inject("IReportService") private readonly reportService: IReportService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, type: [ReportDto] })
  async getUnresolved(): Promise<ReportDto[]> {
    return this.reportService.getUnresolved();
  }

  @Get(":id")
  @UseGuards(SessionGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, type: ReportDto })
  @ApiResponse({ status: 404, description: "Report not found" })
  async getById(@Param("id") id: number): Promise<ReportDto> {
    const report = await this.reportService.getById(id);
    if (!report) {
      throw new NotFoundException("Report not found");
    }
    return report;
  }

  @Post()
  @UseGuards(SessionGuard)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 201, type: ReportDto })
  async create(
    @User() user: any,
    @Body() request: CreateReportRequest,
  ): Promise<ReportDto> {
    const userId = user.id;
    const report = await this.reportService.create(userId, request);
    return report;
  }

  @Post(":id/resolve")
  @UseGuards(SessionGuard, RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, description: "Report resolved" })
  @ApiResponse({ status: 404, description: "Report not found" })
  async resolve(@Param("id") id: number, @User() user: any): Promise<void> {
    const adminId = user.id;
    const success = await this.reportService.resolve(adminId, id);
    if (!success) {
      throw new NotFoundException("Report not found or already resolved");
    }
  }

  @Get("mine")
  @UseGuards(SessionGuard)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 200, type: [ReportDto] })
  async getMyReports(@User() user: any): Promise<ReportDto[]> {
    const userId = user.id;
    return this.reportService.getByUserId(userId);
  }

  @Delete("mine/:id")
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth("session-token")
  @ApiResponse({ status: 204, description: "Report deleted" })
  @ApiResponse({ status: 404, description: "Report not found or not owned" })
  @ApiResponse({ status: 409, description: "Cannot delete resolved report" })
  async deleteMyReport(
    @Param("id") id: number,
    @User() user: any,
  ): Promise<void> {
    const userId = user.id;

    // First fetch the report to check resolved status (optional, can be done in service)
    const report = await this.reportService.getById(id);
    if (!report || report.userId !== userId) {
      throw new NotFoundException("Report not found");
    }
    if (report.resolved) {
      throw new ConflictException("Cannot delete a resolved report");
    }

    const success = await this.reportService.delete(userId, id);
    if (!success) {
      throw new NotFoundException("Report not found");
    }
  }
}
