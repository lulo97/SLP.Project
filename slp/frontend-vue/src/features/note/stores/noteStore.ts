import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/lib/api/client';

export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const useNoteStore = defineStore('note', () => {
  const notes = ref<Note[]>([]);
  const currentNote = ref<Note | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Pagination state
  const currentPage = ref(1);
  const pageSize = ref(10);
  const totalItems = ref(0);
  const totalPages = ref(0);

   async function fetchNotes(search?: string, page: number = 1, size: number = 10) {
    loading.value = true;
    error.value = null;
    try {
      const params: any = { page, pageSize: size };
      if (search) params.search = search;
      const response = await apiClient.get('/notes', { params });
      const data = response.data; // PaginatedResult
      notes.value = data.items;
      totalItems.value = data.total;
      currentPage.value = data.page;
      pageSize.value = data.pageSize;
      totalPages.value = data.totalPages;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to load notes';
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchNoteById(id: number) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/notes/${id}`);
      currentNote.value = response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to load note';
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  async function createNote(title: string, content: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/notes', { title, content });
      const newNote = response.data;
      notes.value.unshift(newNote); // add to beginning
      return newNote;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create note';
      console.error(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateNote(id: number, title: string, content: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.put(`/notes/${id}`, { title, content });
      const updated = response.data;
      const index = notes.value.findIndex(n => n.id === id);
      if (index !== -1) notes.value[index] = updated;
      if (currentNote.value?.id === id) currentNote.value = updated;
      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update note';
      console.error(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteNote(id: number) {
    loading.value = true;
    error.value = null;
    try {
      await apiClient.delete(`/notes/${id}`);
      notes.value = notes.value.filter(n => n.id !== id);
      if (currentNote.value?.id === id) currentNote.value = null;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete note';
      console.error(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function resetCurrent() {
    currentNote.value = null;
  }

  return {
    notes,
    currentNote,
    loading,
    error,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    fetchNotes,
    fetchNoteById,
    createNote,
    updateNote,
    deleteNote,
    resetCurrent,
  };
});