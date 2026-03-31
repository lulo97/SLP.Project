import { defineStore } from "pinia";
import apiClient from "@/lib/api/client";

export interface QuestionDto {
  id: number;
  userId: number;
  type: string;
  content: string;
  explanation?: string;
  metadataJson?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  userName?: string;
}

export interface QuestionListDto {
  id: number;
  type: string;
  content: string;
  explanation?: string;
  metadataJson?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  userName?: string;
}

export interface CreateQuestionPayload {
  type: string;
  content: string;
  explanation?: string;
  metadataJson?: string;
  tagNames?: string[];
}

export type UpdateQuestionPayload = Partial<CreateQuestionPayload>;

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const useQuestionStore = defineStore("question", {
  state: () => ({
    questions: [] as QuestionListDto[],
    currentQuestion: null as QuestionDto | null,
    loading: false,
    error: null as string | null,
    currentPage: 1,
    pageSize: 10,
    total: 0,
  }),

  actions: {
    async fetchQuestions(params?: { type?: string; tag?: string; search?: string }, page = 1, pageSize = 10) {
      this.loading = true;
      this.error = null;
      this.currentPage = page;
      this.pageSize = pageSize;
      try {
        const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (params?.type) query.set("type", params.type);
        if (params?.tag) query.set("tags", params.tag);
        if (params?.search) query.set("search", params.search);

        const response = await apiClient.get<PaginatedResult<QuestionListDto>>(`/question?${query.toString()}`);
        const data = response.data;
        this.questions = data.items;
        this.total = data.total;
        this.currentPage = data.page;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch questions";
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
        this.error = err.response?.data?.message || "Failed to fetch question";
      } finally {
        this.loading = false;
      }
    },

    async createQuestion(payload: CreateQuestionPayload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<QuestionDto>("/question", payload);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to create question";
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
        this.error = err.response?.data?.message || "Failed to update question";
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
        this.error = err.response?.data?.message || "Failed to delete question";
        return false;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },

    async fetchQuestionsByQuiz(quizId: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuestionDto[]>(`/quiz/${quizId}/questions`);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch quiz questions";
        return [];
      } finally {
        this.loading = false;
      }
    },
  },
});