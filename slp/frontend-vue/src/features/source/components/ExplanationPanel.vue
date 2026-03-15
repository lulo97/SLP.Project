<template>
  <div class="explanation-panel" :class="{ 'is-open': isOpen }">
    <!-- Toggle handle -->
    <button class="panel-toggle" @click="$emit('close')">
      <ChevronRight :size="16" />
    </button>

    <div class="panel-inner">
      <div class="panel-header">
        <div class="panel-title-row">
          <Sparkles :size="16" class="panel-icon" />
          <h3 class="panel-title">Explanations</h3>
        </div>
        <button class="panel-close" @click="$emit('close')">
          <X :size="16" />
        </button>
      </div>

      <!-- Selected text preview -->
      <div v-if="pendingText" class="selected-preview">
        <p class="preview-label">Selected text</p>
        <blockquote class="preview-text">{{ truncate(pendingText, 120) }}</blockquote>
        <div class="preview-actions">
          <button class="action-btn action-btn--primary" @click="$emit('request-explain', pendingText)">
            <Sparkles :size="13" />
            Explain with AI
          </button>
          <button class="action-btn" @click="$emit('clear-pending')">
            <X :size="13" />
            Clear
          </button>
        </div>
      </div>

      <!-- Explanations list -->
      <div v-if="loading" class="panel-loading">
        <a-spin size="small" />
        <span>Loading...</span>
      </div>

      <div v-else-if="explanations.length === 0 && !pendingText" class="panel-empty">
        <BookOpen :size="32" class="empty-icon" />
        <p>Select text in the article to get AI explanations.</p>
      </div>

      <div v-else class="explanations-list">
        <div
          v-for="exp in explanations"
          :key="exp.id"
          class="explanation-card"
        >
          <div class="exp-quote">
            <span class="quote-mark">"</span>
            {{ truncate(exp.textRange?.text ?? '', 80) }}
          </div>
          <div v-if="exp.content" class="exp-body">
            {{ exp.content }}
          </div>
          <div v-else class="exp-pending">
            <a-spin size="small" />
            <span>Generating explanation…</span>
          </div>
          <div class="exp-meta">
            {{ formatDate(exp.createdAt) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, X, ChevronRight, BookOpen } from "lucide-vue-next";

/** Matches the backend ExplanationDto exactly. */
export interface ExplanationItem {
  id: number;
  userId?: number;
  sourceId?: number;
  /** JSON object stored by backend — we put { text: "..." } here */
  textRange?: { text?: string; [key: string]: any } | null;
  /** The explanation body (AI-generated or user-written). Empty while pending. */
  content: string;
  authorType?: string;
  editable?: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

defineProps<{
  isOpen: boolean;
  pendingText?: string;
  explanations: ExplanationItem[];
  loading?: boolean;
}>();

defineEmits<{
  close: [];
  "request-explain": [text: string];
  "clear-pending": [];
}>();

function truncate(text: string, max: number) {
  return text.length <= max ? text : text.slice(0, max) + "…";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<style scoped>
.explanation-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 320px;
  background: #faf9f6;
  border-left: 1px solid #e8e4dc;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.06);
  transform: translateX(100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.explanation-panel.is-open {
  transform: translateX(0);
}

.panel-toggle {
  position: absolute;
  left: -32px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 48px;
  background: #faf9f6;
  border: 1px solid #e8e4dc;
  border-right: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition: color 0.15s;
}

.panel-toggle:hover {
  color: #374151;
}

.panel-inner {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #e8e4dc;
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  color: #7c6af5;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
  letter-spacing: -0.01em;
}

.panel-close {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.panel-close:hover {
  color: #374151;
  background: #f3f4f6;
}

.selected-preview {
  margin: 16px;
  padding: 14px;
  background: #fff;
  border: 1px solid #e8e4dc;
  border-radius: 10px;
}

.preview-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  margin: 0 0 8px;
}

.preview-text {
  font-size: 13px;
  color: #374151;
  font-style: italic;
  border-left: 3px solid #7c6af5;
  padding-left: 10px;
  margin: 0 0 12px;
  line-height: 1.5;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e8e4dc;
  background: #fff;
  color: #374151;
  transition: all 0.15s;
  font-family: inherit;
}

.action-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.action-btn--primary {
  background: #7c6af5;
  border-color: #7c6af5;
  color: #fff;
}

.action-btn--primary:hover {
  background: #6c5ce7;
  border-color: #6c5ce7;
}

.panel-loading,
.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  flex: 1;
}

.empty-icon {
  color: #d1d5db;
}

.explanations-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.explanation-card {
  background: #fff;
  border: 1px solid #e8e4dc;
  border-radius: 10px;
  padding: 14px;
  transition: box-shadow 0.15s;
}

.explanation-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.exp-quote {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 8px;
  line-height: 1.4;
}

.quote-mark {
  font-size: 18px;
  color: #7c6af5;
  line-height: 0;
  vertical-align: -4px;
  margin-right: 2px;
}

.exp-body {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
}

.exp-pending {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.exp-meta {
  font-size: 11px;
  color: #c4bfb5;
  margin-top: 8px;
}
</style>