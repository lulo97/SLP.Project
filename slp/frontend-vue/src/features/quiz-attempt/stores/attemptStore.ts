import { defineStore } from "pinia";
import apiClient from "@/lib/api/client";

export interface Attempt {
  id: number;
  userId: number;
  quizId: number;
  startTime: string;
  endTime?: string;
  score?: number;
  maxScore: number;
  questionCount: number;
  status: "in_progress" | "completed" | "abandoned";
  answers?: AttemptAnswer[];
}

export interface AttemptAnswer {
  id: number;
  attemptId: number;
  quizQuestionId: number;
  questionSnapshotJson: string;
  answerJson: string;
  isCorrect?: boolean;
}

export interface StartAttemptResponse {
  attemptId: number;
  startTime: string;
  questionCount: number;
  maxScore: number;
  questions: {
    quizQuestionId: number;
    displayOrder: number;
    questionSnapshotJson: string;
  }[];
}

export interface SubmitAnswerPayload {
  quizQuestionId: number;
  answerJson: string;
}

export interface AttemptReview extends Attempt {
  quizTitle: string;
  answerReview: (AttemptAnswer & { isCorrect: boolean })[];
}

export const useAttemptStore = defineStore("attempt", {
  state: () => ({
    currentAttempt: null as StartAttemptResponse | null,
    attemptDetails: null as Attempt | null,
    attemptReview: null as AttemptReview | null,
    loading: false,
    error: null as string | null,
    userAttempts: [] as Attempt[],
  }),

  actions: {
    async startAttempt(quizId: number, randomizeOrder = false) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<StartAttemptResponse>(
          `/quizzes/${quizId}/attempts`,
          { randomizeOrder }, // ← send as JSON body
        );
        const data = response.data;
        console.log("[attemptStore] startAttempt response:", {
          attemptId: data.attemptId,
          questionCount: data.questionCount,
          firstQuestionSnapshot:
            data.questions?.[0]?.questionSnapshotJson?.slice(0, 50),
        });
        if (!data) throw new Error("startAttempt returned null data");
        if (!data.questions || !Array.isArray(data.questions))
          throw new Error(
            `startAttempt: questions missing or not array: ${JSON.stringify(data)}`,
          );
        if (data.questions.length === 0)
          throw new Error("startAttempt: questions array is empty");
        this.currentAttempt = data;
        return data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to start attempt";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchAttempt(attemptId: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<Attempt>(`/attempts/${attemptId}`);
        const data = response.data;
        console.log("[attemptStore] fetchAttempt response:", {
          id: data.id,
          status: data.status,
          answersLength: data.answers?.length,
          firstAnswerSnapshot: data.answers?.[0]?.questionSnapshotJson?.slice(
            0,
            50,
          ),
        });
        if (!data) throw new Error("fetchAttempt returned null data");
        if (!data.answers) console.warn("fetchAttempt: answers missing", data);
        this.attemptDetails = data;
        return data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch attempt";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchAttemptReview(attemptId: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<AttemptReview>(
          `/attempts/${attemptId}/review`,
        );
        this.attemptReview = response.data;
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch review";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async submitAnswer(
      attemptId: number,
      quizQuestionId: number,
      answerJson: string,
    ) {
      this.loading = true;
      try {
        await apiClient.post(`/attempts/${attemptId}/answers`, {
          quizQuestionId,
          answerJson,
        });
      } finally {
        this.loading = false;
      }
    },

    async submitAttempt(attemptId: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<Attempt>(
          `/attempts/${attemptId}/submit`,
        );
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to submit attempt";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchUserAttemptsForQuiz(quizId: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<Attempt[]>(
          `/quizzes/${quizId}/attempts`,
        );
        this.userAttempts = response.data;
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch attempts";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },
  },
});
