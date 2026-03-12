import { defineStore } from 'pinia';
import apiClient from '@/lib/api/client';

export interface QuizListDto {
  id: number;
  title: string;
  description?: string;
  visibility: 'private' | 'public' | 'unlisted';
  createdAt: string;
  updatedAt: string;
  tags: string[];
  questionCount: number;
  userName?: string;
}

export interface QuizDto extends QuizListDto {
  userId: number;
}

export interface CreateQuizPayload {
  title: string;
  description?: string;
  visibility?: 'private' | 'public' | 'unlisted';
  tagNames?: string[];
}

export interface UpdateQuizPayload {
  title?: string;
  description?: string;
  visibility?: 'private' | 'public' | 'unlisted';
  tagNames?: string[];
}

export const useQuizStore = defineStore('quiz', {
  state: () => ({
    quizzes: [] as QuizListDto[],
    currentQuiz: null as QuizDto | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchMyQuizzes() {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuizListDto[]>('/quiz?mine=true');
        this.quizzes = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to fetch your quizzes';
      } finally {
        this.loading = false;
      }
    },

    async fetchPublicQuizzes(visibility?: string) {
      this.loading = true;
      this.error = null;
      try {
        const url = visibility ? `/quiz?visibility=${visibility}` : '/quiz';
        const response = await apiClient.get<QuizListDto[]>(url);
        this.quizzes = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to fetch public quizzes';
      } finally {
        this.loading = false;
      }
    },

    async searchQuizzes(searchTerm: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuizListDto[]>(`/quiz?search=${encodeURIComponent(searchTerm)}`);
        this.quizzes = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Search failed';
      } finally {
        this.loading = false;
      }
    },

    async fetchQuizById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuizDto>(`/quiz/${id}`);
        this.currentQuiz = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to fetch quiz';
      } finally {
        this.loading = false;
      }
    },

    async createQuiz(payload: CreateQuizPayload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<QuizDto>('/quiz', payload);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to create quiz';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async updateQuiz(id: number, payload: UpdateQuizPayload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.put<QuizDto>(`/quiz/${id}`, payload);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to update quiz';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async deleteQuiz(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/quiz/${id}`);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to delete quiz';
        return false;
      } finally {
        this.loading = false;
      }
    },

    async duplicateQuiz(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<QuizDto>(`/quiz/${id}/duplicate`);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to duplicate quiz';
        return null;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },
  },
});