import { Injectable, signal, inject } from "@angular/core";
import { ApiClientService } from "../../../services/api-client.service";
import { NzMessageService } from "ng-zorro-antd/message";
import {
  UserDto,
  QuizAdminDto,
  CommentAdminDto,
  AdminLogDto,
} from "../types/admin.types";

@Injectable({ providedIn: "root" })
export class AdminService {
  private api = inject(ApiClientService);
  private message = inject(NzMessageService);

  // Helper to remove undefined keys so TypeScript is happy
  private cleanParams(params: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null),
    );
  }

  // State signals
  users = signal<UserDto[]>([]);
  quizzes = signal<QuizAdminDto[]>([]);
  comments = signal<CommentAdminDto[]>([]);
  logs = signal<AdminLogDto[]>([]);

  loading = signal({
    users: false,
    quizzes: false,
    comments: false,
    logs: false,
  });

  // Users
  async fetchUsers(search?: string) {
    this.loading.update((l) => ({ ...l, users: true }));
    try {
      const params = this.cleanParams({ search });
      const res = await this.api
        .get<UserDto[]>("/admin/users", { params })
        .toPromise();
      this.users.set(res || []);
    } catch (err) {
      this.message.error("Failed to fetch users");
    } finally {
      this.loading.update((l) => ({ ...l, users: false }));
    }
  }

  async banUser(userId: number) {
    try {
      await this.api.post(`/admin/users/${userId}/ban`, {}).toPromise();
      this.message.success("User banned successfully");
      this.fetchUsers();
    } catch {
      this.message.error("Ban failed");
    }
  }

  async unbanUser(userId: number) {
    try {
      await this.api.post(`/admin/users/${userId}/unban`, {}).toPromise();
      this.message.success("User unbanned successfully");
      this.fetchUsers();
    } catch {
      this.message.error("Unban failed");
    }
  }

  // Quizzes
  async fetchQuizzes(search?: string) {
    this.loading.update((l) => ({ ...l, quizzes: true }));
    try {
      const params = this.cleanParams({ search });
      const res = await this.api
        .get<QuizAdminDto[]>("/admin/quizzes", { params })
        .toPromise();
      this.quizzes.set(res || []);
    } catch {
      this.message.error("Failed to fetch quizzes");
    } finally {
      this.loading.update((l) => ({ ...l, quizzes: false }));
    }
  }

  async disableQuiz(quizId: number) {
    try {
      await this.api.post(`/admin/quizzes/${quizId}/disable`, {}).toPromise();
      this.message.success("Quiz disabled");
      this.fetchQuizzes();
    } catch {
      this.message.error("Disable failed");
    }
  }

  async enableQuiz(quizId: number) {
    try {
      await this.api.post(`/admin/quizzes/${quizId}/enable`, {}).toPromise();
      this.message.success("Quiz enabled");
      this.fetchQuizzes();
    } catch {
      this.message.error("Enable failed");
    }
  }

  // Comments
  async fetchComments(includeDeleted = false, search?: string) {
    this.loading.update((l) => ({ ...l, comments: true }));
    try {
      const params = this.cleanParams({ includeDeleted, search });
      const res = await this.api
        .get<CommentAdminDto[]>("/admin/comments", { params })
        .toPromise();
      this.comments.set(res || []);
    } catch {
      this.message.error("Failed to fetch comments");
    } finally {
      this.loading.update((l) => ({ ...l, comments: false }));
    }
  }

  async deleteComment(commentId: number) {
    try {
      await this.api.delete(`/admin/comments/${commentId}`).toPromise();
      this.message.success("Comment deleted");
      this.fetchComments(true);
    } catch {
      this.message.error("Delete failed");
    }
  }

  async restoreComment(commentId: number) {
    try {
      await this.api
        .post(`/admin/comments/${commentId}/restore`, {})
        .toPromise();
      this.message.success("Comment restored");
      this.fetchComments(true);
    } catch {
      this.message.error("Restore failed");
    }
  }

  // Logs
  async fetchLogs(params?: {
    action?: string;
    targetType?: string;
    from?: string;
    to?: string;
    search?: string;
    count?: number;
  }) {
    this.loading.update((l) => ({ ...l, logs: true }));
    try {
      // FIX: Spread and clean the params object
      const cleaned = this.cleanParams(params || {});
      const res = await this.api
        .get<AdminLogDto[]>("/admin/logs", { params: cleaned })
        .toPromise();
      this.logs.set(res || []);
    } catch {
      this.message.error("Failed to fetch logs");
    } finally {
      this.loading.update((l) => ({ ...l, logs: false }));
    }
  }
}
