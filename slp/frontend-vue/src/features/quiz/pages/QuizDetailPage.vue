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
            <h2 class="text-xl font-semibold">
              {{ quizStore.currentQuiz.title }}
            </h2>
            <p class="text-gray-600">
              {{ quizStore.currentQuiz.description || "No description" }}
            </p>
          </div>
          <a-tag
            :color="
              quizStore.currentQuiz.visibility === 'public' ? 'green' : 'blue'
            "
          >
            {{ quizStore.currentQuiz.visibility }}
          </a-tag>
        </div>
        <div class="flex items-center mt-4 text-sm text-gray-500">
          <span
            >Created by {{ quizStore.currentQuiz.userName || "Unknown" }}</span
          >
          <a-divider type="vertical" />
          <span>{{ totalQuestions }} questions</span>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <a-tag v-for="tag in quizStore.currentQuiz.tags" :key="tag">{{
            tag
          }}</a-tag>
        </div>
      </a-card>

      <!-- Notes Section (frontend only) -->
      <a-card title="My Notes" class="shadow-sm">
        <div class="space-y-2">
          <div
            v-for="(note, idx) in notes"
            :key="idx"
            class="flex items-start gap-2"
          >
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
          <a-tag
            v-for="src in attachedSources"
            :key="src.id"
            closable
            @close="detachSource(src.id)"
          >
            {{ src.name }}
          </a-tag>
          <span v-if="!attachedSources.length" class="text-gray-400 text-sm"
            >No sources attached</span
          >
        </div>
        <a-button @click="showSourceModal = true" block type="dashed">
          <PlusOutlined /> Attach Source
        </a-button>
      </a-card>

      <!-- Questions Section -->
      <a-card title="Questions" class="shadow-sm">
        <div class="mb-2 flex justify-between items-center">
          <span class="font-medium">Total: {{ totalQuestions }}</span>
          <a-button
            type="primary"
            size="small"
            @click="openQuestionModal('create')"
          >
            <PlusOutlined /> Add Question
          </a-button>
        </div>

        <div v-if="!questions.length" class="text-center py-4 text-gray-500">
          No questions yet.
        </div>

        <div
          v-else
          class="questions-list max-h-96 overflow-y-auto space-y-2 pr-1"
        >
          <div v-for="(q, index) in questions" :key="q.id" class="relative">
            <!-- Question Item -->
            <div class="flex items-start gap-2 p-2 bg-gray-50 rounded border">
              <!-- Left side: edit/delete -->
              <div class="flex flex-col gap-1">
                <a-button
                  @click="openQuestionModal('edit', q)"
                  size="small"
                  type="text"
                >
                  <EditOutlined />
                </a-button>
                <a-button
                  @click="deleteQuestion(q.id)"
                  size="small"
                  type="text"
                  danger
                >
                  <DeleteOutlined />
                </a-button>
              </div>
              <!-- Question summary -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium truncate">{{
                    q.content
                  }}</span>
                  <a-tag size="small">{{ formatQuestionType(q.type) }}</a-tag>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ getQuestionSummary(q) }}
                </div>
              </div>
              <!-- Right side: index -->
              <div class="text-xs text-gray-400 font-mono w-6 text-center">
                {{ index + 1 }}
              </div>
            </div>
            <!-- Insert button between questions (except after last) -->
            <div
              v-if="index < questions.length - 1"
              class="flex justify-center my-1"
            >
              <a-button
                @click="openQuestionModal('insert', undefined, index + 1)"
                size="small"
                type="dashed"
                class="w-full text-xs"
              >
                <PlusOutlined /> Insert Question
              </a-button>
            </div>
          </div>
        </div>
      </a-card>

      <!-- Existing actions card (Edit, Duplicate, Delete) -->
      <a-card title="Actions" class="shadow-sm">
        <div class="space-y-2">
          <a-button
            block
            @click="router.push(`/quiz/${quizStore.currentQuiz.id}/edit`)"
            v-if="canEdit"
          >
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
    <div v-else class="text-center py-8 text-gray-500">Quiz not found.</div>

    <!-- Source Attachment Modal (mock sources) -->
    <a-modal
      v-model:visible="showSourceModal"
      title="Attach Sources"
      @ok="attachSources"
      ok-text="Attach"
    >
      <a-checkbox-group
        v-model:value="selectedSourceIds"
        class="flex flex-col gap-2"
      >
        <a-checkbox
          v-for="src in availableSources"
          :key="src.id"
          :value="src.id"
        >
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
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useQuizStore } from "../stores/quizStore";
import { useAuthStore } from "@/features/auth/stores/authStore";
import QuestionFormModal from "../components/QuestionFormModal.vue";
import type { CreateQuestionPayload } from "@/features/question/stores/questionStore";

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const authStore = useAuthStore();

