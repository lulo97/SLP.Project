<template>
  <MobileLayout :title="quizStore.currentQuiz?.title || 'Quiz Details'">
    <div v-if="quizStore.loading" class="text-center py-8">
      <a-spin />
    </div>
    <div v-else-if="quizStore.currentQuiz" class="space-y-4">
      <!-- Quiz Info Card -->
      <a-card>
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-xl font-semibold">{{ quizStore.currentQuiz.title }}</h2>
            <p class="text-gray-600">{{ quizStore.currentQuiz.description || 'No description' }}</p>
          </div>
          <a-tag :color="quizStore.currentQuiz.visibility === 'public' ? 'green' : 'blue'">
            {{ quizStore.currentQuiz.visibility }}
          </a-tag>
        </div>
        <div class="flex items-center mt-4 text-sm text-gray-500">
          <span>Created by {{ quizStore.currentQuiz.userName || 'Unknown' }}</span>
          <a-divider type="vertical" />
          <span>{{ totalQuestions }} questions</span>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <a-tag v-for="tag in quizStore.currentQuiz.tags" :key="tag">{{ tag }}</a-tag>
        </div>
      </a-card>

      <!-- Notes Section (frontend only) -->
      <a-card title="My Notes" class="shadow-sm">
        <div class="space-y-2">
          <div v-for="(note, idx) in notes" :key="idx" class="flex items-start gap-2">
            <a-textarea v-model:value="notes[idx]" :rows="2" class="flex-1" />
            <a-button @click="removeNote(idx)" type="text" danger size="small">
              <DeleteOutlined />
            </a-button>
          </div>
          <a-button @click="addNote" block type="dashed">
            <PlusOutlined /> Add Note
          </a-button>
        </div>
      </a-card>

      <!-- Sources Section (frontend only) -->
      <a-card title="Sources" class="shadow-sm">
        <div class="flex flex-wrap gap-2 mb-3">
          <a-tag v-for="src in attachedSources" :key="src.id" closable @close="detachSource(src.id)">
            {{ src.name }}
          </a-tag>
          <span v-if="!attachedSources.length" class="text-gray-400 text-sm">No sources attached</span>
        </div>
        <a-button @click="showSourceModal = true" block type="dashed">
          <PlusOutlined /> Attach Source
        </a-button>
      </a-card>

      <!-- Questions Section -->
      <a-card title="Questions" class="shadow-sm">
        <div class="mb-2 flex justify-between items-center">
          <span class="font-medium">Total: {{ totalQuestions }}</span>
          <a-button type="primary" size="small" @click="openQuestionModal('create')">
            <PlusOutlined /> Add Question
          </a-button>
        </div>

        <div v-if="!questions.length" class="text-center py-4 text-gray-500">
          No questions yet.
        </div>

        <div v-else class="questions-list max-h-96 overflow-y-auto space-y-2 pr-1">
          <div v-for="(q, index) in questions" :key="q.id" class="relative">
            <!-- Question Item -->
            <div class="flex items-center gap-2 p-2 bg-gray-50 rounded border">
              <!-- Left side: edit/delete -->
              <div class="flex flex-col gap-1">
                <a-button @click="openQuestionModal('edit', q)" size="small" type="text">
                  <EditOutlined />
                </a-button>
                <a-button @click="deleteQuestion(q.id)" size="small" type="text" danger>
                  <DeleteOutlined />
                </a-button>
              </div>
              <!-- Question content (truncated) -->
              <div class="flex-1 text-sm truncate">{{ q.content }}</div>
              <!-- Right side: index -->
              <div class="text-xs text-gray-400 font-mono w-6 text-center">{{ index + 1 }}</div>
            </div>
            <!-- Insert button between questions (except after last) -->
            <div v-if="index < questions.length - 1" class="flex justify-center my-1">
              <a-button @click="openQuestionModal('insert', undefined, index + 1)" size="small" type="dashed" class="w-full text-xs">
                <PlusOutlined /> Insert Question
              </a-button>
            </div>
          </div>
        </div>
      </a-card>

      <!-- Existing actions card (Edit, Duplicate, Delete) -->
      <a-card title="Actions" class="shadow-sm">
        <div class="space-y-2">
          <a-button block @click="router.push(`/quiz/${quizStore.currentQuiz.id}/edit`)" v-if="canEdit">
            <EditOutlined /> Edit Quiz
          </a-button>
          <a-button block @click="handleDuplicate">
            <CopyOutlined /> Duplicate
          </a-button>
          <a-popconfirm
            title="Delete this quiz?"
            ok-text="Yes"
            cancel-text="No"
            @confirm="handleDelete"
          >
            <a-button block danger v-if="canEdit">
              <DeleteOutlined /> Delete Quiz
            </a-button>
          </a-popconfirm>
        </div>
      </a-card>
    </div>
    <div v-else class="text-center py-8 text-gray-500">
      Quiz not found.
    </div>

    <!-- Source Attachment Modal (mock sources) -->
    <a-modal v-model:visible="showSourceModal" title="Attach Sources" @ok="attachSources" ok-text="Attach">
      <a-checkbox-group v-model:value="selectedSourceIds" class="flex flex-col gap-2">
        <a-checkbox v-for="src in availableSources" :key="src.id" :value="src.id">
          {{ src.name }}
        </a-checkbox>
      </a-checkbox-group>
    </a-modal>

    <!-- Question Form Modal (handles snapshots) -->
    <QuestionFormModal
      v-model:visible="showQuestionModal"
      :question="editingQuestion"
      :insert-index="insertIndex"
      @saved="handleQuestionSaved"
    />
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useQuizStore } from '../stores/quizStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import QuestionFormModal from '../components/QuestionFormModal.vue';
import type { CreateQuestionPayload } from '@/features/question/stores/questionStore'; // for payload shape

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const authStore = useAuthStore();

