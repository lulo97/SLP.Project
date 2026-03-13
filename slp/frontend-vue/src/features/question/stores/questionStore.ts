import { defineStore } from "pinia";
import apiClient from "@/lib/api/client";

// Match backend's QuestionDto
export interface QuestionDto {
  id: number;
  userId: number;
  type: string;
  content: string; // was "title"
  explanation?: string;
  metadataJson?: string; // JSON string
  createdAt: string;
  updatedAt: string;
  tags: string[]; // from navigation
  userName?: string;
}

// Payload for create – matches backend's CreateQuestionDto
export interface CreateQuestionPayload {
  type: string;
  content: string;
  explanation?: string;
  metadataJson?: string;
  tagNames?: string[]; // backend expects tagNames, not tags
}

// Update payload (all optional)
export type UpdateQuestionPayload = Partial<CreateQuestionPayload>;

export const useQuestionStore = defineStore("question", {
  state: () => ({
    questions: [] as QuestionDto[],
    currentQuestion: null as QuestionDto | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchQuestions(params?: {
      type?: string;
      tag?: string;
      search?: string;
    }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuestionDto[]>("/question", {
          params,
        });
        this.questions = response.data;
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
        const response = await apiClient.post<QuestionDto>(
          "/question",
          payload,
        );
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
        const response = await apiClient.put<QuestionDto>(
          `/question/${id}`,
          payload,
        );
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
        const response = await apiClient.get<QuestionDto[]>(
          `/quiz/${quizId}/questions`,
        );
        return response.data;
      } catch (err: any) {
        this.error =
          err.response?.data?.message || "Failed to fetch quiz questions";
        return [];
      } finally {
        this.loading = false;
      }
    },
  },
});
