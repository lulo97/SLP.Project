<template>
  <MobileLayout :title="`Review: ${review?.quizTitle || 'Attempt'}`">
    <div v-if="review" class="space-y-4 pb-6" data-testid="review-container">
      <!-- Score card -->
      <a-card class="shadow-sm" data-testid="score-card">
        <div class="text-center py-2">
          <div class="flex justify-end mb-2">
            <a-button
              v-if="authStore.isAuthenticated && !isOwner"
              size="small"
              @click="openReportQuiz"
              danger
              ghost
              data-testid="report-quiz-button"
            >
              <FlagOutlined /> Report Quiz
            </a-button>
          </div>
          <div
            class="text-3xl font-bold mb-1"
            :class="scoreColor"
            data-testid="score-value"
          >
            {{ review.score }} / {{ review.maxScore }}
          </div>
          <div
            class="text-lg font-medium mb-2"
            :class="scoreColor"
            data-testid="score-percent"
          >
            {{ scorePercent }}%
          </div>
          <div
            class="flex items-center justify-center gap-4 text-sm text-gray-500 mb-3"
          >
            <span data-testid="correct-count">{{ correctCount }} correct</span>
            <span class="text-gray-300">|</span>
            <span data-testid="incorrect-count"
              >{{ incorrectCount }} incorrect</span
            >
            <span class="text-gray-300">|</span>
            <span data-testid="completed-time">
              Completed {{ new Date(review.endTime!).toLocaleString() }}
            </span>
          </div>
          <div
            class="h-2 bg-gray-100 rounded-full overflow-hidden"
            data-testid="score-progress-track"
          >
            <div
              class="h-full rounded-full transition-all"
              :class="
                scorePercent >= 80
                  ? 'bg-green-500'
                  : scorePercent >= 50
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
              "
              :style="{ width: scorePercent + '%' }"
              data-testid="score-progress-bar"
            />
          </div>
        </div>
      </a-card>

      <!-- Question cards -->
      <a-card
        v-for="(ans, idx) in review.answerReview"
        :key="ans.id"
        class="shadow-sm"
        :class="
          isFlashcard(ans)
            ? 'border-l-4 border-l-yellow-400'
            : ans.isCorrect
              ? 'border-l-4 border-l-green-500'
              : 'border-l-4 border-l-red-400'
        "
        :data-testid="`review-question-${idx}`"
        :data-correct="ans.isCorrect"
      >
        <!-- Question header -->
        <div class="flex items-start gap-2 mb-3">
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 mt-0.5"
            :class="
              isFlashcard(ans)
                ? 'bg-yellow-100 text-yellow-700'
                : ans.isCorrect
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
            "
            :data-testid="`review-question-number-${idx}`"
          >
            {{ Number(idx) + 1 }}
          </span>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="
                  isFlashcard(ans)
                    ? 'bg-yellow-100 text-yellow-700'
                    : ans.isCorrect
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                "
                :data-testid="`review-question-result-${idx}`"
              >
                {{
                  isFlashcard(ans)
                    ? "✦ Informational"
                    : ans.isCorrect
                      ? "✓ Correct"
                      : "✗ Incorrect"
                }}
              </span>
              <span
                class="text-xs text-gray-400 capitalize"
                :data-testid="`review-question-type-${idx}`"
              >
                {{ getQuestionType(ans) }}
              </span>
              <a-button
                v-if="authStore.isAuthenticated && !isOwner"
                size="small"
                type="text"
                @click="openReportQuestion(ans.quizQuestionId)"
                class="ml-auto"
                data-testid="report-question-button"
              >
                <FlagOutlined />
              </a-button>
            </div>
            <p
              class="text-sm font-medium text-gray-800"
              :data-testid="`review-question-content-${idx}`"
            >
              {{ getQuestionContent(ans) }}
            </p>
          </div>
        </div>

        <!-- Flashcard: informational panel — no correct/incorrect concept -->
        <div
          v-if="isFlashcard(ans)"
          class="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3"
          data-testid-prefix="flashcard"
        >
          <p class="text-xs font-semibold text-yellow-700 mb-1.5">
            Flashcard content
          </p>
          <FlashcardReviewDisplay :ans="ans" />
        </div>

        <!-- Incorrect scored question: show both user answer and correct answer -->
        <div
          v-else-if="!ans.isCorrect"
          class="space-y-2 mt-3"
          :data-testid="`review-answers-incorrect-${idx}`"
        >
          <div
            class="rounded-lg border border-red-200 bg-red-50 p-3"
            :data-testid="`review-user-answer-${idx}`"
          >
            <p class="text-xs font-semibold text-red-500 mb-1.5">Your answer</p>
            <AnswerDisplay :ans="ans" :user-answer="true" />
          </div>
          <div
            class="rounded-lg border border-green-200 bg-green-50 p-3"
            :data-testid="`review-correct-answer-${idx}`"
          >
            <p class="text-xs font-semibold text-green-600 mb-1.5">
              Correct answer
            </p>
            <AnswerDisplay :ans="ans" :user-answer="false" />
          </div>
        </div>

        <!-- Correct scored question: show user answer in green -->
        <div
          v-else
          class="mt-3 rounded-lg border border-green-200 bg-green-50 p-3"
          :data-testid="`review-user-answer-${idx}`"
        >
          <p class="text-xs font-semibold text-green-600 mb-1.5">Your answer</p>
          <AnswerDisplay :ans="ans" :user-answer="true" />
        </div>

        <!-- Explanation -->
        <div
          v-if="getExplanation(ans)"
          class="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700"
          :data-testid="`review-explanation-${idx}`"
        >
          <span class="font-medium">Explanation: </span
          >{{ getExplanation(ans) }}
        </div>
      </a-card>

      <CommentsSection
        v-if="review.quizId"
        target-type="quiz"
        :target-id="review.quizId"
      />

      <div class="flex justify-center mt-2">
        <a-button type="primary" @click="goToQuiz" data-testid="back-to-quiz">
          Back to Quiz
        </a-button>
      </div>
    </div>

    <div
      v-else
      class="text-center py-8 text-gray-500"
      data-testid="review-not-found"
    >
      Review not found.
    </div>

    <ReportModal
      v-model:visible="reportModalVisible"
      :target-type="reportTarget?.type ?? ''"
      :target-id="reportTarget?.id ?? 0"
      :attempt-id="attemptId"
      @reported="reportModalVisible = false"
    />
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FlagOutlined } from "@ant-design/icons-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useAttemptStore } from "../stores/attemptStore";
import ReportModal from "@/features/report/components/ReportModal.vue";
import { useQuizStore } from "@/features/quiz/stores/quizStore";
import { useAuthStore } from "@/features/auth/stores/authStore";
import CommentsSection from "@/features/comment/components/CommentsSection.vue";

