import { defineStore } from "pinia";
import apiClient from "@/lib/api/client";

export interface QuizListDto {
  id: number;
  title: string;
  description?: string;
  visibility: "private" | "public" | "unlisted";
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
  visibility?: "private" | "public" | "unlisted";
  tagNames?: string[];
}

export interface UpdateQuizPayload {
  title?: string;
  description?: string;
  visibility?: "private" | "public" | "unlisted";
  tagNames?: string[];
}

export interface NoteDto {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const useQuizStore = defineStore("quiz", {
  state: () => ({
    quizzes: [] as QuizListDto[],
    currentQuiz: null as QuizDto | null,
    loading: false,
    error: null as string | null,
    notes: [] as NoteDto[],
    notesLoading: false,
  }),

  actions: {
    async fetchMyQuizzes() {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuizListDto[]>("/quiz?mine=true");
        this.quizzes = response.data;
      } catch (err: any) {
        this.error =
          err.response?.data?.message || "Failed to fetch your quizzes";
      } finally {
        this.loading = false;
      }
    },

    async fetchPublicQuizzes(visibility?: string) {
      this.loading = true;
      this.error = null;
      try {
        const url = visibility ? `/quiz?visibility=${visibility}` : "/quiz";
        const response = await apiClient.get<QuizListDto[]>(url);
        this.quizzes = response.data;
      } catch (err: any) {
        this.error =
          err.response?.data?.message || "Failed to fetch public quizzes";
      } finally {
        this.loading = false;
      }
    },

    async searchQuizzes(searchTerm: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<QuizListDto[]>(
          `/quiz?search=${encodeURIComponent(searchTerm)}`,
        );
        this.quizzes = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Search failed";
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
        this.error = err.response?.data?.message || "Failed to fetch quiz";
      } finally {
        this.loading = false;
      }
    },

    async createQuiz(payload: CreateQuizPayload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<QuizDto>("/quiz", payload);
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to create quiz";
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
        this.error = err.response?.data?.message || "Failed to update quiz";
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
        this.error = err.response?.data?.message || "Failed to delete quiz";
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
        this.error = err.response?.data?.message || "Failed to duplicate quiz";
        return null;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },

    async fetchQuizQuestions(quizId: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(`/quiz/${quizId}/questions`);
        return response.data; // array of QuizQuestionDto
      } catch (err: any) {
        this.error =
          err.response?.data?.message || "Failed to fetch quiz questions";
        return [];
      } finally {
        this.loading = false;
      }
    },

    async createQuizQuestion(
      quizId: number,
      snapshotJson: string,
      displayOrder: number,
    ) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post(`/quiz/${quizId}/questions`, {
          questionSnapshotJson: snapshotJson,
          displayOrder,
        });
        return response.data; // QuizQuestionDto
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to create question";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateQuizQuestion(
      questionId: number,
      snapshotJson: string,
      displayOrder: number,
    ) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.put(`/quiz/questions/${questionId}`, {
          questionSnapshotJson: snapshotJson,
          displayOrder,
        });
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to update question";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteQuizQuestion(questionId: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/quiz/questions/${questionId}`);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to delete question";
        return false;
      } finally {
        this.loading = false;
      }
    },

    async fetchQuizNotes(quizId: number) {
      this.notesLoading = true;
      this.error = null;
      try {
        const response = await apiClient.get<NoteDto[]>(
          `/quiz/${quizId}/notes`,
        );
        this.notes = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch notes";
      } finally {
        this.notesLoading = false;
      }
    },

    async addNoteToQuiz(
      quizId: number,
      payload: { title: string; content: string },
    ) {
      this.loading = true; // or use a separate flag
      this.error = null;
      try {
        const response = await apiClient.post<NoteDto>(
          `/quiz/${quizId}/notes`,
          payload,
        );
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to add note";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async removeNoteFromQuiz(quizId: number, noteId: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/quiz/${quizId}/notes/${noteId}`);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to remove note";
        return false;
      } finally {
        this.loading = false;
      }
    },
  },
});
