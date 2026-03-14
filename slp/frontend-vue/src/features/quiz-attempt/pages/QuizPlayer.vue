<template>
  <MobileLayout :title="`Quiz: ${quizTitle}`">
    <div v-if="loading || attemptStore.loading" class="text-center py-8">
      <a-spin data-testid="player-loading" />
    </div>
    <div v-else-if="attemptValue" class="player-container space-y-4">
      <!-- Header with progress and timer -->
      <div class="flex justify-between items-center">
        <div>
          <span class="font-medium" data-testid="player-progress">
            Question {{ composable.currentIndex.value + 1 }} of {{ attemptValue.questionCount }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <AutoSaveIndicator :saving="composable.saving.value" data-testid="auto-save-indicator" />
          <a-button size="small" @click="showSidebar = true" data-testid="open-sidebar">
            <MenuOutlined />
          </a-button>
        </div>
      </div>

      <!-- Main question area -->
      <div class="bg-white rounded-lg p-4 shadow" data-testid="question-display">
        <QuestionDisplay
          v-if="composable.currentQuestion"
          :question="composable.currentQuestion"
          :answer="composable.currentAnswer"
          @answer-change="composable.handleAnswerChange"
        />
        <div v-else class="text-center py-4 text-gray-500">
          Loading question...
        </div>
      </div>

      <!-- Navigation buttons -->
      <div class="flex justify-between">
        <a-button
          @click="composable.prevQuestion"
          :disabled="composable.currentIndex.value === 0"
          data-testid="prev-question"
        >
          Previous
        </a-button>
        <a-button
          v-if="composable.currentIndex.value < (attemptValue.questionCount - 1)"
          type="primary"
          @click="composable.nextQuestion"
          data-testid="next-question"
        >
          Next
        </a-button>
        <a-button
          v-else
          type="primary"
          @click="openSubmitModal"
          data-testid="submit-attempt"
        >
          Submit
        </a-button>
      </div>

      <!-- Sidebar drawer for question navigation -->
      <a-drawer
        :open="showSidebar"
        @close="showSidebar = false"
        placement="right"
        title="Questions"
        data-testid="question-sidebar"
      >
        <div class="grid grid-cols-3 gap-2">
          <a-button
            v-for="(q, idx) in attemptValue.questions"
            :key="q.quizQuestionId"
            :type="idx === composable.currentIndex.value ? 'primary' : 'default'"
            @click="composable.goToQuestion(idx); showSidebar = false"
            :data-testid="`sidebar-question-${idx}`"
          >
            {{ idx + 1 }}
          </a-button>
        </div>
      </a-drawer>

      <!-- Submit confirmation modal -->
      <a-modal
        v-model:open="showSubmitModal"
        title="Submit Quiz"
        @ok="handleSubmit"
        @cancel="showSubmitModal = false"
        ok-text="Yes, submit"
        cancel-text="Cancel"
        data-testid="submit-modal"
      >
        <p>Are you sure you want to submit? You cannot change your answers after submission.</p>
      </a-modal>
    </div>
    <div v-else class="text-center py-8 text-gray-500" data-testid="attempt-not-found">
      Attempt not found.
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { MenuOutlined } from '@ant-design/icons-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useAttemptStore } from '../stores/attemptStore';
import { useAttempt } from '../composables/useAttempt';
import QuestionDisplay from '../components/QuestionDisplay.vue';
import AutoSaveIndicator from '../components/AutoSaveIndicator.vue';
import { useQuizStore } from '@/features/quiz/stores/quizStore';

const route = useRoute();
const router = useRouter();
const attemptStore = useAttemptStore();
const quizStore = useQuizStore();

const quizId = computed(() => Number(route.params.quizId));
const attemptIdParam = computed(() => route.params.attemptId ? Number(route.params.attemptId) : undefined);

const showSidebar = ref(false);
const showSubmitModal = ref(false);
const quizTitle = ref('');

const composable = useAttempt(quizId.value);

console.log('[QuizPlayer] composable created', { composable });

const attemptValue = computed(() => {
  const val = composable.attempt?.value ?? null;
  if (val) {
    if (!val.questions || !Array.isArray(val.questions)) {
      console.error('[QuizPlayer] attemptValue: questions is missing or not an array', val);
    } else if (val.questions.length === 0) {
      console.error('[QuizPlayer] attemptValue: questions array is empty', val);
    } else {
      console.log('[QuizPlayer] attemptValue:', {
        attemptId: val.attemptId,
        questionCount: val.questionCount,
        firstQuestionSnapshot: val.questions[0]?.questionSnapshotJson?.slice(0, 50)
      });
    }
  }
  return val;
});

watch(attemptValue, (val) => {
  console.log('[QuizPlayer] attemptValue changed:', val ? {
    attemptId: val.attemptId,
    questionCount: val.questionCount,
    questionsLength: val.questions?.length
  } : null);
}, { immediate: true });

watch(() => composable.currentQuestion, (newVal) => {
  console.log('[QuizPlayer] currentQuestion changed:', newVal ? {
    quizQuestionId: newVal.value?.quizQuestionId,
    hasSnapshot: !!newVal.value?.questionSnapshotJson,
    snapshotType: typeof newVal.value?.questionSnapshotJson,
    snapshotLength: newVal.value?.questionSnapshotJson?.length
  } : null);
}, { immediate: true });

const loading = ref(true);

onMounted(async () => {
  try {
    await quizStore.fetchQuizById(quizId.value);
    quizTitle.value = quizStore.currentQuiz?.title || 'Quiz';
    await composable.loadAttempt(attemptIdParam.value);
    if (!composable.attempt.value) {
      throw new Error('loadAttempt completed but attempt.value is null');
    }
  } catch (err) {
    console.error('[QuizPlayer] onMounted error:', err);
    message.error('Failed to load attempt');
    router.push(`/quiz/${quizId.value}`);
  } finally {
    loading.value = false;
  }
});

const openSubmitModal = () => {
  showSubmitModal.value = true;
};

const handleSubmit = async () => {
  showSubmitModal.value = false;
  try {
    const result = await composable.submitAttempt();
    if (result) {
      message.success('Quiz submitted');
      router.push(`/quiz/attempt/${result.id}/review`);
    } else {
      message.error('Submission failed');
    }
  } catch (err) {
    console.error('[QuizPlayer] submitAttempt error:', err);
    message.error('Submission failed');
  }
};
</script>