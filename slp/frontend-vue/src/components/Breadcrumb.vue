<template>
  <!-- Multi-step trail -->
  <nav
    v-if="items.length > 1"
    class="flex items-center min-w-0"
    aria-label="Breadcrumb"
    data-testid="breadcrumb-nav"
  >
    <ol class="flex items-center min-w-0">
      <li
        v-for="(item, i) in displayItems"
        :key="i"
        class="flex items-center min-w-0"
        :data-testid="'breadcrumb-item-' + i"
      >
        <!-- Ellipsis when trail is truncated -->
        <span
          v-if="item.ellipsis"
          class="text-gray-400 text-xs px-1 shrink-0"
          data-testid="breadcrumb-ellipsis"
        >
          …
        </span>

        <!-- Ancestor link -->
        <router-link
          v-else-if="item.path && i < displayItems.length - 1"
          :to="item.path"
          class="text-gray-400 text-xs font-medium hover:text-blue-500 transition-colors shrink-0 max-w-[64px] truncate"
          data-testid="breadcrumb-link"
        >
          {{ item.label }}
        </router-link>

        <!-- Current page (last item, no link) -->
        <span
          v-else
          class="text-gray-800 text-sm font-semibold truncate max-w-[160px]"
          aria-current="page"
          data-testid="breadcrumb-current"
        >
          {{ item.label }}
        </span>

        <!-- Separator (skip after last item and after ellipsis) -->
        <ChevronRight
          v-if="i < displayItems.length - 1"
          :size="12"
          class="text-gray-300 shrink-0 mx-0.5"
          data-testid="breadcrumb-separator"
        />
      </li>
    </ol>
  </nav>

  <!-- Single item or unmapped route → plain title -->
  <h1 v-else class="text-xl font-semibold truncate" data-testid="page-title">
    {{ fallbackTitle }}
  </h1>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ChevronRight } from "lucide-vue-next";
import { useQuizStore } from "@/features/quiz/stores/quizStore";
import { useSourceStore } from "@/features/source/stores/sourceStore";

interface BreadcrumbItem {
  label: string;
  path?: string;
  ellipsis?: boolean;
}

const props = withDefaults(
  defineProps<{
    /** Shown as plain <h1> when the route has no trail (e.g. Dashboard) */
    fallbackTitle: string;
    /** Max crumbs before middle items are collapsed into "…" */
    maxItems?: number;
  }>(),
  { maxItems: 3 },
);

const route = useRoute();
const quizStore = useQuizStore();
const sourceStore = useSourceStore();

// ── Static anchors ──────────────────────────────────────────────────────────
const HOME: BreadcrumbItem = { label: "Home", path: "/dashboard" };
const QUIZ_LIST: BreadcrumbItem = { label: "My Quizzes", path: "/quiz" };
const QUESTION_LIST: BreadcrumbItem = {
  label: "Question Bank",
  path: "/questions",
};
const SOURCE_LIST: BreadcrumbItem = { label: "My Sources", path: "/source" };

// ── Route → trail mapping ────────────────────────────────────────────────────
const items = computed<BreadcrumbItem[]>(() => {
  const name = route.name as string | undefined;
  // Dynamic labels pulled from already-loaded store state
  const quizTitle = quizStore.currentQuiz?.title || "Quiz";
  const sourceTitle = sourceStore.currentSource?.title || "Source";

  switch (name) {
    // ── Dashboard ────────────────────────────────────────────────────────
    case "dashboard":
      return [HOME];

    // ── Quiz ─────────────────────────────────────────────────────────────
    case "quiz-list":
      return [HOME, QUIZ_LIST];

    case "quiz-create":
      return [HOME, QUIZ_LIST, { label: "Create" }];

    case "quiz-detail":
    case "QuizView": // /quiz/view/:id  (public view)
      return [HOME, QUIZ_LIST, { label: quizTitle }];

    case "quiz-edit":
      // Title already conveys "we're in this quiz"; page heading shows "Edit"
      return [HOME, QUIZ_LIST, { label: quizTitle }];

    // ── Quiz attempts ────────────────────────────────────────────────────
    case "QuizPlayer":
      return [HOME, QUIZ_LIST, { label: quizTitle }];

    case "AttemptReview":
      return [HOME, QUIZ_LIST, { label: "Review" }];

    // ── Question bank ────────────────────────────────────────────────────
    case "question-list":
      return [HOME, QUESTION_LIST];

    case "question-create":
      return [HOME, QUESTION_LIST, { label: "New" }];

    case "question-edit":
      return [HOME, QUESTION_LIST, { label: "Edit" }];

    // ── Sources ──────────────────────────────────────────────────────────
    case "source-list":
      return [HOME, SOURCE_LIST];

    case "source-upload":
      return [HOME, SOURCE_LIST, { label: "Upload" }];

    case "source-url-create":
      return [HOME, SOURCE_LIST, { label: "Add URL" }];

    case "SourceTextCreate":
      return [HOME, SOURCE_LIST, { label: "Add Text" }];

    case "source-detail":
      // Note: SourceDetailPage overrides #header-left with its own back button,
      // so this entry only fires if that slot override is ever removed.
      return [HOME, SOURCE_LIST, { label: sourceTitle }];

    // ── Misc ─────────────────────────────────────────────────────────────
    case "search":
      return [HOME, { label: "Search" }];

    case "admin":
      return [HOME, { label: "Admin" }];

    case "user-reports":
      return [HOME, { label: "My Reports" }];

    default:
      return []; // unknown route → fallback to plain <h1>
  }
});

// ── Truncation: first + "…" + last(n) when items exceed maxItems ─────────────
const displayItems = computed<BreadcrumbItem[]>(() => {
  const all = items.value;
  if (all.length <= props.maxItems) return all;

  // Keep first crumb + enough tail crumbs to fill maxItems
  const tailCount = props.maxItems - 2; // -1 for first, -1 for ellipsis
  const first = all[0] as BreadcrumbItem; // length > maxItems ≥ 2, so [0] always exists
  const tail = all.slice(-tailCount);
  return [first, { label: "…", ellipsis: true }, ...tail];
});
</script>
