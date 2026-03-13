import { defineStore } from "pinia";
import apiClient from "@/lib/api/client";

// Allowed source types (mirroring backend)
export type SourceType = "pdf" | "txt" | "link" | "note" | "book" | string;

// DTO for list view (matches backend's SourceListDto)
export interface SourceListItem {
  id: number;
  type: SourceType;
  title: string;
  url?: string;
  createdAt: string; // from backend CreatedAt
  updatedAt: string; // from backend UpdatedAt
}

// DTO for detail view (matches backend's SourceDto)
export interface SourceDetail extends SourceListItem {
  userId: number;
  rawText?: string; // from backend RawText
  filePath?: string; // from backend FilePath
  metadata?: string; // from backend MetadataJson
}

export const useSourceStore = defineStore("source", {
  state: () => ({
    sources: [] as SourceListItem[],
    currentSource: null as SourceDetail | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    clearError() {
      this.error = null;
    },

    // Fetch all sources for the current user
    async fetchSources() {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<SourceListItem[]>("/source");
        this.sources = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch sources";
      } finally {
        this.loading = false;
      }
    },

    // Fetch a single source by ID
    async fetchSource(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<SourceDetail>(`/source/${id}`);
        this.currentSource = response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to fetch source";
      } finally {
        this.loading = false;
      }
    },

    // Create a source from URL
    async createSourceFromUrl(payload: { url: string; title: string }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<SourceDetail>(
          "/source/url",
          payload,
        );
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Failed to create source";
        return null;
      } finally {
        this.loading = false;
      }
    },

    // Upload a file source (requires title)
    async uploadSource(file: File, title: string) {
      this.loading = true;
      this.error = null;
      const formData = new FormData();
      formData.append("File", file); // must match backend parameter name 'File'
      formData.append("Title", title); // required by backend
      try {
        const response = await apiClient.post<SourceDetail>(
          "/source/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        return response.data;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Upload failed";
        return null;
      } finally {
        this.loading = false;
      }
    },

    // Delete source
    async deleteSource(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/source/${id}`);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || "Delete failed";
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Create a source from plain text
    async createSourceFromText(payload: { title: string; content: string }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<SourceDetail>(
          "/source/text",
          payload,
        );
        return response.data;
      } catch (err: any) {
        this.error =
          err.response?.data?.message || "Failed to create text source";
        return null;
      } finally {
        this.loading = false;
      }
    },
  },
});
