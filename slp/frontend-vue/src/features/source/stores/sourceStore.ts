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

export interface ProgressDto {
  userId: number;
  sourceId: number;
  scrollPosition: number;
  percentComplete: number;
  lastReadAt: string;
}

export interface UpdateProgressRequest {
  scrollPosition: number;
  percentComplete: number;
}

export const useSourceStore = defineStore("source", () => {
  const sources = ref<SourceListDto[]>([]);
  const currentSource = ref<SourceDto | null>(null);
  const currentProgress = ref<ProgressDto | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ── Error helpers ────────────────────────────────────────────────────────
  function clearError() {
    error.value = null;
  }

  // ── Sources ──────────────────────────────────────────────────────────────
  async function fetchSources() {
    loading.value = true;
    error.value = null;
    try {
      const res = await apiClient.get<SourceListDto[]>("/source");
      sources.value = res.data;
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
  async function uploadSource(file: File, title: string): Promise<SourceDto | null> {
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
  // Accepts either (url, title?) or ({ url, title? }) to support both call styles:
  //   SourceUrlCreatePage  → createSourceFromUrl({ url, title })
  //   SourceDetailPage     → createFromUrl(url, title?)
  async function createSourceFromUrl(
    urlOrObj: string | { url: string; title?: string },
    title?: string
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

  // Alias — keeps SourceDetailPage happy if it ever calls createFromUrl directly
  const createFromUrl = createSourceFromUrl;

  // ── Create note ──────────────────────────────────────────────────────────
  // Accepts either ({ title, content }) or (title, content) to support both call styles:
  //   SourceNoteCreatePage → createSourceFromNote({ title, content })
  //   SourceDetailPage     → createNote(title, content)
  async function createSourceFromNote(
    titleOrObj: string | { title: string; content: string },
    content?: string
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

  // Alias — SourceDetailPage calls createNote(title, content)
  async function createNote(title: string, content: string): Promise<SourceDto | null> {
    return createSourceFromNote(title, content);
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  // Returns boolean so SourceListPage can branch: if (success) { ... }
  async function deleteSource(id: number): Promise<boolean> {
    try {
      await apiClient.delete(`/source/${id}`);
      sources.value = sources.value.filter((s) => s.id !== id);
      return true;
    } catch (e: any) {
      error.value = e.response?.data || "Failed to delete source";
      return false;
    }
  }

  // ── Progress ─────────────────────────────────────────────────────────────
  async function fetchProgress(sourceId: number): Promise<ProgressDto | null> {
    try {
      const res = await apiClient.get<ProgressDto>(`/source/${sourceId}/progress`);
      currentProgress.value = res.data;
      return res.data;
    } catch {
      currentProgress.value = null;
      return null;
    }
  }

  async function updateProgress(
    sourceId: number,
    payload: UpdateProgressRequest
  ): Promise<void> {
    try {
      const res = await apiClient.put<ProgressDto>(
        `/source/${sourceId}/progress`,
        payload
      );
      currentProgress.value = res.data;
    } catch {
      // Progress save is non-critical — fail silently.
    }
  }

  return {
    // State
    sources,
    currentSource,
    currentProgress,
    loading,
    error,

    // Methods
    clearError,
    fetchSources,
    fetchSource,
    uploadSource,
    createSourceFromUrl, // SourceUrlCreatePage: createSourceFromUrl({ url, title })
    createFromUrl,       // alias: createFromUrl(url, title?)
    createSourceFromNote, // SourceNoteCreatePage: createSourceFromNote({ title, content })
    createNote,          // alias: createNote(title, content)
    deleteSource,        // returns boolean
    fetchProgress,
    updateProgress,
  };
});