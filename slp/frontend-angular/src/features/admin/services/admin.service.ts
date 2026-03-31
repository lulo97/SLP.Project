import { Injectable, signal, inject } from "@angular/core";
import { ApiClientService } from "../../../services/api-client.service";
import { NzMessageService } from "ng-zorro-antd/message";
import { HttpParams } from "@angular/common/http";
import {
  UserDto,
  QuizAdminDto,
  CommentAdminDto,
  AdminLogDto,
} from "../types/admin.types";
import { PaginatedResult } from "../../../utils/pagination.utils";

@Injectable({ providedIn: "root" })
export class AdminService {
  private api = inject(ApiClientService);
  private message = inject(NzMessageService);

  // Helper to clean params
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

  // Pagination signals
  usersPagination = signal({ page: 1, pageSize: 20, total: 0 });
  quizzesPagination = signal({ page: 1, pageSize: 20, total: 0 });
  commentsPagination = signal({ page: 1, pageSize: 20, total: 0 });
  logsPagination = signal({ page: 1, pageSize: 20, total: 0 });

  loading = signal({
    users: false,
    quizzes: false,
    comments: false,
    logs: false,
  });

  // Users
  async fetchUsers(search?: string, page = 1, pageSize = 20) {
    this.loading.update((l) => ({ ...l, users: true }));
    try {
      const params = this.cleanParams({ search, page, pageSize });
      const res = await this.api
        .get<PaginatedResult<UserDto>>("/admin/users", { params })
        .toPromise();
      if (res) {
        this.users.set(res.items);
        this.usersPagination.set({
          page: res.page,
          pageSize: res.pageSize,
          total: res.total,
        });
      }
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
      const { page, pageSize } = this.usersPagination();
      this.fetchUsers(undefined, page, pageSize);
    } catch {
      this.message.error("Ban failed");
    }
  }

  async unbanUser(userId: number) {
    try {
      await this.api.post(`/admin/users/${userId}/unban`, {}).toPromise();
      this.message.success("User unbanned successfully");
      const { page, pageSize } = this.usersPagination();
      this.fetchUsers(undefined, page, pageSize);
    } catch {
      this.message.error("Unban failed");
    }
  }

  // Quizzes
  async fetchQuizzes(search?: string, page = 1, pageSize = 20) {
    this.loading.update((l) => ({ ...l, quizzes: true }));
    try {
      const params = this.cleanParams({ search, page, pageSize });
      const res = await this.api
        .get<PaginatedResult<QuizAdminDto>>("/admin/quizzes", { params })
        .toPromise();
      if (res) {
        this.quizzes.set(res.items);
        this.quizzesPagination.set({
          page: res.page,
          pageSize: res.pageSize,
          total: res.total,
        });
      }
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
      const { page, pageSize } = this.quizzesPagination();
      this.fetchQuizzes(undefined, page, pageSize);
    } catch {
      this.message.error("Disable failed");
    }
  }

  async enableQuiz(quizId: number) {
    try {
      await this.api.post(`/admin/quizzes/${quizId}/enable`, {}).toPromise();
      this.message.success("Quiz enabled");
      const { page, pageSize } = this.quizzesPagination();
      this.fetchQuizzes(undefined, page, pageSize);
    } catch {
      this.message.error("Enable failed");
    }
  }

  // Comments
  async fetchComments(
    includeDeleted = false,
    search?: string,
    page = 1,
    pageSize = 20,
  ) {
    this.loading.update((l) => ({ ...l, comments: true }));
    try {
      const params = this.cleanParams({
        includeDeleted,
        search,
        page,
        pageSize,
      });
      const res = await this.api
        .get<PaginatedResult<CommentAdminDto>>("/admin/comments", { params })
        .toPromise();
      if (res) {
        this.comments.set(res.items);
        this.commentsPagination.set({
          page: res.page,
          pageSize: res.pageSize,
          total: res.total,
        });
      }
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
      const { includeDeleted, search, page, pageSize } =
        this.getCommentsState();
      this.fetchComments(includeDeleted, search, page, pageSize);
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
      const { includeDeleted, search, page, pageSize } =
        this.getCommentsState();
      this.fetchComments(includeDeleted, search, page, pageSize);
    } catch {
      this.message.error("Restore failed");
    }
  }

  // Helper to preserve comments filter state (stored in component, but we can keep last used values)
  private lastCommentsParams = { includeDeleted: false, search: "" };
  private getCommentsState() {
    const { page, pageSize } = this.commentsPagination();
    return { ...this.lastCommentsParams, page, pageSize };
  }
  setCommentsParams(includeDeleted: boolean, search: string) {
    this.lastCommentsParams = { includeDeleted, search };
  }

  // Logs
  async fetchLogs(
    params?: {
      action?: string;
      targetType?: string;
      from?: string;
      to?: string;
      search?: string;
    },
    page = 1,
    pageSize = 20,
  ) {
    this.loading.update((l) => ({ ...l, logs: true }));
    try {
      const queryParams = this.cleanParams({ ...params, page, pageSize });
      const res = await this.api
        .get<
          PaginatedResult<AdminLogDto>
        >("/admin/logs", { params: queryParams })
        .toPromise();
      if (res) {
        this.logs.set(res.items);
        this.logsPagination.set({
          page: res.page,
          pageSize: res.pageSize,
          total: res.total,
        });
      }
    } catch {
      this.message.error("Failed to fetch logs");
    } finally {
      this.loading.update((l) => ({ ...l, logs: false }));
    }
  }
}
