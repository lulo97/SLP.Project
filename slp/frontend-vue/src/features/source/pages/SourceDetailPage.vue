<template>
  <div class="reading-shell" :class="{ 'panel-open': panelOpen }">

    <!-- ── Top progress bar ─────────────────────────────────────────── -->
    <div class="reading-progressbar">
      <div class="reading-progressbar__fill" :style="{ width: readPercent + '%' }" />
    </div>

    <!-- ── Header ───────────────────────────────────────────────────── -->
    <header class="reading-header">
      <div class="reading-header__inner">
        <button class="header-back" @click="router.push('/source')">
          <ArrowLeft :size="18" />
          <span>Sources</span>
        </button>

        <div class="header-center">
          <span v-if="source" class="header-type-badge" :data-type="source.type">
            {{ typeLabel }}
          </span>
        </div>

        <div class="header-actions">
          <a-tooltip title="Resume reading">
            <button
              v-if="savedScrollPosition > 100"
              class="header-btn header-btn--resume"
              @click="resumeReading"
            >
              <Navigation :size="15" />
              <span>Resume</span>
            </button>
          </a-tooltip>

          <a-tooltip title="Explanations">
            <button
              class="header-btn"
              :class="{ active: panelOpen }"
              @click="panelOpen = !panelOpen"
            >
              <Sparkles :size="16" />
              <span v-if="explanations.length" class="badge">{{ explanations.length }}</span>
            </button>
          </a-tooltip>

          <a-tooltip title="Font size">
            <button class="header-btn" @click="cycleFontSize">
              <Type :size="16" />
            </button>
          </a-tooltip>
        </div>
      </div>
    </header>

    <!-- ── Content ──────────────────────────────────────────────────── -->
    <main class="reading-main" ref="scrollContainer" @scroll="onScroll">

      <!-- Loading skeleton -->
      <div v-if="loading" class="reading-container">
        <div class="skeleton-title" />
        <div class="skeleton-meta" />
        <div class="skeleton-body">
          <div v-for="i in 8" :key="i" class="skeleton-line" :style="{ width: skeletonWidths[i % skeletonWidths.length] }" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="reading-container reading-error">
        <AlertCircle :size="40" />
        <p>{{ error }}</p>
        <button class="btn-retry" @click="loadSource">Try again</button>
      </div>

      <!-- Actual content -->
      <article v-else-if="source" class="reading-container" ref="articleRef">

        <!-- Article header -->
        <header class="article-header">
          <div class="article-meta">
            <span class="article-type-tag" :data-type="source.type">{{ typeLabel }}</span>
            <span class="article-date">{{ formatDate(source.createdAt) }}</span>
          </div>
          <h1 class="article-title">{{ source.title }}</h1>
          <div v-if="source.url" class="article-url">
            <Link2 :size="13" />
            <a :href="source.url" target="_blank" rel="noopener">{{ source.url }}</a>
          </div>
          <div class="article-stats">
            <span v-if="wordCount">{{ wordCount.toLocaleString() }} words</span>
            <span v-if="readTime">· {{ readTime }} min read</span>
            <span v-if="readPercent > 0" class="read-progress-label">
              · {{ Math.round(readPercent) }}% read
            </span>
          </div>
        </header>

        <!-- Resume toast (inline) -->
        <Transition name="resume-toast">
          <div v-if="showResumeToast" class="resume-toast" @click="resumeReading">
            <Navigation :size="14" />
            <span>Resume from where you left off</span>
            <button class="resume-dismiss" @click.stop="showResumeToast = false">
              <X :size="12" />
            </button>
          </div>
        </Transition>

        <!-- Body: TipTap JSON -->
        <div
          v-if="source.contentJson"
          class="article-body"
          :class="fontSizeClass"
          ref="contentRef"
          v-html="renderedContent"
        />

        <!-- Body: raw text -->
        <div
          v-else-if="source.rawText"
          class="article-body article-body--plain"
          :class="fontSizeClass"
          ref="contentRef"
        >
          <p v-for="(para, i) in paragraphs" :key="i" class="article-para">{{ para }}</p>
        </div>

        <!-- No content -->
        <div v-else class="article-empty">
          <FileText :size="36" />
          <p>No readable content available for this source.</p>
        </div>

        <!-- End of article -->
        <div v-if="source.rawText || source.contentJson" class="article-end">
          <div class="article-end__line" />
          <span>End of source</span>
          <div class="article-end__line" />
        </div>

      </article>
    </main>

    <!-- ── Selection Bubble ─────────────────────────────────────────── -->
    <SelectionBubble
      :container-ref="contentRef"
      @explain="handleExplain"
      @grammar="handleGrammar"
      @tts="handleTts"
      @favorite="handleFavorite"
    />

    <!-- ── Explanation panel ────────────────────────────────────────── -->
    <ExplanationPanel
      :is-open="panelOpen"
      :pending-text="pendingExplainText"
      :explanations="explanations"
      :loading="explanationsLoading"
      @close="panelOpen = false"
      @request-explain="submitExplanation"
      @clear-pending="pendingExplainText = ''"
    />

    <!-- ── Favorite modal ───────────────────────────────────────────── -->
    <a-modal
      v-model:open="favoriteModalOpen"
      title="Save to Favorites"
      ok-text="Save"
      :confirm-loading="savingFavorite"
      @ok="submitFavorite"
      @cancel="favoriteModalOpen = false"
    >
      <div class="fav-modal-body">
        <div class="fav-modal-label">Selected text</div>
        <a-textarea
          v-model:value="favoriteText"
          :rows="3"
          placeholder="Your selected text…"
        />
        <div class="fav-modal-label" style="margin-top: 12px;">Type</div>
        <a-radio-group v-model:value="favoriteType" button-style="solid" size="small">
          <a-radio-button value="word">Word</a-radio-button>
          <a-radio-button value="phrase">Phrase</a-radio-button>
          <a-radio-button value="idiom">Idiom</a-radio-button>
          <a-radio-button value="other">Other</a-radio-button>
        </a-radio-group>
        <div class="fav-modal-label" style="margin-top: 12px;">Note (optional)</div>
        <a-input v-model:value="favoriteNote" placeholder="Add a personal note…" />
      </div>
    </a-modal>

    <!-- ── Notification toasts ──────────────────────────────────────── -->
    <Transition name="notif">
      <div v-if="notification" class="action-notif" :class="`action-notif--${notification.type}`">
        <component :is="notification.icon" :size="14" />
        {{ notification.message }}
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, h } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft, Sparkles, Type, Navigation, X, Link2,
  FileText, AlertCircle, Volume2, SpellCheck, Check, Bookmark,
} from "lucide-vue-next";
import { useSourceStore } from "@/features/source/stores/sourceStore";
import SelectionBubble from "@/features/source/components/SelectionBubble.vue";
import ExplanationPanel from "@/features/source/components/ExplanationPanel.vue";
import type { ExplanationItem } from "@/features/source/components/ExplanationPanel.vue";
import apiClient from "@/lib/api/client";

