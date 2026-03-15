<template>
  <div
    class="fixed top-0 right-0 h-screen w-[320px] bg-[#faf9f6] border-l border-[#e8e4dc]
           shadow-[-4px_0_24px_rgba(0,0,0,0.06)] z-[200] flex flex-col
           transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
    data-testid="explanation-panel"
  >
    <!-- Toggle handle -->
    <button
      class="absolute left-[-32px] top-1/2 -translate-y-1/2 w-8 h-12
             bg-[#faf9f6] border border-[#e8e4dc] border-r-0 rounded-l-[8px]
             cursor-pointer flex items-center justify-center
             text-gray-400 transition-colors hover:text-gray-700"
      @click="$emit('close')"
      data-testid="explanation-panel-toggle-btn"
    >
      <ChevronRight :size="16" />
    </button>

    <!-- Scrollable inner -->
    <div class="flex-1 overflow-y-auto flex flex-col">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e8e4dc]">
        <div class="flex items-center gap-2">
          <Sparkles :size="16" class="text-[#7c6af5]" />
          <h3 class="text-sm font-semibold text-[#1a1a2e] m-0 tracking-[-0.01em]">Explanations</h3>
        </div>
        <button
          class="bg-transparent border-0 text-gray-400 cursor-pointer p-1 rounded
                 transition-all hover:text-gray-700 hover:bg-gray-100"
          @click="$emit('close')"
          data-testid="explanation-panel-close-btn"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Selected text preview -->
      <div
        v-if="pendingText"
        class="m-4 p-[14px] bg-white border border-[#e8e4dc] rounded-[10px]"
        data-testid="explanation-panel-preview"
      >
        <p class="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mt-0 mb-2">
          Selected text
        </p>
        <blockquote
          class="text-[13px] text-gray-700 italic border-l-[3px] border-[#7c6af5]
                 pl-[10px] mt-0 mb-3 leading-[1.5]"
          data-testid="explanation-panel-preview-text"
        >
          {{ truncate(pendingText, 120) }}
        </blockquote>
        <div class="flex gap-2">
          <button
            class="flex items-center gap-[5px] px-3 py-1.5 rounded-[7px] text-xs font-medium
                   cursor-pointer border-0 bg-[#7c6af5] text-white font-[inherit]
                   transition-all hover:bg-[#6c5ce7]"
            @click="$emit('request-explain', pendingText)"
            data-testid="explanation-panel-explain-btn"
          >
            <Sparkles :size="13" />
            Explain with AI
          </button>
          <button
            class="flex items-center gap-[5px] px-3 py-1.5 rounded-[7px] text-xs font-medium
                   cursor-pointer border border-[#e8e4dc] bg-white text-gray-700 font-[inherit]
                   transition-all hover:bg-gray-50 hover:border-gray-300"
            @click="$emit('clear-pending')"
            data-testid="explanation-panel-clear-btn"
          >
            <X :size="13" />
            Clear
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center gap-3 px-5 py-10
               text-gray-400 text-[13px] text-center flex-1"
        data-testid="explanation-panel-loading"
      >
        <a-spin size="small" />
        <span>Loading...</span>
      </div>

      <!-- Empty -->
      <div
        v-else-if="explanations.length === 0 && !pendingText"
        class="flex flex-col items-center justify-center gap-3 px-5 py-10
               text-gray-400 text-[13px] text-center flex-1"
        data-testid="explanation-panel-empty"
      >
        <BookOpen :size="32" class="text-gray-300" />
        <p>Select text in the article to get AI explanations.</p>
      </div>

      <!-- List -->
      <div
        v-else
        class="py-3 px-4 flex flex-col gap-3"
        data-testid="explanation-panel-list"
      >
        <div
          v-for="exp in explanations"
          :key="exp.id"
          class="bg-white border border-[#e8e4dc] rounded-[10px] p-[14px]
                 transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          :data-testid="`explanation-panel-card-${exp.id}`"
        >
          <!-- Quote -->
          <div
            class="text-xs text-gray-500 italic mb-2 leading-[1.4]"
            :data-testid="`explanation-panel-card-quote-${exp.id}`"
          >
            <span class="text-lg text-[#7c6af5] leading-none align-[-4px] mr-0.5">"</span>
            {{ truncate(exp.textRange?.text ?? '', 80) }}
          </div>

          <!-- Content -->
          <div
            v-if="exp.content"
            class="text-[13px] text-gray-700 leading-[1.6]"
            :data-testid="`explanation-panel-card-content-${exp.id}`"
          >
            {{ exp.content }}
          </div>

          <!-- Pending -->
          <div
            v-else
            class="flex items-center gap-2 text-xs text-gray-400"
            :data-testid="`explanation-panel-card-pending-${exp.id}`"
          >
            <a-spin size="small" />
            <span>Generating explanation…</span>
          </div>

          <!-- Meta -->
          <div
            class="text-[11px] text-[#c4bfb5] mt-2"
            :data-testid="`explanation-panel-card-meta-${exp.id}`"
          >
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
  textRange?: { text?: string; [key: string]: any } | null;
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