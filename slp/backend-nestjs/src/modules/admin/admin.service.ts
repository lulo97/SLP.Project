import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { UserRepository } from "../user/user.repository";
import { QuizRepository } from "../quiz/quiz.repository";
import { AdminLogRepository } from "./admin-log.repository";
import { UserDto } from "./dto/user.dto";
import { QuizAdminDto } from "./dto/quiz-admin.dto";
import { CommentAdminDto } from "./dto/comment-admin.dto";
import { AdminLogDto } from "./dto/admin-log.dto";
import { SessionRepository } from "../session/session.repository";
import { CommentRepository } from "../comment/comment.repository";

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly quizRepo: QuizRepository,
    private readonly commentRepo: CommentRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly logRepo: AdminLogRepository,
  ) {}

  // Users
  async getAllUsers(): Promise<UserDto[]> {
    const users = await this.userRepo.getAll(); // changed from findAll()
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      emailConfirmed: u.emailConfirmed,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    }));
  }

  async getAllQuizzes(): Promise<QuizAdminDto[]> {
    const quizzes = await this.quizRepo.getAllForAdmin(); // changed from findAllWithUser()
    return quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      userId: q.userId,
      username: q.user?.username || "deleted",
      visibility: q.visibility,
      disabled: q.disabled,
      createdAt: q.createdAt,
    }));
  }

  async disableQuiz(adminId: number, quizId: number): Promise<void> {
    const quiz = await this.quizRepo.getById(quizId, true); // changed from findById()
    if (!quiz) throw new NotFoundException("Quiz not found");

    quiz.disabled = true;
    await this.quizRepo.update(quiz);

    await this.logRepo.log(adminId, "disable_quiz", "quiz", quizId);
  }

  async enableQuiz(adminId: number, quizId: number): Promise<void> {
    const quiz = await this.quizRepo.getById(quizId, true);
    if (!quiz) throw new NotFoundException("Quiz not found");

    quiz.disabled = false;
    await this.quizRepo.update(quiz);

    await this.logRepo.log(adminId, "enable_quiz", "quiz", quizId);
  }

  async banUser(adminId: number, userId: number): Promise<void> {
    const user = await this.userRepo.getById(userId); // changed from findById()
    if (!user) throw new NotFoundException("User not found");
    if (user.role === "admin")
      throw new BadRequestException("Cannot ban an admin");

    user.status = "banned";
    await this.userRepo.update(user);

    // Revoke all sessions
    await this.sessionRepo.revokeAllForUser(userId);

    await this.logRepo.log(adminId, "ban_user", "user", userId);
  }

  async unbanUser(adminId: number, userId: number): Promise<void> {
    const user = await this.userRepo.getById(userId);
    if (!user) throw new NotFoundException("User not found");

    user.status = "active";
    await this.userRepo.update(user);

    await this.logRepo.log(adminId, "unban_user", "user", userId);
  }

  async getAllComments(
    includeDeleted: boolean = false,
  ): Promise<CommentAdminDto[]> {
    const comments = await this.commentRepo.findAllWithUser(includeDeleted);
    return comments.map((c) => ({
      id: c.id,
      userId: c.userId,
      username: c.user?.username || "deleted",
      content: c.content,
      targetType: c.targetType,
      targetId: c.targetId,
      createdAt: c.createdAt,
      deletedAt: c.deletedAt ?? undefined,
    }));
  }

  async deleteComment(adminId: number, commentId: number): Promise<void> {
    const success = await this.commentRepo.softDelete(commentId);
    if (!success) throw new NotFoundException("Comment not found");

    await this.logRepo.log(adminId, "delete_comment", "comment", commentId);
  }

  async restoreComment(adminId: number, commentId: number): Promise<void> {
    const success = await this.commentRepo.restore(commentId);
    if (!success) throw new NotFoundException("Comment not found");

    await this.logRepo.log(adminId, "restore_comment", "comment", commentId);
  }

  // Logs
  async getRecentLogs(limit: number = 100): Promise<AdminLogDto[]> {
    const logs = await this.logRepo.getRecent(limit);
    return logs.map((l) => ({
      id: l.id,
      adminId: l.adminId,
      adminName: l.admin?.username || "unknown",
      action: l.action,
      targetType: l.targetType ?? undefined,
      targetId: l.targetId ?? undefined,
      details: l.details,
      createdAt: l.createdAt,
    }));
  }
}
