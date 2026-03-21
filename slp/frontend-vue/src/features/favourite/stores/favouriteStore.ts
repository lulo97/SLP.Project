import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/lib/api/client";

export interface Favorite {
  id: number;
  text: string;
  type: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const useFavoriteStore = defineStore("favorite", () => {
  const favorites = ref<Favorite[]>([]);
  const currentFavorite = ref<Favorite | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Pagination state
  const currentPage = ref(1);
  const pageSize = ref(10);
  const totalItems = ref(0);
  const totalPages = ref(0);

  async function fetchFavorites(
    search?: string,
    page: number = 1,
    size: number = 10,
  ) {
    loading.value = true;
    error.value = null;
    try {
      const params: any = { page, pageSize: size };
      if (search) params.search = search;
      const response = await apiClient.get("/favorites", { params });
      const data = response.data; // PaginatedResult
      favorites.value = data.items;
      totalItems.value = data.totalCount;
      currentPage.value = data.page;
      pageSize.value = data.pageSize;
      totalPages.value = data.totalPages;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to load favorites";
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchFavoriteById(id: number) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/favorites/${id}`);
      currentFavorite.value = response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to load favorite";
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  async function createFavorite(text: string, type: string, note?: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post("/favorites", { text, type, note });
      const newFavorite = response.data;
      favorites.value.unshift(newFavorite);
      return newFavorite;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to create favorite";
      console.error(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateFavorite(
    id: number,
    text: string,
    type: string,
    note?: string,
  ) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/favorites/${id}`, {
        text,
        type,
        note,
      });
      const updated = response.data;
      const index = favorites.value.findIndex((f) => f.id === id);
      if (index !== -1) favorites.value[index] = updated;
      if (currentFavorite.value?.id === id) currentFavorite.value = updated;
      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to update favorite";
      console.error(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteFavorite(id: number) {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/favorites/${id}`);
      favorites.value = favorites.value.filter((f) => f.id !== id);
      if (currentFavorite.value?.id === id) currentFavorite.value = null;
    } catch (err: any) {
      error.value = err.response?.data?.message || "Failed to delete favorite";
      console.error(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function resetCurrent() {
    currentFavorite.value = null;
  }

  return {
    favorites,
    currentFavorite,
    loading,
    error,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    fetchFavorites,
    fetchFavoriteById,
    createFavorite,
    updateFavorite,
    deleteFavorite,
    resetCurrent,
  };
});
