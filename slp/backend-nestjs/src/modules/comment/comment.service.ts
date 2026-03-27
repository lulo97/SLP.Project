import { Injectable, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Comment } from "./comment.entity";
import { CommentHistory } from "./comment-history.entity";
import {
  CreateCommentDto,
  UpdateCommentDto,
  CommentDto,
  CommentHistoryDto,
} from "./comment.dto";
import { AdminLogRepository } from "../admin/admin-log.repository";

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
    @InjectRepository(CommentHistory)
    private historyRepo: Repository<CommentHistory>,
    private adminLogRepo: AdminLogRepository,
  ) {}

  async getForTarget(
    targetType: string,
    targetId: number,
  ): Promise<CommentDto[]> {
    const comments = await this.commentRepo.find({
      where: {
        targetType,
        targetId,
        parentId: IsNull(),
        deletedAt: IsNull(),
      },
      relations: ["user", "replies", "replies.user"],
      order: { createdAt: "DESC" },
    });

    return comments.map((c) => this.toDto(c));
  }

  async getById(id: number): Promise<CommentDto | null> {
    const comment = await this.commentRepo.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
      relations: ["user", "replies", "replies.user"],
    });

    return comment ? this.toDto(comment) : null;
  }

  async create(userId: number, dto: CreateCommentDto): Promise<CommentDto> {
    const comment = this.commentRepo.create({
      userId,
      parentId: dto.parentId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      content: dto.content,
    });

    const saved = await this.commentRepo.save(comment);

    const history = this.historyRepo.create({
      commentId: saved.id,
      content: saved.content,
      editedAt: saved.createdAt ?? new Date(),
    });

    await this.historyRepo.save(history);
    return this.toDto(saved);
  }

  async update(
    userId: number,
    commentId: number,
    dto: UpdateCommentDto,
  ): Promise<CommentDto | null> {
    const comment = await this.commentRepo.findOne({
      where: {
        id: commentId,
        deletedAt: IsNull(),
      },
    });

    if (!comment) return null;
    if (comment.userId !== userId) throw new ForbiddenException("Not owner");

    comment.content = dto.content;
    comment.editedAt = new Date();

    const updated = await this.commentRepo.save(comment);

    const history = this.historyRepo.create({
      commentId: updated.id,
      content: updated.content,
      editedAt: updated.editedAt ?? new Date(),
    });

    await this.historyRepo.save(history);
    return this.toDto(updated);
  }

  async delete(
    userId: number,
    commentId: number,
    isAdmin: boolean,
  ): Promise<boolean> {
    const comment = await this.commentRepo.findOne({
      where: {
        id: commentId,
        deletedAt: IsNull(),
      },
    });

    if (!comment) return false;
    if (!isAdmin && comment.userId !== userId) {
      throw new ForbiddenException("Not allowed");
    }

    comment.deletedAt = new Date();
    await this.commentRepo.save(comment);
    return true;
  }

  async restore(adminId: number, commentId: number): Promise<boolean> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      withDeleted: true,
    });

    if (!comment || !comment.deletedAt) return false;

    comment.deletedAt = null;
    await this.commentRepo.save(comment);

    await this.adminLogRepo.log({
      adminId,
      action: "restore_comment",
      targetType: "comment",
      targetId: commentId,
      details: {},
    });

    return true;
  }

  async getHistory(commentId: number): Promise<CommentHistoryDto[] | null> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
    });

    if (!comment) return null;

    const history = await this.historyRepo.find({
      where: { commentId },
      order: { editedAt: "ASC" },
    });

    return history.map((h) => ({
      id: h.id,
      commentId: h.commentId,
      content: h.content,
      editedAt: h.editedAt,
    }));
  }

  private toDto(comment: Comment): CommentDto {
    return {
      id: comment.id,
      userId: comment.userId,
      username: comment.user?.username || "deleted",
      parentId: comment.parentId,
      content: comment.content,
      createdAt: comment.createdAt,
      editedAt: comment.editedAt,
      replies: comment.replies?.map((r) => this.toDto(r)) || [],
    };
  }
}
