import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/lib/api/client';

export interface TagDto {
  id:            number;
  name:          string;
  quizCount:     number;
  questionCount: number;
  totalCount:    number;
}

// Matches TagListResponse from the backend
interface TagListResponse {
  tags:  TagDto[];
  total: number;
}

export const useTagStore = defineStore('tag', () => {
  const tags    = ref<TagDto[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);
  const fetched = ref(false); // in-session cache — avoids repeated API calls

  // Fetches all tags (up to 100, sorted by usage).
  // Pass force=true to bypass the cache (e.g. after saving a quiz/question
  // that may have introduced new tags via GetOrCreateTagsAsync).
  async function fetchTags(force = false) {
    if (fetched.value && !force) return;
    loading.value = true;
    error.value   = null;
    try {
      // GET /api/tags?sort=name&pageSize=100
      // sort=name gives alphabetical order for the dropdown; pageSize=100
      // covers any realistic tag catalogue without extra pagination logic.
      const res = await apiClient.get<TagListResponse>('/tags', {
        params: { sort: 'name', pageSize: 100 },
      });
      tags.value    = res.data.tags;
      fetched.value = true;
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to load tags';
    } finally {
      loading.value = false;
    }
  }

  return { tags, loading, error, fetched, fetchTags };
});