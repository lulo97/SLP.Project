<template>
  <MobileLayout :title="`Review: ${review?.quizTitle || 'Attempt'}`">
    <div v-if="loading || attemptStore.loading" class="text-center py-8">
      <a-spin data-testid="review-loading" />
    </div>
    <div v-else-if="review" class="space-y-4">
      <!-- Score card -->
      <a-card class="shadow-sm" data-testid="score-card">
        <div class="text-center">
          <h2 class="text-2xl font-bold">{{ review.score }} / {{ review.maxScore }}</h2>
          <p class="text-gray-600">{{ ((review.score / review.maxScore) * 100).toFixed(0) }}%</p>
          <p class="text-sm text-gray-500">
            Completed: {{ new Date(review.endTime!).toLocaleString() }}
          </p>
        </div>
      </a-card>

      <!-- Questions list -->
      <a-card v-for="(ans, idx) in review.answerReview" :key="ans.id" class="shadow-sm" :data-testid="`review-question-${idx}`">
        <div class="flex items-start gap-2">
          <span class="font-medium">{{ Number(idx) + 1 }}.</span>
          <div class="flex-1">
            <!-- Display question with answer (readonly) -->
            <div class="mb-2">
              <QuestionDisplay
                :question="{ questionSnapshotJson: ans.questionSnapshotJson }"
                :answer="JSON.parse(ans.answerJson)"
                readonly
              />
            </div>
            <div class="mt-2 text-sm">
              <span :class="ans.isCorrect ? 'text-green-600' : 'text-red-600'" data-testid="correctness">
                {{ ans.isCorrect ? '✓ Correct' : '✗ Incorrect' }}
              </span>
              <p v-if="!ans.isCorrect && correctAnswerText(ans)" class="text-gray-600" data-testid="correct-answer">
                Correct answer: {{ correctAnswerText(ans) }}
              </p>
              <p v-if="explanation(ans)" class="text-gray-500 italic" data-testid="explanation">
                {{ explanation(ans) }}
              </p>
            </div>
          </div>
        </div>
      </a-card>

      <!-- Back to quiz button -->
      <div class="flex justify-center mt-4">
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
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useAttemptStore } from '../stores/attemptStore';
import QuestionDisplay from '../components/QuestionDisplay.vue';

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

function correctAnswerText(ans: any) {
  const q = JSON.parse(ans.questionSnapshotJson);
  const type = q.type;
  if (type === 'multiple_choice') {
    const correctIds = q.metadata.correct || [];
    const texts = correctIds.map((id: number) => {
      const opt = q.metadata.options.find((o: any) => o.id === id);
      return opt?.text || '';
    }).filter(Boolean);
    return texts.join(', ');
  }
  if (type === 'single_choice') {
    const correctId = q.metadata.correct?.[0];
    const opt = q.metadata.options.find((o: any) => o.id === correctId);
    return opt?.text || '';
  }
  if (type === 'true_false') {
    return q.metadata.correct ? 'True' : 'False';
  }
  if (type === 'fill_blank') {
    return q.metadata.answers.join(' / ');
  }
  if (type === 'ordering') {
    const items = q.metadata.items || [];
    const correctOrder = q.metadata.correct_order || [];
    return correctOrder.map((idx: number) => items[idx]?.text).join(' → ');
  }
  if (type === 'matching') {
    const pairs = q.metadata.pairs || [];
    return pairs.map((p: any) => `${p.left} → ${p.right}`).join('; ');
  }
  return '';
}

function explanation(ans: any) {
  const q = JSON.parse(ans.questionSnapshotJson);
  return q.explanation || '';
}

function goToQuiz() {
  router.push(`/quiz/${review.value?.quizId}`);
}
</script>