const route = useRoute();
const router = useRouter();
const attemptStore = useAttemptStore();
const quizStore = useQuizStore();
const authStore = useAuthStore();
const isOwner = ref(false);

const attemptId = computed(() => Number(route.params.attemptId));
const loading = ref(true);
const review = ref<any>(null);
const reportModalVisible = ref(false);
const reportTarget = ref<{ type: string; id: number } | null>(null);

// Inside onMounted after fetching review:
onMounted(async () => {
  try {
    review.value = await attemptStore.fetchAttemptReview(attemptId.value);
    // Fetch quiz details to check ownership
    if (review.value?.quizId) {
      await quizStore.fetchQuizById(review.value.quizId);
      const quiz = quizStore.currentQuiz;
      isOwner.value = !!quiz && authStore.user?.id === quiz.userId;
    }
  } finally {
    loading.value = false;
  }
});

// ── Snapshot / answer parsers ────────────────────────────────────────────────

function parseSnapshot(ans: any) {
  try {
    return JSON.parse(ans.questionSnapshotJson);
  } catch {
    return {};
  }
}
function parseAnswer(ans: any) {
  try {
    return JSON.parse(ans.answerJson);
  } catch {
    return null;
  }
}

function getQuestionType(ans: any): string {
  return parseSnapshot(ans).type?.replace(/_/g, " ") ?? "";
}

function getQuestionContent(ans: any): string {
  const q = parseSnapshot(ans);
  const content: string = q.content ?? "";
  // keywords are the display-blanking words — replace them with ___ for display
  const keywords: string[] = q.metadata?.keywords ?? [];
  if (q.type === "fill_blank" && keywords.length) {
    return keywords.reduce(
      (s: string, kw: string) => s.split(kw).join("___"),
      content,
    );
  }
  return content;
}

function getExplanation(ans: any): string {
  return parseSnapshot(ans).explanation ?? "";
}

// Flashcard rows are informational — isCorrect is always null/false from the backend.
// They must be excluded from scored counts and shown with neutral styling.
function isFlashcard(ans: any): boolean {
  return parseSnapshot(ans).type === "flashcard";
}