const quizId = computed(() => Number(route.params.id));
const canEdit = computed(() => {
  const quiz = quizStore.currentQuiz;
  return quiz && (authStore.isAdmin || quiz.userId === authStore.user?.id);
});

// Notes (frontend only)
const notes = ref<string[]>([]);
const addNote = () => notes.value.push("");
const removeNote = (idx: number) => notes.value.splice(idx, 1);

// Sources (mock)
interface Source {
  id: number;
  name: string;
}
const availableSources = ref<Source[]>([
  { id: 1, name: "Wikipedia" },
  { id: 2, name: "Textbook" },
  { id: 3, name: "Lecture Notes" },
  { id: 4, name: "Research Paper" },
]);
const attachedSources = ref<Source[]>([]);
const showSourceModal = ref(false);
const selectedSourceIds = ref<number[]>([]);

const attachSources = () => {
  const newSources = availableSources.value.filter((s) =>
    selectedSourceIds.value.includes(s.id),
  );
  attachedSources.value = [...attachedSources.value, ...newSources];
  selectedSourceIds.value = [];
  showSourceModal.value = false;
};
const detachSource = (id: number) => {
  attachedSources.value = attachedSources.value.filter((s) => s.id !== id);
};

// ==================== Quiz Questions ====================
interface QuizQuestion {
  id: number;
  quizId: number;
  originalQuestionId?: number;
  questionSnapshotJson: string; // JSON string from backend
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// For display, we parse the snapshot and also keep the raw JSON
interface DisplayQuestion {
  id: number;
  content: string;
  type: string;
  explanation?: string;
  metadata: any;
  tags: string[];
  displayOrder: number;
  questionSnapshotJson: string; // raw JSON for updates/reorder
}

const questions = ref<DisplayQuestion[]>([]);
const totalQuestions = computed(() => questions.value.length);

// Helper: generate a brief summary based on question type and metadata
const getQuestionSummary = (q: DisplayQuestion): string => {
  const type = q.type?.toLowerCase() || "";
  const meta = q.metadata || {};

  switch (type) {
    case "multiple-choice":
    case "multiple_choice": {
      const options = meta.options || [];
      const correctIndices =
        meta.correctAnswers || meta.correctAnswerIndex
          ? [meta.correctAnswerIndex]
          : [];
      if (correctIndices.length === 0) return "No correct answer set";
      const letters = correctIndices
        .map((i: number) => String.fromCharCode(65 + i))
        .join(", ");
      return `Correct: ${letters}`;
    }

    case "true-false":
    case "true_false": {
      const correct = meta.correctAnswer;
      if (correct === undefined) return "No correct answer set";
      return `Correct: ${correct ? "True" : "False"}`;
    }

    case "fill-in-the-blank":
    case "fill_in_the_blank": {
      const answers = meta.answers || [];
      if (answers.length === 0) return "No answers set";
      const preview = answers.map((a: string) => `"${a}"`).join(", ");
      return `Answers: ${preview}`;
    }

    case "matching": {
      const pairs = meta.pairs || [];
      if (pairs.length === 0) return "No pairs set";
      return `Matching (${pairs.length} pairs)`;
    }

    case "ordering": {
      const items = meta.items || [];
      if (items.length === 0) return "No items set";
      return `Ordering (${items.length} items)`;
    }

    case "essay":
      return "Essay question (no correct answer)";

    default:
      return `Type: ${q.type || "unknown"}`;
  }
};

// Load questions from API
const loadQuestions = async () => {
  const data = await quizStore.fetchQuizQuestions(quizId.value);
  // Transform backend DTO into display format
  questions.value = data
    .map((q: QuizQuestion) => {
      const snapshot = JSON.parse(q.questionSnapshotJson || "{}");
      return {
        id: q.id,
        content: snapshot.content || "",
        type: snapshot.type || "",
        explanation: snapshot.explanation,
        metadata: snapshot.metadata || {},
        tags: snapshot.tags || [],
        displayOrder: q.displayOrder,
        questionSnapshotJson: q.questionSnapshotJson, // store raw JSON
      };
    })
    .sort(
      (a: { displayOrder: number }, b: { displayOrder: number }) =>
        a.displayOrder - b.displayOrder,
    );
};

// ==================== Question Modal ====================
const showQuestionModal = ref(false);
const editingQuestion = ref<DisplayQuestion | undefined>();
const insertIndex = ref<number | undefined>(); // 0-based index where new question should be inserted

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
    insertIndex.value = index; // index is 0-based position to insert before
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
  try {
    // Build snapshot object
    const snapshot = {
      type: payload.type,
      content: payload.content,
      explanation: payload.explanation,
      metadata: payload.metadataJson ? JSON.parse(payload.metadataJson) : {},
      tags: payload.tagNames || [],
    };
    const snapshotJson = JSON.stringify(snapshot);

    if (existingId) {
      // Update existing question
      const question = questions.value.find((q) => q.id === existingId);
      if (!question) return;
      await quizStore.updateQuizQuestion(
        existingId,
        snapshotJson,
        question.displayOrder,
      );
      message.success("Question updated");
    } else {
      // Create new question – determine displayOrder
      let newOrder = 1;
      if (
        insertIndex.value !== undefined &&
        insertIndex.value >= 0 &&
        insertIndex.value <= questions.value.length
      ) {
        // Insert at specific index: need to shift later questions
        newOrder = insertIndex.value + 1; // displayOrder is 1-based
        // First, update all questions with order >= newOrder to order+1
        const toUpdate = questions.value.filter(
          (q) => q.displayOrder >= newOrder,
        );
        for (const q of toUpdate) {
          await quizStore.updateQuizQuestion(
            q.id,
            q.questionSnapshotJson,
            q.displayOrder + 1,
          );
        }
      } else {
        // Append: newOrder = max order + 1
        newOrder = questions.value.length
          ? Math.max(...questions.value.map((q) => q.displayOrder)) + 1
          : 1;
      }
      await quizStore.createQuizQuestion(quizId.value, snapshotJson, newOrder);
      message.success("Question created");
    }
    // Refresh list
    await loadQuestions();
  } catch (error) {
    message.error("Operation failed");
  } finally {
    showQuestionModal.value = false;
    editingQuestion.value = undefined;
    insertIndex.value = undefined;
  }
};

