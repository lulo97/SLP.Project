<template>
  <MobileLayout :title="`Review: ${review?.quizTitle || 'Attempt'}`">
    <div v-if="review" class="space-y-4 pb-6">

      <!-- Score card -->
      <a-card class="shadow-sm" data-testid="score-card">
        <div class="text-center py-2">
          <div class="text-3xl font-bold mb-1" :class="scoreColor">
            {{ review.score }} / {{ review.maxScore }}
          </div>
          <div class="text-lg font-medium mb-2" :class="scoreColor">
            {{ scorePercent }}%
          </div>
          <div class="flex items-center justify-center gap-4 text-sm text-gray-500 mb-3">
            <span>{{ correctCount }} correct</span>
            <span class="text-gray-300">|</span>
            <span>{{ incorrectCount }} incorrect</span>
            <span class="text-gray-300">|</span>
            <span>Completed {{ new Date(review.endTime!).toLocaleString() }}</span>
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="scorePercent >= 80 ? 'bg-green-500' : scorePercent >= 50 ? 'bg-yellow-400' : 'bg-red-400'"
              :style="{ width: scorePercent + '%' }"
            />
          </div>
        </div>
      </a-card>

      <!-- Question cards -->
      <a-card
        v-for="(ans, idx) in review.answerReview"
        :key="ans.id"
        class="shadow-sm"
        :class="ans.isCorrect ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-400'"
        :data-testid="`review-question-${idx}`"
      >
        <!-- Question header -->
        <div class="flex items-start gap-2 mb-3">
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 mt-0.5"
            :class="ans.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
          >
            {{ Number(idx) + 1 }}
          </span>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="ans.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
              >
                {{ ans.isCorrect ? '✓ Correct' : '✗ Incorrect' }}
              </span>
              <span class="text-xs text-gray-400 capitalize">
                {{ getQuestionType(ans) }}
              </span>
            </div>
            <p class="text-sm font-medium text-gray-800">{{ getQuestionContent(ans) }}</p>
          </div>
        </div>

        <!-- Incorrect: show both user answer and correct answer -->
        <div v-if="!ans.isCorrect" class="space-y-2 mt-3">
          <div class="rounded-lg border border-red-200 bg-red-50 p-3">
            <p class="text-xs font-semibold text-red-500 mb-1.5">Your answer</p>
            <AnswerDisplay :ans="ans" :user-answer="true" />
          </div>
          <div class="rounded-lg border border-green-200 bg-green-50 p-3">
            <p class="text-xs font-semibold text-green-600 mb-1.5">Correct answer</p>
            <AnswerDisplay :ans="ans" :user-answer="false" />
          </div>
        </div>

        <!-- Correct: just show user answer in green -->
        <div v-else class="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <p class="text-xs font-semibold text-green-600 mb-1.5">Your answer</p>
          <AnswerDisplay :ans="ans" :user-answer="true" />
        </div>

        <!-- Explanation -->
        <div
          v-if="getExplanation(ans)"
          class="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700"
        >
          <span class="font-medium">Explanation: </span>{{ getExplanation(ans) }}
        </div>
      </a-card>

      <div class="flex justify-center mt-2">
        <a-button type="primary" @click="goToQuiz" data-testid="back-to-quiz">
          Back to Quiz
        </a-button>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500" data-testid="review-not-found">
      Review not found.
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useAttemptStore } from '../stores/attemptStore';

const route = useRoute();
const router = useRouter();
const attemptStore = useAttemptStore();

const attemptId = computed(() => Number(route.params.attemptId));
const loading = ref(true);
const review = ref<any>(null);

onMounted(async () => {
  try {
    review.value = await attemptStore.fetchAttemptReview(attemptId.value);
  } finally {
    loading.value = false;
  }
});

// ── Snapshot / answer parsers ────────────────────────────────────────────────

function parseSnapshot(ans: any) {
  try { return JSON.parse(ans.questionSnapshotJson); } catch { return {}; }
}
function parseAnswer(ans: any) {
  try { return JSON.parse(ans.answerJson); } catch { return null; }
}

function getQuestionType(ans: any): string {
  return parseSnapshot(ans).type?.replace(/_/g, ' ') ?? '';
}

function getQuestionContent(ans: any): string {
  const q = parseSnapshot(ans);
  const content: string = q.content ?? '';
  const keywords: string[] = q.metadata?.keywords ?? [];
  if (q.type === 'fill_blank' && keywords.length) {
    return keywords.reduce((s: string, kw: string) => s.split(kw).join('___'), content);
  }
  return content;
}

function getExplanation(ans: any): string {
  return parseSnapshot(ans).explanation ?? '';
}

// ── Score helpers ────────────────────────────────────────────────────────────

const correctCount = computed(() =>
  review.value?.answerReview?.filter((a: any) => a.isCorrect).length ?? 0,
);
const incorrectCount = computed(() =>
  review.value?.answerReview?.filter((a: any) => !a.isCorrect).length ?? 0,
);
const scorePercent = computed(() => {
  if (!review.value?.maxScore) return 0;
  return Number(((review.value.score / review.value.maxScore) * 100).toFixed(0));
});
const scoreColor = computed(() => {
  if (scorePercent.value >= 80) return 'text-green-600';
  if (scorePercent.value >= 50) return 'text-yellow-500';
  return 'text-red-500';
});

