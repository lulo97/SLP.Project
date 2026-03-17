import { defineStore } from 'pinia';
import apiClient from '@/lib/api/client';

export interface CommentDto {
  id: number;
  userId: number;
  username: string;
  parentId: number | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
  replies: CommentDto[];
}

export interface CreateCommentRequest {
  parentId?: number | null;
  targetType: string;
  targetId: number;
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export const useCommentStore = defineStore('comment', {
  state: () => ({
    comments: [] as CommentDto[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchComments(targetType: string, targetId: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<CommentDto[]>('/comments', {
          params: { targetType, targetId },
        });
        this.comments = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to load comments';
      } finally {
        this.loading = false;
      }
    },
    async createComment(request: CreateCommentRequest) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<CommentDto>('/comments', request);
        // Refetch to get updated list (including new comment)
        await this.fetchComments(request.targetType, request.targetId);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to create comment';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateComment(commentId: number, request: UpdateCommentRequest, targetType: string, targetId: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.put<CommentDto>(`/comments/${commentId}`, request);
        await this.fetchComments(targetType, targetId);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to update comment';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteComment(commentId: number, targetType: string, targetId: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/comments/${commentId}`);
        await this.fetchComments(targetType, targetId);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to delete comment';
        return false;
      } finally {
        this.loading = false;
      }
    },
  },
});