const deleteQuestion = async (id: number) => {
  const success = await quizStore.deleteQuizQuestion(id);
  if (success) {
    await loadQuestions();
    message.success("Question deleted");
  } else {
    message.error("Delete failed");
  }
};

// ==================== Quiz Actions ====================
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

// ==================== Load data on mount ====================
onMounted(async () => {
  await quizStore.fetchQuizById(quizId.value);
  await loadQuestions();

  // Load notes and sources from localStorage (optional)
  const savedNotes = localStorage.getItem(`quiz-notes-${quizId.value}`);
  if (savedNotes) notes.value = JSON.parse(savedNotes);
  const savedSources = localStorage.getItem(`quiz-sources-${quizId.value}`);
  if (savedSources) attachedSources.value = JSON.parse(savedSources);
});

// Save notes and sources to localStorage when they change
watch(
  [notes, attachedSources],
  () => {
    localStorage.setItem(
      `quiz-notes-${quizId.value}`,
      JSON.stringify(notes.value),
    );
    localStorage.setItem(
      `quiz-sources-${quizId.value}`,
      JSON.stringify(attachedSources.value),
    );
  },
  { deep: true },
);

const formatQuestionType = (type: string): string => {
  if (!type) return "Unknown";
  // Convert snake_case or kebab-case to Title Case with spaces
  return type
    .split(/[_\-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
</script>

<style scoped>
.questions-list {
  scrollbar-width: thin;
}
</style>