// ── Score helpers ────────────────────────────────────────────────────────────
// Only scored (non-flashcard) rows count toward correct/incorrect totals.

const correctCount = computed(
  () =>
    review.value?.answerReview?.filter(
      (a: any) => !isFlashcard(a) && a.isCorrect,
    ).length ?? 0,
);
const incorrectCount = computed(
  () =>
    review.value?.answerReview?.filter(
      (a: any) => !isFlashcard(a) && !a.isCorrect,
    ).length ?? 0,
);
const scorePercent = computed(() => {
  if (!review.value?.maxScore) return 0;
  return Number(
    ((review.value.score / review.value.maxScore) * 100).toFixed(0),
  );
});
const scoreColor = computed(() => {
  if (scorePercent.value >= 80) return "text-green-600";
  if (scorePercent.value >= 50) return "text-yellow-500";
  return "text-red-500";
});

function goToQuiz() {
  router.push(`/quiz/${review.value?.quizId}`);
}

// ── FlashcardReviewDisplay inline component ──────────────────────────────────
// Shows front/back of the flashcard — no correct/incorrect concept applies.

const FlashcardReviewDisplay = defineComponent({
  props: { ans: { type: Object, required: true } },
  setup(props) {
    return () => {
      const q = parseSnapshot(props.ans);
      const meta = q.metadata ?? {};
      return h("div", { class: "flex flex-col gap-1" }, [
        h(
          "span",
          { class: "text-sm", "data-testid": "flashcard-review-front" },
          `Front: ${meta.front ?? "—"}`,
        ),
        h(
          "span",
          {
            class: "text-sm text-gray-500",
            "data-testid": "flashcard-review-back",
          },
          `Back: ${meta.back ?? "—"}`,
        ),
      ]);
    };
  },
});

// ── AnswerDisplay inline component ──────────────────────────────────────────

