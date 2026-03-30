import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { SessionGuard } from "../session/session.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserDto } from "./dto/user.dto";
import { QuizAdminDto } from "./dto/quiz-admin.dto";
import { CommentAdminDto } from "./dto/comment-admin.dto";
import { AdminLogDto } from "./dto/admin-log.dto";
import { AdminLogFilterDto } from "./dto/admin-log-filter.dto";

@Controller("api/admin")
@UseGuards(SessionGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Users
  @Get("users")
  async getUsers(@Query("search") search?: string): Promise<UserDto[]> {
    return this.adminService.getAllUsers(search);
  }

  @Post("users/:id/ban")
  @HttpCode(HttpStatus.OK)
  async banUser(@Request() req, @Param("id") id: string): Promise<void> {
    await this.adminService.banUser(req.user.id, parseInt(id, 10));
  }

  @Post("users/:id/unban")
  @HttpCode(HttpStatus.OK)
  async unbanUser(@Request() req, @Param("id") id: string): Promise<void> {
    await this.adminService.unbanUser(req.user.id, parseInt(id, 10));
  }

  // Quizzes
  @Get("quizzes")
  async getQuizzes(@Query("search") search?: string): Promise<QuizAdminDto[]> {
    return this.adminService.getAllQuizzes(search);
  }

  @Post("quizzes/:id/disable")
  @HttpCode(HttpStatus.OK)
  async disableQuiz(@Request() req, @Param("id") id: string): Promise<void> {
    await this.adminService.disableQuiz(req.user.id, parseInt(id, 10));
  }

  @Post("quizzes/:id/enable")
  @HttpCode(HttpStatus.OK)
  async enableQuiz(@Request() req, @Param("id") id: string): Promise<void> {
    await this.adminService.enableQuiz(req.user.id, parseInt(id, 10));
  }

  // Comments
  @Get("comments")
  async getComments(
    @Query("includeDeleted") includeDeleted: string = "false",
    @Query("search") search?: string,
  ): Promise<CommentAdminDto[]> {
    return this.adminService.getAllComments(includeDeleted === "true", search);
  }

  @Delete("comments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Request() req, @Param("id") id: string): Promise<void> {
    await this.adminService.deleteComment(req.user.id, parseInt(id, 10));
  }

  @Post("comments/:id/restore")
  @HttpCode(HttpStatus.OK)
  async restoreComment(@Request() req, @Param("id") id: string): Promise<void> {
    await this.adminService.restoreComment(req.user.id, parseInt(id, 10));
  }

  // Logs
  @Get("logs")
  async getLogs(@Query() filter: AdminLogFilterDto): Promise<AdminLogDto[]> {
    if (!filter.count) filter.count = 100;
    return this.adminService.getRecentLogs(filter);
  }
}