const quizId = computed(() => Number(route.params.id));
const canEdit = computed(() => {
  const quiz = quizStore.currentQuiz;
  return quiz && (authStore.isAdmin || quiz.userId === authStore.user?.id);
});

// ==================== Notes (frontend only) ====================
const notes = ref<string[]>([]);
const addNote = () => notes.value.push('');
const removeNote = (idx: number) => notes.value.splice(idx, 1);

// ==================== Sources (mock) ====================
interface Source {
  id: number;
  name: string;
}
const availableSources = ref<Source[]>([
  { id: 1, name: 'Wikipedia' },
  { id: 2, name: 'Textbook' },
  { id: 3, name: 'Lecture Notes' },
  { id: 4, name: 'Research Paper' },
]);
const attachedSources = ref<Source[]>([]);
const showSourceModal = ref(false);
const selectedSourceIds = ref<number[]>([]);

const attachSources = () => {
  const newSources = availableSources.value.filter(s => selectedSourceIds.value.includes(s.id));
  attachedSources.value = [...attachedSources.value, ...newSources];
  selectedSourceIds.value = [];
  showSourceModal.value = false;
};
const detachSource = (id: number) => {
  attachedSources.value = attachedSources.value.filter(s => s.id !== id);
};

// ==================== Quiz Questions (snapshots) ====================
interface QuizQuestion {
  id: number; // temporary local id (will be replaced by server id later)
  type: string;
  content: string;
  explanation?: string;
  metadataJson?: string; // stringified JSON
  tags: string[];
  // maybe also originalQuestionId if linking to bank
}

const questions = ref<QuizQuestion[]>([]);
const totalQuestions = computed(() => questions.value.length);

// Load mock questions initially (simulate fetching from server)
const loadQuestions = () => {
  questions.value = [
    { id: 1, type: 'multiple_choice', content: 'What is 2+2?', explanation: 'Basic math', metadataJson: '{"options":[{"id":"0","text":"3"},{"id":"1","text":"4"}],"correctAnswers":["1"]}', tags: ['math'] },
    { id: 2, type: 'true_false', content: 'The sky is blue.', explanation: '', metadataJson: '{"correctAnswer":true}', tags: ['science'] },
  ];
};

// ==================== Question Modal ====================
const showQuestionModal = ref(false);
const editingQuestion = ref<QuizQuestion | undefined>();
const insertIndex = ref<number | undefined>(); // index at which to insert new question (if inserting)

const openQuestionModal = (action: 'create' | 'edit' | 'insert', question?: QuizQuestion, index?: number) => {
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

const handleQuestionSaved = (payload: CreateQuestionPayload, existingId?: number) => {
  // Create a snapshot object from the payload
  const newQuestion: QuizQuestion = {
    id: existingId || Date.now() + Math.random(), // temporary id
    type: payload.type,
    content: payload.content,
    explanation: payload.explanation,
    metadataJson: payload.metadataJson,
    tags: payload.tagNames || [],
  };

  if (existingId) {
    // Update existing question
    const index = questions.value.findIndex(q => q.id === existingId);
    if (index !== -1) {
      questions.value[index] = newQuestion;
    }
  } else {
    // Insert or append
    if (insertIndex.value !== undefined && insertIndex.value >= 0 && insertIndex.value <= questions.value.length) {
      // Insert at specific index
      questions.value.splice(insertIndex.value, 0, newQuestion);
    } else {
      // Append
      questions.value.push(newQuestion);
    }
  }
  message.success('Question saved');
  // Reset modal state
  editingQuestion.value = undefined;
  insertIndex.value = undefined;
};

const deleteQuestion = (id: number) => {
  questions.value = questions.value.filter(q => q.id !== id);
  message.success('Question deleted');
};

// ==================== Quiz Actions ====================
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

// ==================== Load data on mount ====================
onMounted(async () => {
  await quizStore.fetchQuizById(quizId.value);
  loadQuestions();

  // Load notes and sources from localStorage (optional)
  const savedNotes = localStorage.getItem(`quiz-notes-${quizId.value}`);
  if (savedNotes) notes.value = JSON.parse(savedNotes);
  const savedSources = localStorage.getItem(`quiz-sources-${quizId.value}`);
  if (savedSources) attachedSources.value = JSON.parse(savedSources);
});

// Save notes and sources to localStorage when they change
watch([notes, attachedSources], () => {
  localStorage.setItem(`quiz-notes-${quizId.value}`, JSON.stringify(notes.value));
  localStorage.setItem(`quiz-sources-${quizId.value}`, JSON.stringify(attachedSources.value));
}, { deep: true });
</script>

<style scoped>
.questions-list {
  scrollbar-width: thin;
}
</style>