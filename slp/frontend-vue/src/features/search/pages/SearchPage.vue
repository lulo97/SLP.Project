<template>
  <MobileLayout title="Search" data-testid="search-page-layout">
    <div class="max-w-2xl mx-auto">
      <div class="mb-4" data-testid="search-input-container">
        <a-input-search
          v-model:value="searchStore.query"
          placeholder="Search quizzes, questions, sources, favorites…"
          size="large"
          :loading="searchStore.loading"
          enter-button
          allow-clear
          data-testid="search-input"
          @search="onSearch"
          @pressEnter="onSearch"
        />
      </div>

      <div class="mb-4 overflow-x-auto" data-testid="search-tabs-container">
        <div class="flex gap-2 min-w-max pb-1">
          <button
            v-for="tab in tabs"
            :key="tab.type"
            :data-testid="`search-tab-${tab.type}`"
            @click="searchStore.setType(tab.type)"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              searchStore.activeType === tab.type
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600',
            ]"
          >
            <component :is="tab.icon" :size="14" />
            {{ tab.label }}
            <span
              v-if="searchStore.hasSearched && getTabCount(tab.type) !== null"
              data-testid="tab-count-badge"
              :class="[
                'text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none',
                searchStore.activeType === tab.type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-500',
              ]"
            >
              {{ getTabCount(tab.type) }}
            </span>
          </button>
        </div>
      </div>

      <a-alert
        v-if="searchStore.error"
        data-testid="search-error-alert"
        :message="searchStore.error"
        type="error"
        show-icon
        closable
        class="mb-4"
        @close="searchStore.error = null"
      />

      <div
        v-if="!searchStore.hasSearched && !searchStore.loading"
        data-testid="search-initial-state"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div
          class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4"
        >
          <Search :size="28" class="text-blue-400" />
        </div>
        <p class="text-gray-500 text-sm">
          Search across your quizzes, questions, sources and favorites.
        </p>
      </div>

      <div
        v-else-if="searchStore.loading"
        data-testid="search-loading-skeleton"
        class="space-y-3"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
        >
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-100 rounded w-3/4" />
              <div class="h-3 bg-gray-100 rounded w-full" />
              <div class="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="searchStore.hasSearched && !searchStore.hasResults"
        data-testid="search-no-results"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <div
          class="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4"
        >
          <SearchX :size="28" class="text-gray-300" />
        </div>
        <p class="font-medium text-gray-700 mb-1">No results found</p>
        <p class="text-sm text-gray-400">
          Try different keywords or switch to a different category.
        </p>
      </div>

      <div v-else class="space-y-2" data-testid="search-results-list">
        <p
          class="text-xs text-gray-400 px-1 mb-3"
          data-testid="search-results-count"
        >
          {{ searchStore.totalCount }} result{{
            searchStore.totalCount !== 1 ? "s" : ""
          }}
          for
          <span class="font-medium text-gray-600"
            >"{{ searchStore.lastQuery }}"</span
          >
          <span v-if="searchStore.activeType !== 'all'">
            in {{ searchStore.activeType }}s
          </span>
        </p>

        <div
          v-for="item in searchStore.results"
          :key="`${item.resultType}-${item.id}`"
          :data-testid="`search-result-item-${item.id}`"
          class="bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer p-4 group"
          @click="navigateTo(item)"
        >
          <div class="flex items-start gap-3">
            <div
              :class="[
                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                typeConfig[item.resultType].bg,
              ]"
            >
              <component
                :is="typeConfig[item.resultType].icon"
                :size="16"
                :class="typeConfig[item.resultType].color"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1">
                <p
                  class="font-medium text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2"
                  v-html="item.title"
                  data-testid="result-item-title"
                />
                <span
                  v-if="item.resultType === 'quiz' && item.visibility"
                  :data-testid="`result-visibility-${item.visibility}`"
                  :class="[
                    'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                    item.visibility === 'public'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-100 text-gray-500',
                  ]"
                >
                  {{ item.visibility }}
                </span>
              </div>

              <p
                v-if="item.snippet"
                class="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2 search-snippet"
                v-html="item.snippet"
                data-testid="result-item-snippet"
              />

              <div class="flex items-center gap-2 flex-wrap">
                <span
                  data-testid="result-item-type-pill"
                  :class="[
                    'text-xs px-2 py-0.5 rounded-md font-medium',
                    typeConfig[item.resultType].pill,
                  ]"
                >
                  {{ item.subType ?? item.resultType }}
                </span>

                <span
                  v-for="tag in item.tags.slice(0, 3)"
                  :key="tag"
                  data-testid="result-item-tag"
                  class="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium"
                >
                  #{{ tag }}
                </span>

                <span
                  v-if="item.tags.length > 3"
                  data-testid="result-item-more-tags"
                  class="text-xs text-gray-400"
                >
                  +{{ item.tags.length - 3 }}
                </span>

                <span
                  class="text-xs text-gray-300 ml-auto shrink-0"
                  data-testid="result-item-date"
                >
                  {{ formatDate(item.createdAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="searchStore.totalPages > 1"
          data-testid="search-pagination"
          class="flex justify-center pt-4 pb-2"
        >
          <a-pagination
            v-model:current="searchStore.page"
            :total="searchStore.totalCount"
            :page-size="searchStore.pageSize"
            :show-size-changer="false"
            size="small"
            @change="(page: number) => searchStore.setPage(page)"
          />
        </div>
      </div>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { InputSearch, Alert, Pagination } from "ant-design-vue";
import {
  Search,
  SearchX,
  FileText,
  HelpCircle,
  FolderOpen,
  Star,
  LayoutGrid,
} from "lucide-vue-next";
import MobileLayout from "@/layouts/MobileLayout.vue";
import {
  useSearchStore,
  type SearchType,
  type SearchResultItem,
} from "../stores/searchStore";

const AInputSearch = InputSearch;
const AAlert = Alert;
const APagination = Pagination;

const router = useRouter();
const route = useRoute();
const searchStore = useSearchStore();

// ── Tab definitions ──────────────────────────────────────────────────────────

const tabs: { type: SearchType; label: string; icon: any }[] = [
  { type: "all", label: "All", icon: LayoutGrid },
  { type: "quiz", label: "Quizzes", icon: FileText },
  { type: "question", label: "Questions", icon: HelpCircle },
  { type: "source", label: "Sources", icon: FolderOpen },
  { type: "favorite", label: "Favorites", icon: Star },
];

// ── Type visual config ────────────────────────────────────────────────────────

const typeConfig: Record<
  SearchResultItem["resultType"],
  { icon: any; bg: string; color: string; pill: string }
> = {
  quiz: {
    icon: FileText,
    bg: "bg-blue-50",
    color: "text-blue-500",
    pill: "bg-blue-50 text-blue-600",
  },
  question: {
    icon: HelpCircle,
    bg: "bg-violet-50",
    color: "text-violet-500",
    pill: "bg-violet-50 text-violet-600",
  },
  source: {
    icon: FolderOpen,
    bg: "bg-amber-50",
    color: "text-amber-500",
    pill: "bg-amber-50 text-amber-600",
  },
  favorite: {
    icon: Star,
    bg: "bg-rose-50",
    color: "text-rose-500",
    pill: "bg-rose-50 text-rose-600",
  },
};

// ── URL sync ─────────────────────────────────────────────────────────────────

/**
 * Watcher A — store → URL
 *
 * After each committed search (lastQuery/activeType/page update), reflect the
 * new state in the URL via router.replace so the address bar stays in sync and
 * the page is bookmarkable / shareable.
 * Uses router.replace (not push) so pagination clicks don't pollute history.
 */
watch(
  () =>
    [searchStore.lastQuery, searchStore.activeType, searchStore.page] as const,
  ([q, type, page]) => {
    if (!q) return;

    // Only replace when the URL actually differs to avoid a redundant history entry
    // and to prevent Watcher B from firing needlessly.
    const cq = route.query;
    if (cq.q !== q || cq.type !== type || Number(cq.page) !== page) {
      router.replace({ query: { q, type, page } });
    }
  },
);

/**
 * Watcher B — URL → store  (back / forward navigation)
 *
 * When the user navigates back or forward the URL changes but the store doesn't.
 * Read the new params and re-run the search.
 *
 * Loop-prevention: Watcher A's router.replace also triggers this watcher, but
 * by the time it fires the store's lastQuery/activeType/page already match the
 * URL params, so the early-return guard below exits immediately.
 */
watch(
  () => route.query,
  (query) => {
    const q = (query.q as string | undefined) ?? "";
    const type = (query.type as SearchType | undefined) ?? "all";
    const page = parseInt(query.page as string) || 1;

    if (!q) return;

    // Already in sync — this was triggered by Watcher A's own router.replace.
    if (
      q === searchStore.lastQuery &&
      type === searchStore.activeType &&
      page === searchStore.page
    )
      return;

    // Restore store state from URL then search without resetting page
    // (the URL is the source of truth for back/forward).
    searchStore.query = q;
    searchStore.activeType = type;
    searchStore.page = page;
    searchStore.search();
  },
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTabCount(type: SearchType): number | null {
  if (!searchStore.categoryCounts) return null;
  if (type === "all") return searchStore.totalCount;
  const map: Record<
    SearchType,
    keyof typeof searchStore.categoryCounts | null
  > = {
    all: null,
    quiz: "quizzes",
    question: "questions",
    source: "sources",
    favorite: "favorites",
  };
  const key = map[type];
  return key ? searchStore.categoryCounts[key] : null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function navigateTo(item: SearchResultItem) {
  switch (item.resultType) {
    case "quiz":
      router.push(`/quiz/view/${item.id}`);
      break;
    case "question":
      router.push(`/question/${item.id}/edit`);
      break;
    case "source":
      router.push(`/source/${item.id}`);
      break;
    case "favorite":
      router.push("/favorites");
      break;
  }
}

function onSearch() {
  searchStore.search(true);
}

// ── Mount: restore state from URL ────────────────────────────────────────────

/**
 * If the page is opened with ?q=…&type=…&page=… already in the URL
 * (bookmark, shared link, or a hard reload mid-session), hydrate the store
 * and fire the search immediately so results appear without user interaction.
 */
onMounted(() => {
  const q = (route.query.q as string | undefined) ?? "";
  const type = (route.query.type as SearchType | undefined) ?? "all";
  const page = parseInt(route.query.page as string) || 1;

  if (q) {
    searchStore.query = q;
    searchStore.activeType = type;
    searchStore.page = page;
    searchStore.search(); // honour page from URL — do not reset
  }
});
</script>

<style scoped>
/* Render <mark> tags from the backend ts_headline */
:deep(.search-snippet mark) {
  background-color: #fef08a; /* yellow-200 */
  color: #1e3a5f;
  border-radius: 2px;
  padding: 0 2px;
  font-style: normal;
}
</style>
