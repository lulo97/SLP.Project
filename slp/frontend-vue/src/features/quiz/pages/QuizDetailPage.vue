<template>
  <MobileLayout :title="quizStore.currentQuiz?.title || 'Quiz Details'">
    <div
      v-if="quizStore.loading"
      class="text-center py-8"
      data-testid="quiz-detail-loading"
    >
      <a-spin />
    </div>
    <div v-else-if="quizStore.currentQuiz" class="space-y-4">
      <QuizInfoCard
        :quiz="quizStore.currentQuiz"
        :total-questions="questions.length"
      />

      <NotesSection
        :notes="notes"
        :loading="quizStore.notesLoading"
        @add="handleAddNote"
        @edit="handleEditNote"
        @remove="handleRemoveNote"
      />

      <SourcesSection
        :sources="sources"
        :loading="quizStore.sourcesLoading"
        :can-edit="canEdit"
        :available-sources="sourceStore.sources"
        :available-sources-loading="sourceStore.loading"
        @attach="handleAttachSources"
        @detach="handleDetachSource"
        @view="handleViewSource"
      />

      <!-- Attempts Section -->
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

      <QuestionsSection
        :questions="questions"
        @add="openQuestionModal('create')"
        @edit="(q) => openQuestionModal('edit', q)"
        @delete="handleDeleteQuestion"
        @insert="(idx) => openQuestionModal('insert', undefined, idx)"
        @find="handleFindQuestion"
      />

      <QuizActionsCard
        :quiz-id="quizId"
        :can-edit="canEdit"
        @duplicate="handleDuplicate"
        @delete="handleDelete"
      />
    </div>
    <div
      v-else
      class="text-center py-8 text-gray-500"
      data-testid="quiz-not-found"
    >
      Quiz not found.
    </div>

    <!-- Modal -->
    <QuestionFormModal
      v-model:visible="showQuestionModal"
      :question="editingQuestion"
      @saved="handleQuestionSaved"
    />

    <QuestionPickerModal
      v-model:visible="showQuestionPicker"
      @select="handleSelectQuestion"
    />
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
import { useQuizQuestions } from "../composables/useQuizQuestions";
import type { CreateQuestionPayload } from "@/features/question/stores/questionStore";
import type { DisplayQuestion } from "../types";
import QuestionPickerModal from "../components/QuestionPickerModal.vue";

// Components
import QuizInfoCard from "../components/QuizInfoCard.vue";
import NotesSection from "../components/NotesSection.vue";
import SourcesSection from "../components/SourcesSection.vue";
import QuestionsSection from "../components/QuestionsSection.vue";
import QuizActionsCard from "../components/QuizActionsCard.vue";
import QuestionFormModal from "../components/QuestionFormModal.vue";
import { useAttemptStore } from "@/features/quiz-attempt/stores/attemptStore";

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const authStore = useAuthStore();
const sourceStore = useSourceStore();
const attemptStore = useAttemptStore();

const quizId = computed(() => Number(route.params.id));

const canEdit = computed(() => {
  const quiz = quizStore.currentQuiz;
  return !!quiz && (authStore.isAdmin || quiz.userId === authStore.user?.id);
});

// ─── Attempt actions ───

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

const handleEditNote = async (
  id: number,
  note: { title: string; content: string },
) => {
  try {
    await quizStore.updateNote(id, note);
    // Store patches notes array in-place — no re-fetch needed
    message.success("Note updated");
  } catch (err) {
    message.error("Failed to update note");
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

const handleViewSource = (sourceId: number) => {
  router.push(`/source/${sourceId}`);
};

// ─── Questions ───

const {
  questions,
  saving,
  loadQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} = useQuizQuestions(quizId.value);

const showQuestionModal = ref(false);
const editingQuestion = ref<DisplayQuestion | undefined>();
const insertIndex = ref<number | undefined>();
const showQuestionPicker = ref(false);

const handleFindQuestion = () => {
  showQuestionPicker.value = true;
};

const handleSelectQuestion = async (selectedQuestion: any) => {
  const snapshot = {
    type: selectedQuestion.type,
    content: selectedQuestion.content,
    explanation: selectedQuestion.explanation,
    metadata: selectedQuestion.metadataJson
      ? JSON.parse(selectedQuestion.metadataJson)
      : {},
    tags: selectedQuestion.tags || [],
  };
  const snapshotJson = JSON.stringify(snapshot);

  const newOrder = questions.value.length
    ? Math.max(...questions.value.map((q) => q.displayOrder)) + 1
    : 1;

  try {
    await createQuestion(snapshotJson, newOrder, selectedQuestion.id);
    // createQuestion already updates local array — no loadQuestions() needed
    message.success("Question added");
  } catch (error) {
    message.error("Failed to add question");
  }
};

const openQuestionModal = (
  action: "create" | "edit" | "insert",
  question?: DisplayQuestion,
  index?: number,
) => {
  if (action === "edit" && question) {
    editingQuestion.value = question;
    insertIndex.value = undefined;
  } else if (action === "insert") {
    editingQuestion.value = undefined;
    insertIndex.value = index;
  } else {
    editingQuestion.value = undefined;
    insertIndex.value = undefined;
  }
  showQuestionModal.value = true;
};

const handleQuestionSaved = async (
  payload: CreateQuestionPayload,
  existingId?: number,
) => {
  saving.value = true;
  try {
    const snapshot = {
      type: payload.type,
      content: payload.content,
      explanation: payload.explanation,
      metadata: payload.metadataJson ? JSON.parse(payload.metadataJson) : {},
      tags: payload.tagNames || [],
    };
    const snapshotJson = JSON.stringify(snapshot);

    if (existingId) {
      const question = questions.value.find((q) => q.id === existingId);
      if (!question) return;
      await updateQuestion(existingId, snapshotJson, question.displayOrder);
      // updateQuestion patches local array in-place — no loadQuestions() needed
      message.success("Question updated");
    } else {
      let newOrder: number;
      if (
        insertIndex.value !== undefined &&
        insertIndex.value >= 0 &&
        insertIndex.value <= questions.value.length
      ) {
        newOrder = insertIndex.value + 1;
        // Shift subsequent questions in parallel
        const toShift = questions.value.filter(
          (q) => q.displayOrder >= newOrder,
        );
        await Promise.all(
          toShift.map((q) =>
            updateQuestion(q.id, q.questionSnapshotJson, q.displayOrder + 1),
          ),
        );
      } else {
        newOrder = questions.value.length
          ? Math.max(...questions.value.map((q) => q.displayOrder)) + 1
          : 1;
      }
      await createQuestion(snapshotJson, newOrder);
      // createQuestion pushes to local array — no loadQuestions() needed
      message.success("Question created");
    }
  } catch (error) {
    message.error("Operation failed");
  } finally {
    saving.value = false;
    showQuestionModal.value = false;
    editingQuestion.value = undefined;
    insertIndex.value = undefined;
  }
};

const handleDeleteQuestion = async (questionId: number) => {
  // deleteQuestion filters local array in-place — no loadQuestions() needed
  await deleteQuestion(questionId);
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
  await loadQuestions();
  await quizStore.fetchQuizNotes(quizId.value);
  await quizStore.fetchQuizSources(quizId.value);
  await sourceStore.fetchSources();
  await attemptStore.fetchUserAttemptsForQuiz(quizId.value);
});
</script>
