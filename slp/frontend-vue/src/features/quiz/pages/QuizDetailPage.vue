<template>
  <MobileLayout :title="quizStore.currentQuiz?.title || 'Quiz Details'">
    <div v-if="quizStore.loading" class="text-center py-8" data-testid="quiz-detail-loading">
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
      />

      <QuestionsSection
        :questions="questions"
        @add="openQuestionModal('create')"
        @edit="(q) => openQuestionModal('edit', q)"
        @delete="handleDeleteQuestion"
        @insert="(idx) => openQuestionModal('insert', undefined, idx)"
      />

      <QuizActionsCard
        :quiz-id="quizId"
        :can-edit="canEdit"
        @duplicate="handleDuplicate"
        @delete="handleDelete"
      />
    </div>
    <div v-else class="text-center py-8 text-gray-500" data-testid="quiz-not-found">Quiz not found.</div>

    <!-- Modal – no insert-index needed -->
    <QuestionFormModal
      v-model:visible="showQuestionModal"
      :question="editingQuestion"
      @saved="handleQuestionSaved"
    />
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useQuizStore } from '../stores/quizStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useSourceStore } from '@/features/source/stores/sourceStore';
import { useQuizQuestions } from '../composables/useQuizQuestions';
import type { CreateQuestionPayload } from '@/features/question/stores/questionStore';
import type { DisplayQuestion } from '../types';

// Components
import QuizInfoCard from '../components/QuizInfoCard.vue';
import NotesSection from '../components/NotesSection.vue';
import SourcesSection from '../components/SourcesSection.vue';
import QuestionsSection from '../components/QuestionsSection.vue';
import QuizActionsCard from '../components/QuizActionsCard.vue';
import QuestionFormModal from '../components/QuestionFormModal.vue';

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const authStore = useAuthStore();
const sourceStore = useSourceStore();

const quizId = computed(() => Number(route.params.id));

// Fix: always return boolean
const canEdit = computed(() => {
  const quiz = quizStore.currentQuiz;
  return !!quiz && (authStore.isAdmin || quiz.userId === authStore.user?.id);
});

// Notes
const notes = computed(() => quizStore.notes);
const handleAddNote = async (note: { title: string; content: string }) => {
  try {
    await quizStore.addNoteToQuiz(quizId.value, note);
    message.success('Note added');
    await quizStore.fetchQuizNotes(quizId.value);
  } catch (err) {
    message.error('Failed to add note');
  }
};
const handleRemoveNote = async (noteId: number) => {
  const success = await quizStore.removeNoteFromQuiz(quizId.value, noteId);
  if (success) {
    message.success('Note removed');
    await quizStore.fetchQuizNotes(quizId.value);
  } else {
    message.error('Failed to remove note');
  }
};

// Sources
const sources = computed(() => quizStore.sources);
const handleAttachSources = async (sourceIds: number[]) => {
  try {
    for (const sourceId of sourceIds) {
      await quizStore.addSourceToQuiz(quizId.value, sourceId);
    }
    message.success('Sources attached');
    await quizStore.fetchQuizSources(quizId.value);
  } catch (err) {
    message.error('Failed to attach some sources');
  }
};
const handleDetachSource = async (sourceId: number) => {
  const success = await quizStore.removeSourceFromQuiz(quizId.value, sourceId);
  if (success) {
    message.success('Source detached');
    await quizStore.fetchQuizSources(quizId.value);
  } else {
    message.error('Failed to detach source');
  }
};

// Questions
const { questions, loadQuestions, createQuestion, updateQuestion, deleteQuestion } =
  useQuizQuestions(quizId.value);

const showQuestionModal = ref(false);
const editingQuestion = ref<DisplayQuestion | undefined>();
const insertIndex = ref<number | undefined>();

const openQuestionModal = (
  action: 'create' | 'edit' | 'insert',
  question?: DisplayQuestion,
  index?: number
) => {
  if (action === 'edit' && question) {
    editingQuestion.value = question;
    insertIndex.value = undefined;
  } else if (action === 'insert') {
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
  existingId?: number
) => {
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
      message.success('Question updated');
    } else {
      let newOrder = 1;
      if (
        insertIndex.value !== undefined &&
        insertIndex.value >= 0 &&
        insertIndex.value <= questions.value.length
      ) {
        newOrder = insertIndex.value + 1;
        // Shift subsequent questions
        const toUpdate = questions.value.filter((q) => q.displayOrder >= newOrder);
        for (const q of toUpdate) {
          await updateQuestion(q.id, q.questionSnapshotJson, q.displayOrder + 1);
        }
      } else {
        newOrder = questions.value.length
          ? Math.max(...questions.value.map((q) => q.displayOrder)) + 1
          : 1;
      }
      await createQuestion(snapshotJson, newOrder);
      message.success('Question created');
    }
    await loadQuestions();
  } catch (error) {
    message.error('Operation failed');
  } finally {
    showQuestionModal.value = false;
    editingQuestion.value = undefined;
    insertIndex.value = undefined;
  }
};

const handleDeleteQuestion = async (questionId: number) => {
  await deleteQuestion(questionId);
};

// Quiz actions
const handleDuplicate = async () => {
  const duplicated = await quizStore.duplicateQuiz(quizId.value);
  if (duplicated) {
    message.success('Quiz duplicated');
    router.push(`/quiz/${duplicated.id}/edit`);
  } else {
    message.error('Failed to duplicate');
  }
};

const handleDelete = async () => {
  const success = await quizStore.deleteQuiz(quizId.value);
  if (success) {
    message.success('Quiz deleted');
    router.push('/quiz');
  } else {
    message.error('Failed to delete');
  }
};

// Initial load
onMounted(async () => {
  await quizStore.fetchQuizById(quizId.value);
  await loadQuestions();
  await quizStore.fetchQuizNotes(quizId.value);
  await quizStore.fetchQuizSources(quizId.value);
  await sourceStore.fetchSources();
});
</script>