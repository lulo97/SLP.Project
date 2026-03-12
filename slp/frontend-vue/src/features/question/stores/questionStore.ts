import { defineStore } from 'pinia';
import apiClient from '@/lib/api/client';

export interface QuestionDto {
  id: number;
  userId: number;
  title: string;
  description?: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'ordering' | 'matching' | 'flashcard';
  // For multiple choice
  options?: string[];
  // For true_false (true/false answer stored as string 'true' or 'false')
  // For fill_blank (answer stored as string)
  answer?: string;
  explanation?: string;
  // For ordering
  orderingItems?: string[];          // items in correct order
  // For matching
  matchingPairs?: { left: string; right: string }[];
  // For flashcard
  front?: string;
  back?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CreateQuestionPayload = Omit<QuestionDto, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

// All fields optional for updates
export type UpdateQuestionPayload = Partial<Omit<QuestionDto, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

export const useQuestionStore = defineStore('question', {
  state: () => ({
    question: [] as QuestionDto[],
    currentQuestion: null as QuestionDto | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchQuestions(params?: { type?: string; tag?: string; search?: string }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuestionDto[]>('/question', { params });
        this.question = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to fetch question';
      } finally {
        this.loading = false;
      }
    },

    async fetchQuestionById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuestionDto>(`/question/${id}`);
        this.currentQuestion = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to fetch question';
      } finally {
        this.loading = false;
      }
    },

    async createQuestion(payload: CreateQuestionPayload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<QuestionDto>('/question', payload);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to create question';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async updateQuestion(id: number, payload: UpdateQuestionPayload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.put<QuestionDto>(`/question/${id}`, payload);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to update question';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async deleteQuestion(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/question/${id}`);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Failed to delete question';
        return false;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },
  },
});