// ── Router / store ───────────────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const sourceStore = useSourceStore();

const sourceId = computed(() => Number(route.params.id));

// ── Refs ──────────────────────────────────────────────────────────────────────
const scrollContainer = ref<HTMLElement | null>(null);
const articleRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

// ── State ─────────────────────────────────────────────────────────────────────
const loading = ref(true);
const error = ref<string | null>(null);
const source = computed(() => sourceStore.currentSource);

const readPercent = ref(0);
const savedScrollPosition = ref(0);
const showResumeToast = ref(false);

const panelOpen = ref(false);
const pendingExplainText = ref("");
const explanations = ref<ExplanationItem[]>([]);
const explanationsLoading = ref(false);

const favoriteModalOpen = ref(false);
const favoriteText = ref("");
const favoriteNote = ref("");
const favoriteType = ref<"word" | "phrase" | "idiom" | "other">("word");
const savingFavorite = ref(false);

const fontSizeIndex = ref(1); // 0=sm, 1=md, 2=lg
const fontSizes = ["text-sm", "text-base", "text-lg"];

const notification = ref<{ message: string; type: string; icon: any } | null>(null);
let notifTimer: ReturnType<typeof setTimeout> | null = null;

// ── Skeleton ──────────────────────────────────────────────────────────────────
const skeletonWidths = ["100%", "94%", "100%", "87%", "96%", "100%", "78%", "100%"];

// ── Computed ──────────────────────────────────────────────────────────────────
const typeLabel = computed(() => {
  const t = source.value?.type ?? "";
  const map: Record<string, string> = {
    pdf: "PDF", txt: "Text", link: "URL", note: "Note",
    url: "URL", unknown: "File",
  };
  return map[t] ?? t.toUpperCase();
});

