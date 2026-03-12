import { defineStore } from 'pinia';
import apiClient from '@/lib/api/client';

export interface SourceDto {
  id: number;
  userId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
}

export const useSourceStore = defineStore('source', {
  state: () => ({
    sources: [] as SourceDto[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async uploadSource(file: File) {
      this.loading = true;
      this.error = null;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await apiClient.post<SourceDto>('/sources', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Upload failed';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async deleteSource(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/sources/${id}`);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || 'Delete failed';
        return false;
      } finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
    },
  },
});