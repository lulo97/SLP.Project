<template>
  <MobileLayout :title="quizStore.currentQuiz?.title || 'Quiz'">
    <div
      v-if="quizStore.loading"
      class="text-center py-8"
      data-testid="quiz-view-loading"
    >
      <a-spin />
    </div>
    <div v-else-if="quizStore.currentQuiz" class="space-y-4">
      <!-- Info card (always visible) -->
      <QuizInfoCard
        :quiz="quizStore.currentQuiz"
        :total-questions="questions.length"
      />

      <!-- Report Quiz card (visible to authenticated users) -->
      <a-card
        v-if="isAuthenticated"
        class="shadow-sm"
        data-testid="report-quiz-card"
      >
        <div class="flex items-center justify-between">
          <span>Find something wrong with this quiz?</span>
          <a-button
            @click="reportModalVisible = true"
            danger
            ghost
            data-testid="report-quiz-button"
          >
            <FlagOutlined /> Report Quiz
          </a-button>
        </div>
      </a-card>

      <ReportModal
        v-model:visible="reportModalVisible"
        target-type="quiz"
        :target-id="quizId"
      />

      <!-- Notes section – only visible to owner (notes are private) -->
      <NotesSection
        v-if="isOwner"
        :notes="notes"
        :loading="quizStore.notesLoading"
        @add="handleAddNote"
        @remove="handleRemoveNote"
      />

      <!-- Sources section – visible to all, but actions disabled for non-owner -->
      <SourcesSection
        :sources="sources"
        :loading="quizStore.sourcesLoading"
        :can-edit="isOwner"
        :readonly="!isOwner"
        :available-sources="sourceStore.sources"
        :available-sources-loading="sourceStore.loading"
        @attach="handleAttachSources"
        @detach="handleDetachSource"
      />

      <!-- Attempts section (anyone can start an attempt) -->
      <a-card
        title="Your Attempts"
        class="shadow-sm mt-4"
        data-testid="attempts-section"
      >
        <template #extra>
          <template v-if="questions.length === 0">
            <a-tooltip
              title="Cannot start attempt because this quiz has no questions"
            >
              <span>
                <a-button
                  type="primary"
                  size="small"
                  disabled
                  data-testid="start-attempt-button"
                >
                  Start Attempt
                </a-button>
              </span>
            </a-tooltip>
          </template>
          <template v-else>
            <a-button
              type="primary"
              size="small"
              @click="startAttempt"
              :loading="attemptStore.loading"
              data-testid="start-attempt-button"
            >
              Start Attempt
            </a-button>
          </template>
        </template>
        <a-list
          :data-source="attemptStore.userAttempts"
          size="small"
          data-testid="attempts-list"
        >
          <template #renderItem="{ item }">
            <a-list-item :data-testid="`attempt-item-${item.id}`">
              <a-list-item-meta>
                <template #title>
                  <span>Attempt #{{ item.id }}</span>
                </template>
                <template #description>
                  {{ new Date(item.startTime).toLocaleString() }} -
                  <span
                    :class="{
                      'text-green-600': item.status === 'completed',
                      'text-yellow-600': item.status === 'in_progress',
                      'text-gray-600': item.status === 'abandoned',
                    }"
                  >
                    {{ item.status }}
                  </span>
                  <span v-if="item.score !== null">
                    - Score: {{ item.score }}/{{ item.maxScore }}</span
                  >
                </template>
              </a-list-item-meta>
              <template #actions>
                <span
                  v-if="item.status === 'completed'"
                  @click="goToReview(item.id)"
                  data-testid="review-attempt"
                  >Review</span
                >
                <span
                  v-else-if="item.status === 'in_progress'"
                  @click="resumeAttempt(item.id)"
                  data-testid="resume-attempt"
                  >Resume</span
                >
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>

      <!-- Questions section – readonly mode for non-owner -->
      <QuestionsSection :questions="questions" :readonly="!isOwner" />

      <CommentsSection target-type="quiz" :target-id="quizId" />

      <!-- Actions card – only owner sees edit/duplicate/delete -->
      <QuizActionsCard
        v-if="isOwner"
        :quiz-id="quizId"
        :can-edit="true"
        @duplicate="handleDuplicate"
        @delete="handleDelete"
      />
    </div>
    <div
      v-else
      class="text-center py-8 text-gray-500"
      data-testid="quiz-not-found"
    >
      Quiz not found or is not accessible.
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useQuizStore } from "../stores/quizStore";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useSourceStore } from "@/features/source/stores/sourceStore";
import { useAttemptStore } from "@/features/quiz-attempt/stores/attemptStore";
import { useQuizQuestions } from "../composables/useQuizQuestions";
import { FlagOutlined } from "@ant-design/icons-vue";