const paragraphs = computed(() => {
  if (!source.value?.rawText) return [];
  return source.value.rawText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
});

const wordCount = computed(() => {
  const text = source.value?.rawText ?? "";
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
});

const readTime = computed(() => {
  return wordCount.value ? Math.ceil(wordCount.value / 200) : 0;
});

const fontSizeClass = computed(() => fontSizes[fontSizeIndex.value]);

// Render TipTap-like contentJson to HTML (simple recursive renderer)
const renderedContent = computed(() => {
  if (!source.value?.contentJson) return "";
  try {
    const doc = JSON.parse(source.value.contentJson);
    return renderNode(doc);
  } catch {
    return `<p>${source.value.contentJson}</p>`;
  }
});

function renderNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") {
    let text = node.text ?? "";
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        else if (mark.type === "italic") text = `<em>${text}</em>`;
        else if (mark.type === "underline") text = `<u>${text}</u>`;
        else if (mark.type === "code") text = `<code>${text}</code>`;
        else if (mark.type === "link") text = `<a href="${mark.attrs?.href}" target="_blank">${text}</a>`;
      }
    }
    return text;
  }
  const children = (node.content ?? []).map(renderNode).join("");
  switch (node.type) {
    case "doc": return children;
    case "paragraph": return `<p>${children || "<br>"}</p>`;
    case "heading": return `<h${node.attrs?.level ?? 2}>${children}</h${node.attrs?.level ?? 2}>`;
    case "bulletList": return `<ul>${children}</ul>`;
    case "orderedList": return `<ol>${children}</ol>`;
    case "listItem": return `<li>${children}</li>`;
    case "blockquote": return `<blockquote>${children}</blockquote>`;
    case "codeBlock": return `<pre><code>${children}</code></pre>`;
    case "hardBreak": return "<br>";
    case "horizontalRule": return "<hr>";
    default: return children;
  }
}

// ── Load data ─────────────────────────────────────────────────────────────────
async function loadSource() {
  loading.value = true;
  error.value = null;
  try {
    await sourceStore.fetchSource(sourceId.value);
    await loadProgress();
    await loadExplanations();
  } catch (e: any) {
    error.value = "Could not load this source.";
  } finally {
    loading.value = false;
  }
}

async function loadProgress() {
  const progress = await sourceStore.fetchProgress(sourceId.value);
  if (progress && progress.scrollPosition > 100) {
    savedScrollPosition.value = progress.scrollPosition;
    readPercent.value = progress.percentComplete;
    showResumeToast.value = true;
  }
}

async function loadExplanations() {
  explanationsLoading.value = true;
  try {
    // Backend route: GET /api/sources/{sourceId}/explanations (plural "sources")
    const res = await apiClient.get<ExplanationItem[]>(`/sources/${sourceId.value}/explanations`);
    explanations.value = res.data;
  } catch {
    // Source may have no explanations yet — not an error
  } finally {
    explanationsLoading.value = false;
  }
}

// ── Scroll tracking ───────────────────────────────────────────────────────────
let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null;

function onScroll() {
  const el = scrollContainer.value;
  if (!el) return;

  const scrollTop = el.scrollTop;
  const scrollHeight = el.scrollHeight - el.clientHeight;
  const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

  readPercent.value = Math.min(100, percent);

  // Debounce save
  if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
  scrollSaveTimer = setTimeout(() => {
    sourceStore.updateProgress(sourceId.value, {
      scrollPosition: Math.round(scrollTop),
      percentComplete: Math.round(readPercent.value),
    });
    savedScrollPosition.value = Math.round(scrollTop);
  }, 800);
}

function resumeReading() {
  showResumeToast.value = false;
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTo({
        top: savedScrollPosition.value,
        behavior: "smooth",
      });
    }
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
  panelOpen.value = true;
  window.getSelection()?.removeAllRanges();
}

