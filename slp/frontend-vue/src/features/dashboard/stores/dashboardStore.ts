import { defineStore } from 'pinia';
import apiClient from '@/lib/api/client';

// Types matching backend DTOs
export interface WordOfTheDay {
  word: string;
  partOfSpeech: string;
  vietnameseTranslation: string;
  example: string;
  origin?: string | null;
  funFact?: string | null;
}

export interface TopQuiz {
  id: number;
  title: string;
  authorUsername: string;
  attemptCount: number;
  commentCount: number;
  questionCount: number;
}

export interface UserStats {
  quizCount: number;
  questionCount: number;
  sourceCount: number;
  favoriteCount: number;
}

interface DashboardState {
  wordOfTheDay: WordOfTheDay | null;
  topQuizzes: TopQuiz[];
  userStats: UserStats | null;
  loading: {
    word: boolean;
    quizzes: boolean;
    stats: boolean;
  };
  error: {
    word: string | null;
    quizzes: string | null;
    stats: string | null;
  };
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    wordOfTheDay: null,
    topQuizzes: [],
    userStats: null,
    loading: {
      word: false,
      quizzes: false,
      stats: false,
    },
    error: {
      word: null,
      quizzes: null,
      stats: null,
    },
  }),

  actions: {
    /**
     * Fetch the word of the day from /dashboard/word-of-the-day
     */
    async fetchWordOfTheDay() {
      this.loading.word = true;
      this.error.word = null;
      try {
        const response = await apiClient.get<WordOfTheDay>('/dashboard/word-of-the-day');
        this.wordOfTheDay = response.data;
      } catch (err: any) {
        this.error.word = err.response?.data?.error || 'Failed to load word of the day';
        console.error('[Dashboard] fetchWordOfTheDay error:', err);
      } finally {
        this.loading.word = false;
      }
    },

    /**
     * Fetch top quizzes from /dashboard/top-quizzes?limit=5 (default)
     */
    async fetchTopQuizzes(limit = 5) {
      this.loading.quizzes = true;
      this.error.quizzes = null;
      try {
        const response = await apiClient.get<TopQuiz[]>('/dashboard/top-quizzes', {
          params: { limit },
        });
        this.topQuizzes = response.data;
      } catch (err: any) {
        this.error.quizzes = err.response?.data?.error || 'Failed to load top quizzes';
        console.error('[Dashboard] fetchTopQuizzes error:', err);
      } finally {
        this.loading.quizzes = false;
      }
    },

    /**
     * Fetch user stats from /dashboard/user-stats
     */
    async fetchUserStats() {
      this.loading.stats = true;
      this.error.stats = null;
      try {
        const response = await apiClient.get<UserStats>('/dashboard/user-stats');
        this.userStats = response.data;
      } catch (err: any) {
        this.error.stats = err.response?.data?.error || 'Failed to load user stats';
        console.error('[Dashboard] fetchUserStats error:', err);
      } finally {
        this.loading.stats = false;
      }
    },

    /**
     * Convenience action to refresh all dashboard data at once
     */
    async refreshAll() {
      await Promise.allSettled([
        this.fetchWordOfTheDay(),
        this.fetchTopQuizzes(),
        this.fetchUserStats(),
      ]);
    },
  },
});