import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/lib/api/client";

export interface SourceDto {
  id: number;
  userId: number;
  type: string;
  title: string;
  url?: string;
  rawText?: string;
  contentJson?: string;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: string;
}

export interface SourceListDto {
  id: number;
  type: string;
  title: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

// NEW: mirrors backend PagedResult<SourceListDto>
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// NEW: mirrors backend SourceQueryParams
export interface SourceQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}

export interface ProgressDto {
  sourceId: number;
  lastPosition: { scrollPosition?: number; percentComplete?: number } | null;
  updatedAt: string;
}

export interface UpdateProgressRequest {
  lastPosition: {
    scrollPosition: number;
    percentComplete: number;
  };
}

export const useSourceStore = defineStore("source", () => {
  const sources = ref<SourceListDto[]>([]);
  const currentSource = ref<SourceDto | null>(null);
  const currentProgress = ref<ProgressDto | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // NEW: pagination meta
  const pagination = ref<Omit<PagedResult<never>, "items">>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });

  // ── Error helpers ────────────────────────────────────────────────────────
  function clearError() {
    error.value = null;
  }

  // ── Sources ──────────────────────────────────────────────────────────────
  async function fetchSources(params: SourceQueryParams = {}) {
    loading.value = true;
    error.value = null;
    try {
      const res = await apiClient.get<PagedResult<SourceListDto>>("/source", {
        params: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
          search: params.search || undefined,
          type: params.type || undefined,
        },
      });
      sources.value = res.data.items;
      pagination.value = {
        total: res.data.total,
        page: res.data.page,
        pageSize: res.data.pageSize,
        totalPages: res.data.totalPages,
      };
    } catch (e: any) {
      error.value = e.response?.data || "Failed to load sources";
    } finally {
      loading.value = false;
    }
  }

  async function fetchSource(id: number): Promise<SourceDto | null> {
    loading.value = true;
    error.value = null;
    try {
      const res = await apiClient.get<SourceDto>(`/source/${id}`);
      currentSource.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e.response?.data || "Failed to load source";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // ── Upload file ──────────────────────────────────────────────────────────
  async function uploadSource(
    file: File,
    title: string,
  ): Promise<SourceDto | null> {
    loading.value = true;
    error.value = null;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      const res = await apiClient.post<SourceDto>("/source/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (e: any) {
      error.value = e.response?.data || "Upload failed";
      return null;
    } finally {
      loading.value = false;
    }
  }

  // ── Create from URL ──────────────────────────────────────────────────────
  async function createSourceFromUrl(
    urlOrObj: string | { url: string; title?: string },
    title?: string,
  ): Promise<SourceDto | null> {
    loading.value = true;
    error.value = null;
    try {
      const payload =
        typeof urlOrObj === "string"
          ? { url: urlOrObj, title }
          : { url: urlOrObj.url, title: urlOrObj.title };
      const res = await apiClient.post<SourceDto>("/source/url", payload);
      return res.data;
    } catch (e: any) {
      error.value = e.response?.data || "Failed to create source from URL";
      return null;
    } finally {
      loading.value = false;
    }
  }
  const createFromUrl = createSourceFromUrl;

  // ── Create note ──────────────────────────────────────────────────────────
  async function createSourceFromNote(
    titleOrObj: string | { title: string; content: string },
    content?: string,
  ): Promise<SourceDto | null> {
    loading.value = true;
    error.value = null;
    try {
      const payload =
        typeof titleOrObj === "string"
          ? { title: titleOrObj, content: content ?? "" }
          : { title: titleOrObj.title, content: titleOrObj.content };
      const res = await apiClient.post<SourceDto>("/source/note", payload);
      return res.data;
    } catch (e: any) {
      error.value = e.response?.data || "Failed to create note source";
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createNote(
    title: string,
    content: string,
  ): Promise<SourceDto | null> {
    return createSourceFromNote(title, content);
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function deleteSource(id: number): Promise<boolean> {
    try {
      await apiClient.delete(`/source/${id}`);
      sources.value = sources.value.filter((s) => s.id !== id);
      pagination.value.total = Math.max(0, pagination.value.total - 1);
      return true;
    } catch (e: any) {
      error.value = e.response?.data || "Failed to delete source";
      return false;
    }
  }

  // ── Progress ─────────────────────────────────────────────────────────────
  async function fetchProgress(sourceId: number): Promise<ProgressDto | null> {
    try {
      const res = await apiClient.get<ProgressDto>(
        `/source/${sourceId}/progress`,
      );
      currentProgress.value = res.data;
      return res.data;
    } catch {
      currentProgress.value = null;
      return null;
    }
  }

  async function updateProgress(
    sourceId: number,
    payload: { scrollPosition: number; percentComplete: number },
  ): Promise<void> {
    try {
      const res = await apiClient.put<ProgressDto>(
        `/source/${sourceId}/progress`,
        { lastPosition: payload }, // ← wrap in lastPosition
      );
      currentProgress.value = res.data;
    } catch {
      /* non-critical */
    }
  }

  return {
    sources,
    currentSource,
    currentProgress,
    pagination, // NEW
    loading,
    error,

    clearError,
    fetchSources,
    fetchSource,
    uploadSource,
    createSourceFromUrl,
    createFromUrl,
    createSourceFromNote,
    createNote,
    deleteSource,
    fetchProgress,
    updateProgress,
  };
});
