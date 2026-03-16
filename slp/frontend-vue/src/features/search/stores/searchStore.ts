import { defineStore } from 'pinia';
import apiClient from '@/lib/api/client';

export interface SearchResultItem {
  id: number;
  resultType: 'quiz' | 'question' | 'source' | 'favorite';
  title: string;
  snippet: string | null;
  rank: number;
  tags: string[];
  createdAt: string;
  subType: string | null;
  visibility: string | null;
}

export interface CategoryCounts {
  quizzes: number;
  questions: number;
  sources: number;
  favorites: number;
}

export interface SearchResponse {
  query: string;
  type: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  results: SearchResultItem[];
  categoryCounts: CategoryCounts | null;
}

export type SearchType = 'all' | 'quiz' | 'question' | 'source' | 'favorite';

export const useSearchStore = defineStore('search', {
  state: () => ({
    query: '' as string,
    activeType: 'all' as SearchType,
    page: 1,
    pageSize: 20,

    results: [] as SearchResultItem[],
    totalCount: 0,
    totalPages: 0,
    categoryCounts: null as CategoryCounts | null,

    loading: false,
    error: null as string | null,

    // Track the last committed search so we know when to reset page
    lastQuery: '' as string,
    lastType: 'all' as SearchType,
  }),

  getters: {
    hasResults: (state) => state.results.length > 0,
    hasSearched: (state) => state.lastQuery.length > 0,
  },

  actions: {
    setQuery(q: string) {
      this.query = q;
    },

    setType(type: SearchType) {
      this.activeType = type;
      // Reset to page 1 when switching tabs
      this.page = 1;
      if (this.lastQuery) {
        this.search();
      }
    },

    setPage(page: number) {
      this.page = page;
      this.search();
    },

    async search(resetPage = false) {
      const q = this.query.trim();
      if (!q) return;

      if (resetPage || q !== this.lastQuery) {
        this.page = 1;
      }

      this.loading = true;
      this.error = null;

      try {
        const params: Record<string, string | number> = {
          q,
          type: this.activeType,
          page: this.page,
          pageSize: this.pageSize,
        };

        const response = await apiClient.get<SearchResponse>('/search', { params });
        const data = response.data;

        this.results = data.results;
        this.totalCount = data.totalCount;
        this.totalPages = data.totalPages;
        this.categoryCounts = data.categoryCounts;

        this.lastQuery = q;
        this.lastType = this.activeType;
      } catch (err: any) {
        this.error = err.response?.data?.error || 'Search failed. Please try again.';
        this.results = [];
        this.totalCount = 0;
        this.totalPages = 0;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.query = '';
      this.activeType = 'all';
      this.page = 1;
      this.results = [];
      this.totalCount = 0;
      this.totalPages = 0;
      this.categoryCounts = null;
      this.error = null;
      this.lastQuery = '';
      this.lastType = 'all';
    },
  },
});