const AnswerDisplay = defineComponent({
  props: {
    ans: { type: Object, required: true },
    userAnswer: { type: Boolean, required: true },
  },
  setup(props) {
    return () => {
      const q = parseSnapshot(props.ans);
      const userAns = parseAnswer(props.ans);
      const type: string = q.type ?? "";
      const meta = q.metadata ?? {};

      const noAnswer = () =>
        h(
          "span",
          {
            class: "text-xs text-gray-400 italic",
            "data-testid": "answer-display-empty",
          },
          "No answer",
        );

      // ── multiple_choice ──────────────────────────────────────────────────
      // Canonical: meta.correctAnswers (string[])
      if (type === "multiple_choice") {
        const options: any[] = meta.options ?? [];
        const correctIds: any[] = meta.correctAnswers ?? []; // no legacy "correct" fallback
        const userIds: any[] = userAns?.selected ?? [];
        const ids = props.userAnswer ? userIds : correctIds;
        if (!ids.length) return noAnswer();
        return h(
          "div",
          {
            class: "flex flex-col gap-1",
            "data-testid": "answer-display-multiple-choice",
          },
          ids.map((id: any) => {
            const opt = options.find((o: any) => String(o.id) === String(id));
            return h(
              "span",
              {
                class: "text-sm",
                "data-testid": `answer-display-option-${id}`,
              },
              `• ${opt?.text ?? id}`,
            );
          }),
        );
      }

      // ── single_choice ────────────────────────────────────────────────────
      // Canonical: meta.correctAnswers[0] (single string id)
      // Answer:    selected (single string id)
      if (type === "single_choice") {
        const options: any[] = meta.options ?? [];
        const correctId = (meta.correctAnswers ?? [])[0]; // no legacy "correct" fallback
        const id = props.userAnswer ? userAns?.selected : correctId;
        if (id === null || id === undefined) return noAnswer();
        const opt = options.find((o: any) => String(o.id) === String(id));
        return h(
          "span",
          { class: "text-sm", "data-testid": "answer-display-single-choice" },
          opt?.text ?? String(id),
        );
      }

      // ── true_false ───────────────────────────────────────────────────────
      // Canonical: meta.correctAnswer (boolean)
      if (type === "true_false") {
        if (props.userAnswer) {
          const raw = userAns?.selected;
          if (raw === null || raw === undefined || typeof raw !== "boolean")
            return h(
              "span",
              {
                class: "text-xs text-gray-400 italic",
                "data-testid": "answer-display-empty",
              },
              "No answer",
            );
          return h(
            "span",
            {
              class: "text-sm font-medium",
              "data-testid": "answer-display-true-false",
            },
            raw ? "True" : "False",
          );
        }
        // Canonical field is correctAnswer — no legacy "correct" fallback
        const correctVal = meta.correctAnswer;
        if (correctVal === null || correctVal === undefined) return noAnswer();
        return h(
          "span",
          {
            class: "text-sm font-medium",
            "data-testid": "answer-display-true-false",
          },
          correctVal ? "True" : "False",
        );
      }

      // ── fill_blank ───────────────────────────────────────────────────────
      // Canonical: meta.keywords = display blanking words (shown as ___ in question)
      //            meta.answers  = accepted grading values (shown as correct answer)
      if (type === "fill_blank") {
        if (props.userAnswer) {
          const answer = userAns?.answer;
          if (!answer) return noAnswer();
          return h(
            "span",
            {
              class: "text-sm font-medium",
              "data-testid": "answer-display-fill-blank",
            },
            answer,
          );
        }
        // Show the accepted grading answers, NOT the display keywords.
        // keywords are only for blanking the question text — they are not the answer label.
        const answers: string[] = meta.answers ?? [];
        if (!answers.length) return noAnswer();
        return h(
          "span",
          {
            class: "text-sm font-medium",
            "data-testid": "answer-display-fill-blank",
          },
          answers.join(" / "),
        );
      }

      // ── ordering ─────────────────────────────────────────────────────────
      // Canonical: items sorted by order_id asc = correct order (no correctOrder field)
      if (type === "ordering") {
        const items: any[] = meta.items ?? [];
        if (props.userAnswer) {
          const order: number[] = userAns?.order ?? [];
          if (!order.length) return noAnswer();
          return h(
            "div",
            {
              class: "flex flex-col gap-1",
              "data-testid": "answer-display-ordering",
            },
            order.map((id: number, i: number) => {
              const item = items.find((it: any) => it.order_id === id);
              return h(
                "span",
                {
                  class: "text-sm",
                  "data-testid": `answer-display-ordering-item-${i}`,
                },
                `${i + 1}. ${item?.text ?? id}`,
              );
            }),
          );
        }
        // Correct order = items sorted by order_id ascending
        const correctItems = [...items].sort((a, b) => a.order_id - b.order_id);
        return h(
          "div",
          {
            class: "flex flex-col gap-1",
            "data-testid": "answer-display-ordering",
          },
          correctItems.map((item: any, i: number) =>
            h(
              "span",
              {
                class: "text-sm",
                "data-testid": `answer-display-ordering-item-${i}`,
              },
              `${i + 1}. ${item.text}`,
            ),
          ),
        );
      }

      // ── matching ─────────────────────────────────────────────────────────
      // Canonical: pairs[].id (integer), match is correct when leftId === rightId
      if (type === "matching") {
        const pairs: any[] = meta.pairs ?? [];
        if (props.userAnswer) {
          const matches: any[] = userAns?.matches ?? [];
          if (!matches.length) return noAnswer();
          return h(
            "div",
            {
              class: "flex flex-col gap-1",
              "data-testid": "answer-display-matching",
            },
            matches.map((m: any) => {
              const leftPair = pairs.find((p: any) => p.id === m.leftId);
              const rightPair = pairs.find((p: any) => p.id === m.rightId);
              const isRowCorrect = m.leftId === m.rightId;
              return h(
                "span",
                {
                  class: `text-sm ${isRowCorrect ? "text-green-700" : "text-red-600"}`,
                  "data-testid": `answer-display-match-${m.leftId}-${m.rightId}`,
                  "data-correct": isRowCorrect,
                },
                `${leftPair?.left ?? m.leftId} → ${rightPair?.right ?? m.rightId}`,
              );
            }),
          );
        }
        return h(
          "div",
          {
            class: "flex flex-col gap-1",
            "data-testid": "answer-display-matching",
          },
          pairs.map((p: any) =>
            h(
              "span",
              {
                class: "text-sm text-green-700",
                "data-testid": `answer-display-pair-${p.id}`,
              },
              `${p.left} → ${p.right}`,
            ),
          ),
        );
      }

      return h(
        "span",
        {
          class: "text-xs text-gray-400 italic",
          "data-testid": "answer-display-na",
        },
        "N/A",
      );
    };
  },
});

const openReportQuiz = () => {
  reportTarget.value = { type: "quiz", id: review.value?.quizId };
  reportModalVisible.value = true;
};

const openReportQuestion = (quizQuestionId: number) => {
  reportTarget.value = { type: "quiz_question", id: quizQuestionId };
  reportModalVisible.value = true;
};
</script>