// Components
import QuizInfoCard from "../components/QuizInfoCard.vue";
import NotesSection from "../components/NotesSection.vue";
import SourcesSection from "../components/SourcesSection.vue";
import QuestionsSection from "../components/QuestionsSection.vue";
import QuizActionsCard from "../components/QuizActionsCard.vue";
import CommentsSection from "@/features/comment/components/CommentsSection.vue";
import ReportModal from "@/features/report/components/ReportModal.vue";

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const authStore = useAuthStore();
const sourceStore = useSourceStore();
const attemptStore = useAttemptStore();

const quizId = computed(() => Number(route.params.id));
const reportModalVisible = ref(false);
const isAuthenticated = computed(() => authStore.isAuthenticated);

const isOwner = computed(() => {
  const quiz = quizStore.currentQuiz;
  return !!quiz && authStore.user?.id === quiz.userId;
});

// ─── Notes ───

const notes = computed(() => quizStore.notes);

const handleAddNote = async (note: { title: string; content: string }) => {
  try {
    await quizStore.addNoteToQuiz(quizId.value, note);
    // Store updates notes array in-place — no re-fetch needed
    message.success("Note added");
  } catch (err) {
    message.error("Failed to add note");
  }
};

const handleRemoveNote = async (noteId: number) => {
  const success = await quizStore.removeNoteFromQuiz(quizId.value, noteId);
  // Store filters notes array in-place — no re-fetch needed
  if (success) {
    message.success("Note removed");
  } else {
    message.error("Failed to remove note");
  }
};

// ─── Sources ───

const sources = computed(() => quizStore.sources);

const handleAttachSources = async (sourceIds: number[]) => {
  try {
    // Fire all attaches in parallel — no sequential blocking
    await Promise.all(
      sourceIds.map((sourceId) =>
        quizStore.addSourceToQuiz(quizId.value, sourceId),
      ),
    );
    // Store updates sources array in-place — no re-fetch needed
    message.success("Sources attached");
  } catch (err) {
    message.error("Failed to attach some sources");
  }
};

const handleDetachSource = async (sourceId: number) => {
  const success = await quizStore.removeSourceFromQuiz(quizId.value, sourceId);
  // Store filters sources array in-place — no re-fetch needed
  if (success) {
    message.success("Source detached");
  } else {
    message.error("Failed to detach source");
  }
};

// ─── Questions ───

const { questions, loadQuestions } = useQuizQuestions(quizId.value);

// ─── Attempts ───

const startAttempt = async () => {
  try {
    const result = await attemptStore.startAttempt(quizId.value);
    router.push(`/quiz/${quizId.value}/attempt/${result.attemptId}`);
  } catch (err) {
    message.error("Could not start attempt");
  }
};

const resumeAttempt = (attemptId: number) => {
  router.push(`/quiz/${quizId.value}/attempt/${attemptId}`);
};

const goToReview = (attemptId: number) => {
  router.push(`/quiz/attempt/${attemptId}/review`);
};

// ─── Quiz actions ───

const handleDuplicate = async () => {
  const duplicated = await quizStore.duplicateQuiz(quizId.value);
  if (duplicated) {
    message.success("Quiz duplicated");
    router.push(`/quiz/${duplicated.id}/edit`);
  } else {
    message.error("Failed to duplicate");
  }
};

const handleDelete = async () => {
  const success = await quizStore.deleteQuiz(quizId.value);
  if (success) {
    message.success("Quiz deleted");
    router.push("/quiz");
  } else {
    message.error("Failed to delete");
  }
};

// ─── Initial load (only runs once on mount) ───

onMounted(async () => {
  await quizStore.fetchQuizById(quizId.value);
  // Only fetch notes if owner (privacy)
  if (isOwner.value) {
    await quizStore.fetchQuizNotes(quizId.value);
  }
  await quizStore.fetchQuizSources(quizId.value);
  await sourceStore.fetchSources();
  await attemptStore.fetchUserAttemptsForQuiz(quizId.value);
  await loadQuestions();
});
</script>
