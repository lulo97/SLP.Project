<template>
  <div
    class="min-h-screen bg-[#f7f5f0] flex flex-col transition-[padding-right] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
    :class="{ 'md:pr-[320px]': panelOpen }"
    data-testid="source-detail-page"
  >

    <!-- ── Progress bar ──────────────────────────────────────────────── -->
    <div
      class="fixed top-0 left-0 right-0 h-[3px] bg-black/[0.06] z-[300]"
      data-testid="reading-progress-bar-track"
    >
      <div
        class="h-full bg-gradient-to-r from-[#7c6af5] to-[#a78bfa] transition-all duration-[400ms] ease-linear rounded-r-[2px]"
        :style="{ width: readPercent + '%' }"
        data-testid="reading-progress-bar-fill"
      />
    </div>

    <!-- ── Header ───────────────────────────────────────────────────── -->
    <header
      class="sticky top-0 z-[100] bg-[rgba(247,245,240,0.92)] backdrop-blur-[12px] border-b border-black/[0.07]"
      data-testid="source-detail-header"
    >
      <div class="max-w-[760px] mx-auto px-6 h-[52px] flex items-center justify-between gap-4">

        <button
          class="flex items-center gap-1.5 bg-transparent border-0 cursor-pointer text-[13px]
                 font-medium text-gray-500 py-1.5 pr-2.5 pl-1.5 rounded-[7px]
                 transition-all duration-150 hover:text-[#1a1a2e] hover:bg-black/[0.05]
                 font-[inherit] whitespace-nowrap"
          @click="router.push('/source')"
          data-testid="source-detail-back-btn"
        >
          <ArrowLeft :size="18" />
          <span class="hidden sm:inline">Sources</span>
        </button>

        <div class="flex-1 flex justify-center">
          <span
            v-if="source"
            class="text-[11px] font-semibold tracking-[0.06em] uppercase py-[3px] px-2.5
                   rounded-full bg-[#ede9fe] text-[#7c6af5]"
            :data-type="source.type"
            data-testid="source-detail-type-badge"
          >
            {{ typeLabel }}
          </span>
        </div>

        <div class="flex items-center gap-1">
          <a-tooltip title="Resume reading">
            <button
              v-if="savedScrollPosition > 100"
              class="relative flex items-center gap-[5px] px-3 py-1.5 border-0 rounded-lg cursor-pointer
                     text-xs font-medium text-[#059669] bg-[rgba(5,150,105,0.08)] font-[inherit]
                     whitespace-nowrap transition-all duration-150 hover:bg-[rgba(5,150,105,0.15)]"
              @click="resumeReading"
              data-testid="source-detail-resume-btn"
            >
              <Navigation :size="15" />
              <span class="hidden sm:inline">Resume</span>
            </button>
          </a-tooltip>

          <a-tooltip title="Explanations">
            <button
              class="relative flex items-center gap-[5px] px-3 py-1.5 border-0 bg-transparent
                     rounded-lg cursor-pointer text-xs font-medium text-gray-500 font-[inherit]
                     whitespace-nowrap transition-all duration-150
                     hover:bg-[rgba(124,106,245,0.1)] hover:text-[#7c6af5]"
              :class="{ 'bg-[rgba(124,106,245,0.1)] !text-[#7c6af5]': panelOpen }"
              @click="panelOpen = !panelOpen"
              data-testid="source-detail-explanations-toggle-btn"
            >
              <Sparkles :size="16" />
              <span
                v-if="explanations.length"
                class="absolute top-0.5 right-1 bg-[#7c6af5] text-white text-[9px] font-bold
                       min-w-[14px] h-[14px] rounded-[7px] flex items-center justify-center px-[3px]"
                data-testid="source-detail-explanations-badge"
              >{{ explanations.length }}</span>
            </button>
          </a-tooltip>

          <a-tooltip title="Font size">
            <button
              class="relative flex items-center gap-[5px] px-3 py-1.5 border-0 bg-transparent
                     rounded-lg cursor-pointer text-xs font-medium text-gray-500 font-[inherit]
                     whitespace-nowrap transition-all duration-150
                     hover:bg-[rgba(124,106,245,0.1)] hover:text-[#7c6af5]"
              @click="cycleFontSize"
              data-testid="source-detail-font-size-btn"
            >
              <Type :size="16" />
            </button>
          </a-tooltip>
        </div>
      </div>
    </header>

    <!-- ── Main scroll area ──────────────────────────────────────────── -->
    <main
      class="flex-1 overflow-y-auto px-6 pt-10 pb-[120px]"
      ref="scrollContainer"
      @scroll="onScroll"
      data-testid="source-detail-main"
    >

      <!-- Loading skeleton -->
      <div v-if="loading" class="max-w-[680px] mx-auto" data-testid="source-detail-loading">
        <div class="skeleton-shimmer mb-4" style="height:36px; width:75%" />
        <div class="skeleton-shimmer" style="height:14px; width:40%; margin-bottom:32px" />
        <div class="flex flex-col gap-2">
          <div
            v-for="i in 8"
            :key="i"
            class="skeleton-shimmer"
            style="height:16px"
            :style="{ width: skeletonWidths[i % skeletonWidths.length] }"
          />
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="max-w-[680px] mx-auto flex flex-col items-center justify-center gap-4 py-20 px-5 text-gray-400 text-center"
        data-testid="source-detail-error"
      >
        <AlertCircle :size="40" />
        <p data-testid="source-detail-error-message">{{ error }}</p>
        <button
          class="px-6 py-2 bg-[#7c6af5] text-white border-0 rounded-lg cursor-pointer
                 text-sm font-[inherit] transition-colors hover:bg-[#6c5ce7]"
          @click="loadSource"
          data-testid="source-detail-retry-btn"
        >Try again</button>
      </div>

      <!-- Article -->
      <article
        v-else-if="source"
        class="max-w-[680px] mx-auto"
        ref="articleRef"
        data-testid="source-detail-article"
      >

        <!-- Article header -->
        <header
          class="mb-10 pb-8 border-b border-[#e8e4dc]"
          data-testid="source-detail-article-header"
        >
          <div class="flex items-center gap-2.5 mb-4">
            <span
              class="text-[10px] font-bold tracking-[0.1em] uppercase py-[3px] px-[9px]
                     rounded bg-[#ede9fe] text-[#7c6af5]"
              :data-type="source.type"
              data-testid="source-detail-article-type"
            >{{ typeLabel }}</span>
            <span
              class="text-[13px] text-gray-400"
              data-testid="source-detail-article-date"
            >{{ formatDate(source.createdAt) }}</span>
          </div>

          <h1
            class="text-[clamp(26px,4vw,36px)] font-bold leading-[1.25] text-[#1a1a2e]
                   tracking-[-0.03em] mt-0 mb-[14px]"
            data-testid="source-detail-article-title"
          >{{ source.title }}</h1>

          <div
            v-if="source.url"
            class="flex items-center gap-1.5 mb-3"
            data-testid="source-detail-article-url"
          >
            <Link2 :size="13" class="text-gray-400 shrink-0" />
            <a
              :href="source.url"
              target="_blank"
              rel="noopener"
              class="text-xs text-[#7c6af5] no-underline break-all hover:underline"
              data-testid="source-detail-article-url-link"
            >{{ source.url }}</a>
          </div>

          <div
            class="text-xs text-gray-400 flex flex-wrap gap-x-0"
            data-testid="source-detail-article-stats"
          >
            <span v-if="wordCount" data-testid="source-detail-word-count">
              {{ wordCount.toLocaleString() }} words
            </span>
            <span v-if="readTime" data-testid="source-detail-read-time">
              &nbsp;· {{ readTime }} min read
            </span>
            <span
              v-if="readPercent > 0"
              class="text-[#7c6af5] font-medium"
              data-testid="source-detail-read-percent"
            >&nbsp;· {{ Math.round(readPercent) }}% read</span>
          </div>
        </header>

        <!-- Resume toast -->
        <Transition name="resume-toast">
          <div
            v-if="showResumeToast"
            class="flex items-center gap-2.5 bg-[#1a1a2e] text-white text-[13px] font-medium
                   px-4 py-3 rounded-[10px] mb-8 cursor-pointer
                   shadow-[0_4px_16px_rgba(26,26,46,0.15)] transition-colors hover:bg-[#16213e]"
            @click="resumeReading"
            data-testid="source-detail-resume-toast"
          >
            <Navigation :size="14" />
            <span>Resume from where you left off</span>
            <button
              class="ml-auto bg-transparent border-0 text-white/50 cursor-pointer p-[2px]
                     flex transition-colors hover:text-white"
              @click.stop="showResumeToast = false"
              data-testid="source-detail-resume-toast-dismiss-btn"
            >
              <X :size="12" />
            </button>
          </div>
        </Transition>

        <!-- Body: TipTap JSON (article-body class needed for :deep CSS selectors) -->
        <div
          v-if="source.contentJson"
          class="article-body leading-[1.82] text-[#2d2926] font-serif"
          :class="fontSizeClass"
          ref="contentRef"
          v-html="renderedContent"
          data-testid="source-detail-content-rich"
        />

        <!-- Body: plain text -->
        <div
          v-else-if="source.rawText"
          class="article-body leading-[1.82] text-[#2d2926] font-serif"
          :class="fontSizeClass"
          ref="contentRef"
          data-testid="source-detail-content-plain"
        >
          <p
            v-for="(para, i) in paragraphs"
            :key="i"
            class="mb-[1.4em]"
          >{{ para }}</p>
        </div>

        <!-- No content -->
        <div
          v-else
          class="flex flex-col items-center gap-3 py-[60px] px-5 text-[#c4bfb5] text-center"
          data-testid="source-detail-no-content"
        >
          <FileText :size="36" />
          <p>No readable content available for this source.</p>
        </div>

        <!-- End of article -->
        <div
          v-if="source.rawText || source.contentJson"
          class="flex items-center gap-4 mt-[60px] text-[#c4bfb5] text-xs tracking-[0.06em] uppercase"
          data-testid="source-detail-article-end"
        >
          <div class="flex-1 h-px bg-[#e8e4dc]" />
          <span>End of source</span>
          <div class="flex-1 h-px bg-[#e8e4dc]" />
        </div>

      </article>
    </main>

    <!-- ── Selection Bubble ──────────────────────────────────────────── -->
    <SelectionBubble
      :container-ref="contentRef"
      @explain="handleExplain"
      @grammar="handleGrammar"
      @tts="handleTts"
      @favorite="handleFavorite"
    />

    <!-- ── Explanation panel ─────────────────────────────────────────── -->
    <ExplanationPanel
      :is-open="panelOpen"
      :pending-text="pendingExplainText"
      :explanations="explanations"
      :loading="explanationsLoading"
      @close="panelOpen = false"
      @request-explain="submitExplanation"
      @clear-pending="pendingExplainText = ''"
    />

    <!-- ── Favorite modal ────────────────────────────────────────────── -->
    <a-modal
      v-model:open="favoriteModalOpen"
      title="Save to Favorites"
      ok-text="Save"
      :confirm-loading="savingFavorite"
      @ok="submitFavorite"
      @cancel="favoriteModalOpen = false"
      data-testid="source-detail-favorite-modal"
    >
      <div class="flex flex-col gap-1.5">
        <div class="text-xs font-semibold text-gray-500">Selected text</div>
        <a-textarea
          v-model:value="favoriteText"
          :rows="3"
          placeholder="Your selected text…"
          data-testid="source-detail-favorite-text-input"
        />
        <div class="text-xs font-semibold text-gray-500 mt-3">Type</div>
        <a-radio-group
          v-model:value="favoriteType"
          button-style="solid"
          size="small"
          data-testid="source-detail-favorite-type-group"
        >
          <a-radio-button value="word"   data-testid="source-detail-favorite-type-word">Word</a-radio-button>
          <a-radio-button value="phrase" data-testid="source-detail-favorite-type-phrase">Phrase</a-radio-button>
          <a-radio-button value="idiom"  data-testid="source-detail-favorite-type-idiom">Idiom</a-radio-button>
          <a-radio-button value="other"  data-testid="source-detail-favorite-type-other">Other</a-radio-button>
        </a-radio-group>
        <div class="text-xs font-semibold text-gray-500 mt-3">Note (optional)</div>
        <a-input
          v-model:value="favoriteNote"
          placeholder="Add a personal note…"
          data-testid="source-detail-favorite-note-input"
        />
      </div>
    </a-modal>

    <!-- ── Notification ──────────────────────────────────────────────── -->
    <Transition name="notif">
      <div
        v-if="notification"
        class="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2
               px-[18px] py-2.5 rounded-[24px] text-[13px] font-medium
               z-[9000] whitespace-nowrap shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
        :class="{
          'bg-[#059669] text-white': notification.type === 'success',
          'bg-[#1a1a2e] text-white': notification.type === 'info',
          'bg-[#dc2626] text-white': notification.type === 'error',
        }"
        data-testid="source-detail-notification"
        :data-notif-type="notification.type"
      >
        <component :is="notification.icon" :size="14" />
        {{ notification.message }}
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft, Sparkles, Type, Navigation, X, Link2,
  FileText, AlertCircle, Volume2, SpellCheck, Bookmark,
} from "lucide-vue-next";
import { useSourceStore } from "@/features/source/stores/sourceStore";
import SelectionBubble from "@/features/source/components/SelectionBubble.vue";
import ExplanationPanel from "@/features/source/components/ExplanationPanel.vue";
import type { ExplanationItem } from "@/features/source/components/ExplanationPanel.vue";
import apiClient from "@/lib/api/client";

// ── Router / store ────────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const sourceStore = useSourceStore();
const sourceId = computed(() => Number(route.params.id));

// ── Refs ──────────────────────────────────────────────────────────────────────
const scrollContainer = ref<HTMLElement | null>(null);
const articleRef      = ref<HTMLElement | null>(null);
const contentRef      = ref<HTMLElement | null>(null);

// ── State ─────────────────────────────────────────────────────────────────────
const loading   = ref(true);
const error     = ref<string | null>(null);
const source    = computed(() => sourceStore.currentSource);

const readPercent          = ref(0);
const savedScrollPosition  = ref(0);
const showResumeToast      = ref(false);

const panelOpen            = ref(false);
const pendingExplainText   = ref("");
const explanations         = ref<ExplanationItem[]>([]);
const explanationsLoading  = ref(false);

const favoriteModalOpen = ref(false);
const favoriteText      = ref("");
const favoriteNote      = ref("");
const favoriteType      = ref<"word" | "phrase" | "idiom" | "other">("word");
const savingFavorite    = ref(false);

// 0 = text-sm (14px), 1 = text-base (16px), 2 = text-lg (18px) — standard Tailwind
const fontSizeIndex = ref(1);
const fontSizes     = ["text-sm", "text-base", "text-lg"];

const notification = ref<{ message: string; type: string; icon: any } | null>(null);
let notifTimer: ReturnType<typeof setTimeout> | null = null;

const skeletonWidths = ["100%", "94%", "100%", "87%", "96%", "100%", "78%", "100%"];

// ── Computed ──────────────────────────────────────────────────────────────────
const typeLabel = computed(() => {
  const map: Record<string, string> = {
    pdf: "PDF", txt: "Text", link: "URL", note: "Note", url: "URL", unknown: "File",
  };
  return map[source.value?.type ?? ""] ?? (source.value?.type ?? "").toUpperCase();
});

const paragraphs = computed(() =>
  (source.value?.rawText ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
);

const wordCount = computed(() => {
  const t = source.value?.rawText?.trim() ?? "";
  return t ? t.split(/\s+/).length : 0;
});

const readTime      = computed(() => wordCount.value ? Math.ceil(wordCount.value / 200) : 0);
const fontSizeClass = computed(() => fontSizes[fontSizeIndex.value]);

const renderedContent = computed(() => {
  if (!source.value?.contentJson) return "";
  try { return renderNode(JSON.parse(source.value.contentJson)); }
  catch { return `<p>${source.value.contentJson}</p>`; }
});

function renderNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") {
    let text = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold")      text = `<strong>${text}</strong>`;
      else if (mark.type === "italic")    text = `<em>${text}</em>`;
      else if (mark.type === "underline") text = `<u>${text}</u>`;
      else if (mark.type === "code")      text = `<code>${text}</code>`;
      else if (mark.type === "link")      text = `<a href="${mark.attrs?.href}" target="_blank">${text}</a>`;
    }
    return text;
  }
  const children = (node.content ?? []).map(renderNode).join("");
  switch (node.type) {
    case "doc":           return children;
    case "paragraph":     return `<p>${children || "<br>"}</p>`;
    case "heading":       return `<h${node.attrs?.level ?? 2}>${children}</h${node.attrs?.level ?? 2}>`;
    case "bulletList":    return `<ul>${children}</ul>`;
    case "orderedList":   return `<ol>${children}</ol>`;
    case "listItem":      return `<li>${children}</li>`;
    case "blockquote":    return `<blockquote>${children}</blockquote>`;
    case "codeBlock":     return `<pre><code>${children}</code></pre>`;
    case "hardBreak":     return "<br>";
    case "horizontalRule":return "<hr>";
    default:              return children;
  }
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadSource() {
  loading.value = true;
  error.value   = null;
  try {
    await sourceStore.fetchSource(sourceId.value);
    await loadProgress();
    await loadExplanations();
  } catch {
    error.value = "Could not load this source.";
  } finally {
    loading.value = false;
  }
}

async function loadProgress() {
  const progress = await sourceStore.fetchProgress(sourceId.value);
  if (progress && progress.scrollPosition > 100) {
    savedScrollPosition.value = progress.scrollPosition;
    readPercent.value          = progress.percentComplete;
    showResumeToast.value      = true;
  }
}

async function loadExplanations() {
  explanationsLoading.value = true;
  try {
    const res = await apiClient.get<ExplanationItem[]>(`/sources/${sourceId.value}/explanations`);
    explanations.value = res.data;
  } catch { /* no explanations yet */ }
  finally { explanationsLoading.value = false; }
}

// ── Scroll tracking ───────────────────────────────────────────────────────────
let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null;

function onScroll() {
  const el = scrollContainer.value;
  if (!el) return;
  const scrollTop    = el.scrollTop;
  const scrollHeight = el.scrollHeight - el.clientHeight;
  readPercent.value  = Math.min(100, scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);

  if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
  scrollSaveTimer = setTimeout(() => {
    sourceStore.updateProgress(sourceId.value, {
      scrollPosition:  Math.round(scrollTop),
      percentComplete: Math.round(readPercent.value),
    });
    savedScrollPosition.value = Math.round(scrollTop);
  }, 800);
}

function resumeReading() {
  showResumeToast.value = false;
  nextTick(() => {
    scrollContainer.value?.scrollTo({ top: savedScrollPosition.value, behavior: "smooth" });
  });
}

// ── Font size ─────────────────────────────────────────────────────────────────
function cycleFontSize() {
  fontSizeIndex.value = (fontSizeIndex.value + 1) % fontSizes.length;
  showNotif("Font size changed", "info", Type);
}

// ── Selection actions ─────────────────────────────────────────────────────────
function handleExplain(text: string) {
  pendingExplainText.value = text;
  panelOpen.value          = true;
  window.getSelection()?.removeAllRanges();
}

async function submitExplanation(text: string) {
  pendingExplainText.value = "";
  const placeholder: ExplanationItem = {
    id: Date.now(), sourceId: sourceId.value,
    textRange: { text }, content: "",
    authorType: "user", editable: true,
    createdAt: new Date().toISOString(),
  };
  explanations.value.unshift(placeholder);
  try {
    const res = await apiClient.post<ExplanationItem>("/explanations", {
      sourceId: sourceId.value, textRange: { text }, content: "",
    });
    const idx = explanations.value.findIndex((e) => e.id === placeholder.id);
    if (idx !== -1) explanations.value[idx] = res.data;
  } catch {
    const idx = explanations.value.findIndex((e) => e.id === placeholder.id);
    if (idx !== -1)
      explanations.value[idx] = { ...placeholder, content: "[Explanation unavailable — LLM queued]" };
  }
}

async function handleGrammar(text: string) {
  window.getSelection()?.removeAllRanges();
  showNotif("Grammar check queued", "info", SpellCheck);
  try { await apiClient.post("/llm/grammar", { text, sourceId: sourceId.value }); } catch {}
}

async function handleTts(text: string) {
  window.getSelection()?.removeAllRanges();
  showNotif("Text-to-speech queued", "info", Volume2);
  try { await apiClient.post("/llm/tts", { text, sourceId: sourceId.value }); } catch {}
}

function handleFavorite(text: string) {
  favoriteText.value  = text;
  favoriteNote.value  = "";
  favoriteType.value  = "word";
  favoriteModalOpen.value = true;
  window.getSelection()?.removeAllRanges();
}

async function submitFavorite() {
  savingFavorite.value = true;
  try {
    await apiClient.post("/favorites", {
      text: favoriteText.value,
      type: favoriteType.value,
      note: favoriteNote.value.trim() || undefined,
    });
    favoriteModalOpen.value = false;
    showNotif("Saved to favorites", "success", Bookmark);
  } catch {
    showNotif("Failed to save", "error", X);
  } finally {
    savingFavorite.value = false;
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
function showNotif(message: string, type: string, icon: any) {
  notification.value = { message, type, icon };
  if (notifTimer) clearTimeout(notifTimer);
  notifTimer = setTimeout(() => (notification.value = null), 2800);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => loadSource());

onUnmounted(() => {
  if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
  if (notifTimer)      clearTimeout(notifTimer);
  if (scrollContainer.value) {
    const el = scrollContainer.value;
    const sh = el.scrollHeight - el.clientHeight;
    sourceStore.updateProgress(sourceId.value, {
      scrollPosition:  Math.round(el.scrollTop),
      percentComplete: sh > 0 ? Math.round((el.scrollTop / sh) * 100) : 0,
    });
  }
});
</script>

<style scoped>
/*
 * Only rules that CANNOT be expressed in Tailwind are kept here:
 *   1. @keyframes (shimmer, slideDown/Up, notifIn/Out)
 *   2. .article-body :deep(*) — v-html / TipTap rendered content
 *   3. .article-body ::selection
 */

/* ── Shimmer skeleton ─────────────────────────────────────────────────── */
@keyframes shimmer {
  from { background-position: -600px 0; }
  to   { background-position:  600px 0; }
}
.skeleton-shimmer {
  background: linear-gradient(90deg, #e8e4dc 25%, #f0ece3 50%, #e8e4dc 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 6px;
}

/* ── Rich text body (v-html output) ──────────────────────────────────── */
.article-body ::selection { background: #c4b5fd; }

.article-body :deep(p) { margin-bottom: 1.4em; }

.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3),
.article-body :deep(h4) {
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #1a1a2e;
  margin: 1.8em 0 0.6em;
}
.article-body :deep(h2) { font-size: 1.4em; }
.article-body :deep(h3) { font-size: 1.2em; }

.article-body :deep(blockquote) {
  border-left: 3px solid #7c6af5;
  padding-left: 18px;
  margin: 1.6em 0;
  color: #6b7280;
  font-style: italic;
}

.article-body :deep(code) {
  font-family: 'Courier New', monospace;
  font-size: 0.88em;
  background: #f3f0ea;
  padding: 1px 5px;
  border-radius: 3px;
  color: #d63384;
}

.article-body :deep(pre) {
  background: #1a1a2e;
  color: #e2e8f0;
  padding: 20px;
  border-radius: 10px;
  overflow-x: auto;
  font-size: 0.85em;
  margin: 1.6em 0;
}
.article-body :deep(pre code) { background: none; color: inherit; padding: 0; }

.article-body :deep(ul),
.article-body :deep(ol) { padding-left: 1.6em; margin-bottom: 1.4em; }
.article-body :deep(li) { margin-bottom: 0.4em; }

.article-body :deep(a) {
  color: #7c6af5;
  text-decoration: underline;
  text-decoration-color: rgba(124, 106, 245, 0.3);
}

.article-body :deep(hr) {
  border: none;
  border-top: 1px solid #e8e4dc;
  margin: 2em 0;
}

/* ── Transition animations ────────────────────────────────────────────── */
.resume-toast-enter-active { animation: slideDown 0.25s ease; }
.resume-toast-leave-active { animation: slideUp   0.2s  ease forwards; }

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  to   { opacity: 0; transform: translateY(-6px); }
}

.notif-enter-active { animation: notifIn  0.22s ease; }
.notif-leave-active { animation: notifOut 0.18s ease forwards; }

@keyframes notifIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes notifOut {
  to   { opacity: 0; transform: translateX(-50%) translateY(8px); }
}
</style>