function goToQuiz() {
  router.push(`/quiz/${review.value?.quizId}`);
}

// ── AnswerDisplay inline component ──────────────────────────────────────────

const AnswerDisplay = defineComponent({
  props: {
    ans:        { type: Object,  required: true },
    userAnswer: { type: Boolean, required: true },
  },
  setup(props) {
    return () => {
      const q    = parseSnapshot(props.ans);
      const userAns = parseAnswer(props.ans);
      const type: string = q.type ?? '';
      const meta = q.metadata ?? {};

      const noAnswer = () =>
        h('span', { class: 'text-xs text-gray-400 italic' }, 'No answer');

      // ── multiple_choice ──────────────────────────────────────────────────
      if (type === 'multiple_choice') {
        const options: any[]    = meta.options ?? [];
        const correctIds: any[] = meta.correctAnswers ?? meta.correct ?? [];
        const userIds: any[]    = userAns?.selected ?? [];
        const ids = props.userAnswer ? userIds : correctIds;
        if (!ids.length) return noAnswer();
        return h('div', { class: 'flex flex-col gap-1' },
          ids.map((id: any) => {
            const opt = options.find((o: any) => String(o.id) === String(id));
            return h('span', { class: 'text-sm' }, `• ${opt?.text ?? id}`);
          }),
        );
      }

      // ── single_choice ────────────────────────────────────────────────────
      if (type === 'single_choice') {
        const options: any[] = meta.options ?? [];
        const correctId      = (meta.correctAnswers ?? meta.correct ?? [])[0];
        const id = props.userAnswer ? userAns?.selected : correctId;
        if (id === null || id === undefined) return noAnswer();
        const opt = options.find((o: any) => String(o.id) === String(id));
        return h('span', { class: 'text-sm' }, opt?.text ?? String(id));
      }

      // ── true_false ───────────────────────────────────────────────────────
      if (type === 'true_false') {
        if (props.userAnswer) {
          const raw = userAns?.selected;
          // Guard against old event-object bug still in stored data
          if (raw === null || raw === undefined || (typeof raw === 'object' && raw !== null))
            return h('span', { class: 'text-xs text-gray-400 italic' }, 'No answer');
          const val = raw === true || raw === 'true';
          return h('span', { class: 'text-sm font-medium' }, val ? 'True' : 'False');
        }
        // backend field is "correctAnswer" (singular boolean)
        const correctVal = meta.correctAnswer ?? meta.correct;
        if (correctVal === null || correctVal === undefined) return noAnswer();
        return h('span', { class: 'text-sm font-medium' }, correctVal ? 'True' : 'False');
      }

      // ── fill_blank ───────────────────────────────────────────────────────
      if (type === 'fill_blank') {
        if (props.userAnswer) {
          const answer = userAns?.answer;
          if (!answer) return noAnswer();
          return h('span', { class: 'text-sm font-medium' }, answer);
        }
        const keywords: string[] = meta.keywords ?? meta.answers ?? [];
        return h('span', { class: 'text-sm font-medium' }, keywords.join(' / '));
      }

      // ── ordering ─────────────────────────────────────────────────────────
      if (type === 'ordering') {
        const items: any[] = meta.items ?? [];
        if (props.userAnswer) {
          const order: number[] = userAns?.order ?? [];
          if (!order.length) return noAnswer();
          return h('div', { class: 'flex flex-col gap-1' },
            order.map((id: number, i: number) => {
              const item = items.find((it: any) => it.order_id === id);
              return h('span', { class: 'text-sm' }, `${i + 1}. ${item?.text ?? id}`);
            }),
          );
        }
        // No correct_order field in backend — correct order is items sorted by order_id asc
        const correctItems = [...items].sort((a, b) => a.order_id - b.order_id);
        return h('div', { class: 'flex flex-col gap-1' },
          correctItems.map((item: any, i: number) =>
            h('span', { class: 'text-sm' }, `${i + 1}. ${item.text}`),
          ),
        );
      }

      // ── matching ─────────────────────────────────────────────────────────
      if (type === 'matching') {
        const pairs: any[] = meta.pairs ?? [];
        if (props.userAnswer) {
          const matches: any[] = userAns?.matches ?? [];
          if (!matches.length) return noAnswer();
          return h('div', { class: 'flex flex-col gap-1' },
            matches.map((m: any) => {
              const leftPair  = pairs.find((p: any) => p.id === m.leftId);
              const rightPair = pairs.find((p: any) => p.id === m.rightId);
              // A match is correct when leftId === rightId (same pair id)
              const isRowCorrect = m.leftId === m.rightId;
              return h('span', {
                class: `text-sm ${isRowCorrect ? 'text-green-700' : 'text-red-600'}`,
              }, `${leftPair?.left ?? m.leftId} → ${rightPair?.right ?? m.rightId}`);
            }),
          );
        }
        return h('div', { class: 'flex flex-col gap-1' },
          pairs.map((p: any) =>
            h('span', { class: 'text-sm text-green-700' }, `${p.left} → ${p.right}`),
          ),
        );
      }

      return h('span', { class: 'text-xs text-gray-400 italic' }, 'N/A');
    };
  },
});
</script>