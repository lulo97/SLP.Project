import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { CommentService } from "./comment.service";
import { CreateCommentDto, UpdateCommentDto } from "./comment.dto";
import { SessionGuard } from "../session/session.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Request } from "express";

interface RequestWithUser extends Request {
  user: { id: number; role?: string };
}

@Controller("api/comments")
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async getForTarget(
    @Query("targetType") targetType: string,
    @Query("targetId") targetId: string,
  ) {
    return this.commentService.getForTarget(targetType, parseInt(targetId, 10));
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    const comment = await this.commentService.getById(parseInt(id, 10));
    if (!comment) throw new NotFoundException();
    return comment;
  }

  @Post()
  @UseGuards(SessionGuard)
  async create(@Req() req: RequestWithUser, @Body() dto: CreateCommentDto) {
    const userId = req.user.id;
    return this.commentService.create(userId, dto);
  }

  @Put(":id")
  @UseGuards(SessionGuard)
  async update(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const userId = req.user.id;
    const comment = await this.commentService.update(
      userId,
      parseInt(id, 10),
      dto,
    );
    if (!comment) throw new NotFoundException();
    return comment;
  }

  @Delete(":id")
  @UseGuards(SessionGuard)
  async delete(@Req() req: RequestWithUser, @Param("id") id: string) {
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";
    const deleted = await this.commentService.delete(
      userId,
      parseInt(id, 10),
      isAdmin,
    );
    if (!deleted) throw new NotFoundException();
    return { success: true };
  }

  @Post(":id/restore")
  @UseGuards(SessionGuard)
  async restore(@Req() req: RequestWithUser, @Param("id") id: string) {
    const isAdmin = req.user.role === "admin";
    if (!isAdmin) throw new ForbiddenException("Admin only");
    const restored = await this.commentService.restore(
      req.user.id,
      parseInt(id, 10),
    );
    if (!restored) throw new NotFoundException();
    return { success: true };
  }

  @Get(":id/history")
  @UseGuards(SessionGuard, RolesGuard)
  @Roles("admin")
  async getHistory(@Param("id") id: string) {
    const history = await this.commentService.getHistory(parseInt(id, 10));
    if (!history) throw new NotFoundException();
    return history;
  }
}
