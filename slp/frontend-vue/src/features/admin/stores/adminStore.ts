import { defineStore } from 'pinia';
import apiClient from '@/lib/api/client';
import { message } from 'ant-design-vue';
import type { UserDto, QuizAdminDto, CommentAdminDto, AdminLogDto } from '../types/admin.types.ts';

export const useAdminStore = defineStore('admin', {
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
  }),

  actions: {
    // --- Users ---
    async fetchUsers() {
      this.loading.users = true;
      this.error = null;
      try {
        const response = await apiClient.get<UserDto[]>('/admin/users');
        this.users = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to fetch users';
        message.error(this.error);
      } finally {
        this.loading.users = false;
      }
    },

    async banUser(userId: number) {
      try {
        await apiClient.post(`/admin/users/${userId}/ban`);
        message.success('User banned successfully');
        await this.fetchUsers(); // refresh list
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Ban failed');
      }
    },

    async unbanUser(userId: number) {
      try {
        await apiClient.post(`/admin/users/${userId}/unban`);
        message.success('User unbanned successfully');
        await this.fetchUsers();
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Unban failed');
      }
    },

    // --- Quizzes ---
    async fetchQuizzes() {
      this.loading.quizzes = true;
      try {
        const response = await apiClient.get<QuizAdminDto[]>('/admin/quizzes');
        this.quizzes = response.data;
      } catch (err: any) {
        message.error('Failed to fetch quizzes');
      } finally {
        this.loading.quizzes = false;
      }
    },

    async disableQuiz(quizId: number) {
      try {
        await apiClient.post(`/admin/quizzes/${quizId}/disable`);
        message.success('Quiz disabled');
        await this.fetchQuizzes();
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Disable failed');
      }
    },

    async enableQuiz(quizId: number) {
      try {
        await apiClient.post(`/admin/quizzes/${quizId}/enable`);
        message.success('Quiz enabled');
        await this.fetchQuizzes();
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Enable failed');
      }
    },

    // --- Comments ---
    async fetchComments(includeDeleted = false) {
      this.loading.comments = true;
      try {
        const response = await apiClient.get<CommentAdminDto[]>('/admin/comments', {
          params: { includeDeleted },
        });
        this.comments = response.data;
      } catch (err: any) {
        message.error('Failed to fetch comments');
      } finally {
        this.loading.comments = false;
      }
    },

    async deleteComment(commentId: number) {
      try {
        await apiClient.delete(`/admin/comments/${commentId}`);
        message.success('Comment deleted');
        await this.fetchComments(true);
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Delete failed');
      }
    },

    async restoreComment(commentId: number) {
      try {
        await apiClient.post(`/admin/comments/${commentId}/restore`);
        message.success('Comment restored');
        await this.fetchComments(true);
      } catch (err: any) {
        message.error(err.response?.data?.message || 'Restore failed');
      }
    },

    // --- Logs ---
    async fetchLogs(count = 100) {
      this.loading.logs = true;
      try {
        const response = await apiClient.get<AdminLogDto[]>('/admin/logs', {
          params: { count },
        });
        this.logs = response.data;
      } catch (err: any) {
        message.error('Failed to fetch logs');
      } finally {
        this.loading.logs = false;
      }
    },
  },
});