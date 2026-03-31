import { defineStore } from "pinia";
import apiClient from "@/lib/api/client";
import { message } from "ant-design-vue";
import type {
  UserDto,
  QuizAdminDto,
  CommentAdminDto,
  AdminLogDto,
} from "../types/admin.types.ts";

export const useAdminStore = defineStore("admin", {
  state: () => ({
    users: [] as UserDto[],
    quizzes: [] as QuizAdminDto[],
    comments: [] as CommentAdminDto[],
    logs: [] as AdminLogDto[],
    loading: {
      users: false,
      quizzes: false,
      comments: false,
      logs: false,
    },
    error: null as string | null,
    pagination: {
      users: { page: 1, pageSize: 20, total: 0 },
      quizzes: { page: 1, pageSize: 20, total: 0 },
      comments: { page: 1, pageSize: 20, total: 0 },
      logs: { page: 1, pageSize: 20, total: 0 },
    },
  }),

  actions: {
    async banUser(userId: number) {
      try {
        await apiClient.post(`/admin/users/${userId}/ban`);
        message.success("User banned successfully");
        await this.fetchUsers(); // refresh list
      } catch (err: any) {
        message.error(err.response?.data?.message || "Ban failed");
      }
    },

    async unbanUser(userId: number) {
      try {
        await apiClient.post(`/admin/users/${userId}/unban`);
        message.success("User unbanned successfully");
        await this.fetchUsers();
      } catch (err: any) {
        message.error(err.response?.data?.message || "Unban failed");
      }
    },

    async disableQuiz(quizId: number) {
      try {
        await apiClient.post(`/admin/quizzes/${quizId}/disable`);
        message.success("Quiz disabled");
        await this.fetchQuizzes();
      } catch (err: any) {
        message.error(err.response?.data?.message || "Disable failed");
      }
    },

    async enableQuiz(quizId: number) {
      try {
        await apiClient.post(`/admin/quizzes/${quizId}/enable`);
        message.success("Quiz enabled");
        await this.fetchQuizzes();
      } catch (err: any) {
        message.error(err.response?.data?.message || "Enable failed");
      }
    },

    async deleteComment(commentId: number) {
      try {
        await apiClient.delete(`/admin/comments/${commentId}`);
        message.success("Comment deleted");
        await this.fetchComments(true);
      } catch (err: any) {
        message.error(err.response?.data?.message || "Delete failed");
      }
    },

    async restoreComment(commentId: number) {
      try {
        await apiClient.post(`/admin/comments/${commentId}/restore`);
        message.success("Comment restored");
        await this.fetchComments(true);
      } catch (err: any) {
        message.error(err.response?.data?.message || "Restore failed");
      }
    },

    async fetchUsers(search?: string, page = 1, pageSize = 20) {
      this.loading.users = true;
      this.error = null;
      try {
        const response = await apiClient.get("/admin/users", {
          params: { search, page, pageSize },
        });
        this.users = response.data.items;
        this.pagination.users = {
          page: response.data.page,
          pageSize: response.data.pageSize,
          total: response.data.total,
        };
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch users";
        message.error(this.error);
      } finally {
        this.loading.users = false;
      }
    },

    async fetchQuizzes(search?: string, page = 1, pageSize = 20) {
      this.loading.quizzes = true;
      try {
        const response = await apiClient.get("/admin/quizzes", {
          params: { search, page, pageSize },
        });
        this.quizzes = response.data.items;
        this.pagination.quizzes = {
          page: response.data.page,
          pageSize: response.data.pageSize,
          total: response.data.total,
        };
      } catch (err: any) {
        message.error("Failed to fetch quizzes");
      } finally {
        this.loading.quizzes = false;
      }
    },

    async fetchComments(
      includeDeleted = false,
      search?: string,
      page = 1,
      pageSize = 20,
    ) {
      this.loading.comments = true;
      try {
        const response = await apiClient.get("/admin/comments", {
          params: { includeDeleted, search, page, pageSize },
        });
        this.comments = response.data.items;
        this.pagination.comments = {
          page: response.data.page,
          pageSize: response.data.pageSize,
          total: response.data.total,
        };
      } catch (err: any) {
        message.error("Failed to fetch comments");
      } finally {
        this.loading.comments = false;
      }
    },

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
      this.loading.logs = true;
      try {
        const response = await apiClient.get("/admin/logs", {
          params: { ...params, page, pageSize },
        });
        this.logs = response.data.items;
        this.pagination.logs = {
          page: response.data.page,
          pageSize: response.data.pageSize,
          total: response.data.total,
        };
      } catch (err: any) {
        message.error("Failed to fetch logs");
      } finally {
        this.loading.logs = false;
      }
    },
  },
});