async function submitExplanation(text: string) {
  pendingExplainText.value = "";

  // Optimistic placeholder — matches ExplanationItem (backend DTO shape)
  const placeholder: ExplanationItem = {
    id: Date.now(),                       // temporary local id
    sourceId: sourceId.value,
    textRange: { text },                  // selected text lives in textRange.text
    content: "",                          // empty while LLM is generating
    authorType: "user",
    editable: true,
    createdAt: new Date().toISOString(),
  };
  explanations.value.unshift(placeholder);

  try {
    // Backend route: POST /api/explanations
    // CreateExplanationRequest: { sourceId, textRange, content }
    const res = await apiClient.post<ExplanationItem>("/explanations", {
      sourceId: sourceId.value,
      textRange: { text },  // store selected text as JSON in textRange
      content: "",          // LLM fills this in asynchronously
    });
    // Replace placeholder with the real record returned by the server
    const idx = explanations.value.findIndex((e) => e.id === placeholder.id);
    if (idx !== -1) explanations.value[idx] = res.data;
  } catch {
    // Server error — mark placeholder with a fallback message
    const idx = explanations.value.findIndex((e) => e.id === placeholder.id);
    if (idx !== -1)
      explanations.value[idx] = {
        ...placeholder,
        content: "[Explanation unavailable — LLM queued]",
      };
  }
}

async function handleGrammar(text: string) {
  window.getSelection()?.removeAllRanges();
  showNotif("Grammar check queued", "info", SpellCheck);
  try {
    await apiClient.post("/llm/grammar", { text, sourceId: sourceId.value });
  } catch {
    // queued silently
  }
}

async function handleTts(text: string) {
  window.getSelection()?.removeAllRanges();
  showNotif("Text-to-speech queued", "info", Volume2);
  try {
    await apiClient.post("/llm/tts", { text, sourceId: sourceId.value });
  } catch {
    // queued silently
  }
}

function handleFavorite(text: string) {
  favoriteText.value = text;
  favoriteNote.value = "";
  favoriteType.value = "word";
  favoriteModalOpen.value = true;
  window.getSelection()?.removeAllRanges();
}

async function submitFavorite() {
  savingFavorite.value = true;
  try {
    // Backend: POST /api/favorites — CreateFavoriteRequest: { text, type, note? }
    // No sourceId field exists on the backend DTO.
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
  if (notifTimer) clearTimeout(notifTimer);
  // Final save on unmount
  if (scrollContainer.value) {
    const el = scrollContainer.value;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    sourceStore.updateProgress(sourceId.value, {
      scrollPosition: Math.round(el.scrollTop),
      percentComplete: scrollHeight > 0
        ? Math.round((el.scrollTop / scrollHeight) * 100)
        : 0,
    });
  }
});
</script>

<style scoped>
/* ── Shell ────────────────────────────────────────────────────────────── */
.reading-shell {
  min-height: 100vh;
  background: #f7f5f0;
  display: flex;
  flex-direction: column;
  transition: padding-right 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.reading-shell.panel-open {
  padding-right: 320px;
}

/* ── Progress bar ─────────────────────────────────────────────────────── */
.reading-progressbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.06);
  z-index: 300;
}

