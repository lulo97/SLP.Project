import { defineStore } from "pinia";
import apiClient from "@/lib/api/client";

export interface QuizListDto {
  id: number;
  title: string;
  description?: string;
  visibility: "private" | "public" | "unlisted";
  disabled?: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  questionCount: number;
  userName?: string;
  userId?: number;
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

export interface SourceDto {
  id: number;
  type: string;
  title: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const useQuizStore = defineStore("quiz", {
  state: () => ({
    quizzes: [] as QuizListDto[],
    currentQuiz: null as QuizDto | null,
    // Only true during initial page-level fetches (fetchQuizById, fetchMyQuizzes, etc.)
    loading: false,
    error: null as string | null,
    notes: [] as NoteDto[],
    // True only during initial notes fetch (not during add/edit/delete)
    notesLoading: false,
    // True only during note add/edit/delete actions
    noteSaving: false,
    sources: [] as SourceDto[],
    // True only during initial sources fetch
    sourcesLoading: false,
    // True only during source attach/detach actions
    sourceSaving: false,
    // Pagination state
    currentPage: 1,
    pageSize: 10,
    total: 0,
  }),

  actions: {
    // ─── Quiz list / CRUD (keep loading flag — these are page-level navigations) ───

    async fetchMyQuizzes(page = 1, pageSize = 10) {
      this.loading = true;
      this.error = null;
      this.currentPage = page;
      this.pageSize = pageSize;
      try {
        const response = await apiClient.get<PaginatedResult<QuizListDto>>(
          `/quiz?mine=true&page=${page}&pageSize=${pageSize}`,
        );
        this.quizzes = response.data.items ?? (response.data as any);
        this.total = response.data.total ?? 0;
        this.currentPage = response.data.page ?? page;
      } catch (err: any) {
        this.error =
          err.response?.data?.message || "Failed to fetch your quizzes";
      } finally {
        this.loading = false;
      }
    },

    async fetchPublicQuizzes(visibility?: string, page = 1, pageSize = 10) {
      this.loading = true;
      this.error = null;
      this.currentPage = page;
      this.pageSize = pageSize;
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (visibility) params.set("visibility", visibility);
        const response = await apiClient.get<PaginatedResult<QuizListDto>>(
          `/quiz?${params.toString()}`,
        );
        this.quizzes = response.data.items ?? (response.data as any);
        this.total = response.data.total ?? 0;
        this.currentPage = response.data.page ?? page;
      } catch (err: any) {
        this.error =
          err.response?.data?.message || "Failed to fetch public quizzes";
      } finally {
        this.loading = false;
      }
    },

    async searchQuizzes(searchTerm: string, page = 1, pageSize = 10) {
      this.loading = true;
      this.error = null;
      this.currentPage = page;
      this.pageSize = pageSize;
      try {
        const response = await apiClient.get<PaginatedResult<QuizListDto>>(
          `/quiz?search=${encodeURIComponent(searchTerm)}&page=${page}&pageSize=${pageSize}`,
        );
        this.quizzes = response.data.items ?? (response.data as any);
        this.total = response.data.total ?? 0;
        this.currentPage = response.data.page ?? page;
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

    // ─── Quiz questions (no loading flag — caller manages its own saving ref) ───

    async fetchQuizQuestions(quizId: number) {
      // Use loading here because it's called on mount (initial fetch)
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get(`/quiz/${quizId}/questions`);
        return response.data;
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
      originalQuestionId?: number,
    ) {
      // No loading flag — useQuizQuestions composable handles saving state
      try {
        const response = await apiClient.post(`/quiz/${quizId}/questions`, {
          questionSnapshotJson: snapshotJson,
          displayOrder,
          originalQuestionId,
        });
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to create question";
        throw err;
      }
    },

    async updateQuizQuestion(
      questionId: number,
      snapshotJson: string,
      displayOrder: number,
    ) {
      // No loading flag — useQuizQuestions composable handles saving state
      try {
        const response = await apiClient.put(`/quiz/questions/${questionId}`, {
          questionSnapshotJson: snapshotJson,
          displayOrder,
        });
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to update question";
        throw err;
      }
    },

    async deleteQuizQuestion(questionId: number) {
      // No loading flag — useQuizQuestions composable handles saving state
      try {
        await apiClient.delete(`/quiz/questions/${questionId}`);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to delete question";
        return false;
      }
    },

    // ─── Notes (notesLoading for initial fetch, noteSaving for mutations) ───

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
      this.noteSaving = true;
      this.error = null;
      try {
        const response = await apiClient.post<NoteDto>(
          `/quiz/${quizId}/notes`,
          payload,
        );
        // Optimistic local update — no re-fetch needed
        this.notes = [...this.notes, response.data];
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to add note";
        throw err;
      } finally {
        this.noteSaving = false;
      }
    },

    async updateNote(id: number, payload: { title: string; content: string }) {
      this.noteSaving = true;
      this.error = null;
      try {
        const response = await apiClient.put<NoteDto>(`/notes/${id}`, payload);
        // Patch in-place — no re-fetch needed
        const idx = this.notes.findIndex((n) => n.id === id);
        if (idx !== -1) {
          this.notes[idx] = response.data;
          this.notes = [...this.notes]; // trigger reactivity
        }
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to update note";
        throw err;
      } finally {
        this.noteSaving = false;
      }
    },

    async removeNoteFromQuiz(quizId: number, noteId: number) {
      this.noteSaving = true;
      this.error = null;
      try {
        await apiClient.delete(`/quiz/${quizId}/notes/${noteId}`);
        // Optimistic removal — no re-fetch needed
        this.notes = this.notes.filter((n) => n.id !== noteId);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to remove note";
        return false;
      } finally {
        this.noteSaving = false;
      }
    },

    // ─── Sources (sourcesLoading for initial fetch, sourceSaving for mutations) ───

    async fetchQuizSources(quizId: number) {
      this.sourcesLoading = true;
      this.error = null;
      try {
        const response = await apiClient.get<SourceDto[]>(
          `/quiz/${quizId}/sources`,
        );
        this.sources = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch sources";
      } finally {
        this.sourcesLoading = false;
      }
    },

    async addSourceToQuiz(quizId: number, sourceId: number) {
      this.sourceSaving = true;
      this.error = null;
      try {
        const response = await apiClient.post<SourceDto>(
          `/quiz/${quizId}/sources`,
          { sourceId },
        );
        // Optimistic local update — no re-fetch needed
        this.sources = [...this.sources, response.data];
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to attach source";
        throw err;
      } finally {
        this.sourceSaving = false;
      }
    },

    async removeSourceFromQuiz(quizId: number, sourceId: number) {
      this.sourceSaving = true;
      this.error = null;
      try {
        await apiClient.delete(`/quiz/${quizId}/sources/${sourceId}`);
        // Optimistic removal — no re-fetch needed
        this.sources = this.sources.filter((s) => s.id !== sourceId);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to detach source";
        return false;
      } finally {
        this.sourceSaving = false;
      }
    },

    // ─── Misc ───

    clearError() {
      this.error = null;
    },
  },
});