.reading-progressbar__fill {
  height: 100%;
  background: linear-gradient(90deg, #7c6af5, #a78bfa);
  transition: width 0.4s ease;
  border-radius: 0 2px 2px 0;
}

/* ── Header ───────────────────────────────────────────────────────────── */
.reading-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(247, 245, 240, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
}

.reading-header__inner {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 24px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  padding: 6px 10px 6px 6px;
  border-radius: 7px;
  transition: color 0.15s, background 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.header-back:hover {
  color: #1a1a2e;
  background: rgba(0, 0, 0, 0.05);
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.header-type-badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 20px;
  background: #ede9fe;
  color: #7c6af5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.header-btn:hover,
.header-btn.active {
  background: rgba(124, 106, 245, 0.1);
  color: #7c6af5;
}

.header-btn--resume {
  color: #059669;
  background: rgba(5, 150, 105, 0.08);
}

.header-btn--resume:hover {
  background: rgba(5, 150, 105, 0.15);
}

.badge {
  position: absolute;
  top: 2px;
  right: 4px;
  background: #7c6af5;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

/* ── Main scroll area ─────────────────────────────────────────────────── */
.reading-main {
  flex: 1;
  overflow-y: auto;
  padding: 40px 24px 120px;
}

/* ── Container ────────────────────────────────────────────────────────── */
.reading-container {
  max-width: 680px;
  margin: 0 auto;
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */
@keyframes shimmer {
  from { background-position: -600px 0; }
  to   { background-position: 600px 0; }
}

.skeleton-title,
.skeleton-meta,
.skeleton-line {
  background: linear-gradient(90deg, #e8e4dc 25%, #f0ece3 50%, #e8e4dc 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 6px;
  margin-bottom: 12px;
}

.skeleton-title { height: 36px; width: 75%; margin-bottom: 16px; }
.skeleton-meta  { height: 14px; width: 40%; margin-bottom: 32px; }
.skeleton-body  { display: flex; flex-direction: column; gap: 8px; }
.skeleton-line  { height: 16px; }

/* ── Error ────────────────────────────────────────────────────────────── */
.reading-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 20px;
  color: #9ca3af;
  text-align: center;
}

.btn-retry {
  padding: 8px 24px;
  background: #7c6af5;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: background 0.15s;
}

.btn-retry:hover { background: #6c5ce7; }

/* ── Article header ───────────────────────────────────────────────────── */
.article-header {
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid #e8e4dc;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.article-type-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 4px;
  background: #ede9fe;
  color: #7c6af5;
}

.article-date {
  font-size: 13px;
  color: #9ca3af;
}

.article-title {
  font-size: clamp(26px, 4vw, 36px);
  font-weight: 700;
  line-height: 1.25;
  color: #1a1a2e;
  letter-spacing: -0.03em;
  margin: 0 0 14px;
}

.article-url {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.article-url a {
  font-size: 12px;
  color: #7c6af5;
  text-decoration: none;
  word-break: break-all;
}

.article-url a:hover { text-decoration: underline; }

.article-stats {
  font-size: 12px;
  color: #9ca3af;
  display: flex;
  gap: 0;
}

.read-progress-label { color: #7c6af5; font-weight: 500; }

/* ── Resume toast ─────────────────────────────────────────────────────── */
.resume-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a2e;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 32px;
  cursor: pointer;
  transition: background 0.15s;
  box-shadow: 0 4px 16px rgba(26, 26, 46, 0.15);
}

.resume-toast:hover { background: #16213e; }

.resume-dismiss {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 2px;
  display: flex;
  transition: color 0.15s;
}

.resume-dismiss:hover { color: #fff; }

/* ── Article body ─────────────────────────────────────────────────────── */
.article-body {
  line-height: 1.82;
  color: #2d2926;
  font-family: Georgia, 'Times New Roman', serif;
  selection: background #c4b5fd;
}

.article-body ::selection {
  background: #c4b5fd;
}

.article-body :deep(p),
.article-para {
  margin-bottom: 1.4em;
}

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

.article-body :deep(pre code) {
  background: none;
  color: inherit;
  padding: 0;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  padding-left: 1.6em;
  margin-bottom: 1.4em;
}

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

.article-body--plain .article-para {
  margin-bottom: 1.4em;
}

/* Font size classes */
.text-sm  { font-size: 15px; }
.text-base { font-size: 17px; }
.text-lg  { font-size: 19px; }

/* ── Empty ────────────────────────────────────────────────────────────── */
.article-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: #c4bfb5;
  text-align: center;
}

/* ── End of article ───────────────────────────────────────────────────── */
.article-end {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 60px;
  color: #c4bfb5;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.article-end__line {
  flex: 1;
  height: 1px;
  background: #e8e4dc;
}

/* ── Favorites modal ──────────────────────────────────────────────────── */
.fav-modal-body { display: flex; flex-direction: column; gap: 6px; }
.fav-modal-label { font-size: 12px; font-weight: 600; color: #6b7280; }

/* ── Notification ─────────────────────────────────────────────────────── */
.action-notif {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 500;
  z-index: 9000;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.action-notif--success { background: #059669; color: #fff; }
.action-notif--info    { background: #1a1a2e; color: #fff; }
.action-notif--error   { background: #dc2626; color: #fff; }

/* ── Transitions ──────────────────────────────────────────────────────── */
.resume-toast-enter-active { animation: slideDown 0.25s ease; }
.resume-toast-leave-active { animation: slideUp 0.2s ease forwards; }

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  to { opacity: 0; transform: translateY(-6px); }
}

.notif-enter-active { animation: notifIn 0.22s ease; }
.notif-leave-active { animation: notifOut 0.18s ease forwards; }

@keyframes notifIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes notifOut {
  to { opacity: 0; transform: translateX(-50%) translateY(8px); }
}

/* ── Responsive ───────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .reading-shell.panel-open { padding-right: 0; }
  .reading-header__inner { padding: 0 16px; }
  .reading-main { padding: 24px 16px 100px; }
  .header-back span { display: none; }
  .header-btn span  { display: none; }
}
</style>