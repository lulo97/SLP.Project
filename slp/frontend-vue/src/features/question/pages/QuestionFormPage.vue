<!-- D:/SLP.Project/slp/frontend-vue/src/features/question/pages/QuestionFormPage.vue -->
<!-- Update the template section for fill_blank -->
<template>
  <MobileLayout :title="isEdit ? 'Edit Question' : 'Create Question'">
    <a-card class="shadow-sm">
      <a-form :model="form" @submit.prevent="handleSubmit" layout="vertical">
        <!-- Common fields -->
        <a-form-item label="Question Title" required>
          <a-input
            v-model:value="form.title"
            placeholder="Enter the question"
          />
        </a-form-item>

        <a-form-item label="Description / Details">
          <a-textarea
            v-model:value="form.description"
            placeholder="Additional context"
            :rows="2"
          />
        </a-form-item>

        <a-form-item label="Question Type" required>
          <a-select v-model:value="form.type" placeholder="Select type">
            <a-select-option value="multiple_choice"
              >Multiple Choice</a-select-option
            >
            <a-select-option value="true_false">True/False</a-select-option>
            <a-select-option value="fill_blank">Fill Blank</a-select-option>
            <a-select-option value="ordering">Ordering</a-select-option>
            <a-select-option value="matching">Matching</a-select-option>
            <a-select-option value="flashcard">Flashcard</a-select-option>
          </a-select>
        </a-form-item>

        <!-- Type-specific fields -->
        <template v-if="form.type === 'multiple_choice'">
          <MultipleChoice
            v-model:model-value="form.options"
            v-model:correct-answers="form.correctAnswers"
          />
        </template>

        <template v-else-if="form.type === 'true_false'">
          <TrueFalse v-model:answer="form.answer" />
        </template>

        <template v-else-if="form.type === 'fill_blank'">
          <FillBlank
            v-model:answer="form.answer"
            :question-title="form.title"
          />
        </template>

        <template v-else-if="form.type === 'ordering'">
          <Ordering v-model:model-value="form.orderingItems" />
        </template>

        <template v-else-if="form.type === 'matching'">
          <Matching v-model:model-value="form.matchingPairs" />
        </template>

        <template v-else-if="form.type === 'flashcard'">
          <Flashcard v-model:front="form.front" v-model:back="form.back" />
        </template>

        <!-- Explanation (not needed for flashcards) -->
        <a-form-item v-if="form.type !== 'flashcard'" label="Explanation">
          <a-textarea
            v-model:value="form.explanation"
            placeholder="Why this answer is correct"
            :rows="2"
          />
        </a-form-item>

        <a-form-item label="Tags">
          <a-select
            v-model:value="form.tags"
            mode="tags"
            placeholder="Enter tags and press enter"
            :token-separators="[',']"
          />
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="questionStore.loading"
            block
          >
            {{ isEdit ? "Update Question" : "Create Question" }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useQuestionStore } from "../stores/questionStore";
import MultipleChoice from "../components/MultipleChoice.vue";
import TrueFalse from "../components/TrueFalse.vue";
import FillBlank from "../components/FillBlank.vue";
import Ordering from "../components/Ordering.vue";
import Matching from "../components/Matching.vue";
import Flashcard from "../components/Flashcard.vue";
import type { CreateQuestionPayload } from "../stores/questionStore";

const route = useRoute();
const router = useRouter();
const questionStore = useQuestionStore();

const questionId = computed(() =>
  route.params.id ? Number(route.params.id) : null,
);
const isEdit = computed(() => !!questionId.value);

interface QuestionForm {
  title: string;
  description: string;
  type: CreateQuestionPayload["type"];
  options: string[]; // for multiple choice
  correctAnswers: string[]; // selected correct options
  answer: string; // for other types (TF, fill blank)
  explanation: string;
  orderingItems: string[];
  matchingPairs: { left: string; right: string }[];
  front: string;
  back: string;
  tags: string[];
}

const form = ref<QuestionForm>({
  title: "",
  description: "",
  type: "multiple_choice",
  options: ["", "", "", ""],
  correctAnswers: [],
  answer: "",
  explanation: "",
  orderingItems: ["", "", "", ""],
  matchingPairs: [
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" },
  ],
  front: "",
  back: "",
  tags: [],
});

// When type changes to multiple_choice, reset to 4 empty options
watch(
  () => form.value.type,
  (newType) => {
    if (newType === "multiple_choice") {
      form.value.options = ["", "", "", ""];
      form.value.correctAnswers = [];
    } else if (newType === "fill_blank") {
      // Initialize fill blank with empty array as JSON
      form.value.answer = "[]";
    }
  },
);

const handleSubmit = async () => {
  if (!form.value.title.trim()) {
    message.warning("Title is required");
    return;
  }

  // Clean up empty options for multiple choice
  if (form.value.type === "multiple_choice") {
    form.value.options = form.value.options.filter((opt) => opt.trim() !== "");

    // Validate that at least one correct answer is selected
    if (form.value.correctAnswers.length === 0) {
      message.warning("Please select at least one correct answer");
      return;
    }
  }

  // Clean up empty ordering items
  if (form.value.type === "ordering") {
    form.value.orderingItems = form.value.orderingItems.filter(
      (item) => item.trim() !== "",
    );
  }

  // Clean up empty matching pairs
  if (form.value.type === "matching") {
    form.value.matchingPairs = form.value.matchingPairs.filter(
      (p) => p.left.trim() !== "" || p.right.trim() !== "",
    );
  }

  // Validate fill blank keywords
  if (form.value.type === "fill_blank") {
    try {
      const keywords = JSON.parse(form.value.answer);
      if (!Array.isArray(keywords) || keywords.length === 0) {
        message.warning("Please enter at least one keyword");
        return;
      }

      // Validate each keyword is a single word (no spaces)
      const invalidKeywords = keywords.filter((k: string) => k.includes(" "));
      if (invalidKeywords.length > 0) {
        message.warning("Keywords must be single words (no spaces allowed)");
        return;
      }
    } catch {
      message.warning("Invalid keyword format");
      return;
    }
  }

  // Build payload
  const payload: CreateQuestionPayload = {
    title: form.value.title,
    description: form.value.description || undefined,
    type: form.value.type,
    options:
      form.value.type === "multiple_choice" ? form.value.options : undefined,
    // For multiple_choice, store correctAnswers as JSON string
    // For fill_blank, answer is already JSON string of keywords
    answer:
      form.value.type === "multiple_choice"
        ? JSON.stringify(form.value.correctAnswers)
        : form.value.answer,
    explanation: form.value.explanation || undefined,
    orderingItems:
      form.value.type === "ordering" ? form.value.orderingItems : undefined,
    matchingPairs:
      form.value.type === "matching" ? form.value.matchingPairs : undefined,
    front: form.value.type === "flashcard" ? form.value.front : undefined,
    back: form.value.type === "flashcard" ? form.value.back : undefined,
    tags: form.value.tags,
  };

  if (isEdit.value) {
    const updated = await questionStore.updateQuestion(
      questionId.value!,
      payload,
    );
    if (updated) {
      message.success("Question updated");
      router.push("/questions");
    }
  } else {
    const created = await questionStore.createQuestion(payload);
    if (created) {
      message.success("Question created");
      router.push("/questions");
    }
  }
};

onMounted(async () => {
  if (isEdit.value) {
    await questionStore.fetchQuestionById(questionId.value!);
    if (questionStore.currentQuestion) {
      const q = questionStore.currentQuestion;

      // For multiple choice, parse the answer JSON if it exists
      if (q.type === "multiple_choice") {
        let correctAnswers: string[] = [];
        if (q.answer) {
          try {
            const parsed = JSON.parse(q.answer);
            correctAnswers = Array.isArray(parsed) ? parsed : [q.answer];
          } catch {
            correctAnswers = [q.answer];
          }
        }
        form.value.correctAnswers = correctAnswers;
        form.value.options = q.options || ["", "", "", ""];
      } else {
        // For other types, just copy the answer as is
        form.value.answer = q.answer || "";
      }

      // Common fields
      form.value.title = q.title;
      form.value.description = q.description || "";
      form.value.type = q.type;
      form.value.explanation = q.explanation || "";
      form.value.orderingItems = q.orderingItems || ["", "", "", ""];
      form.value.matchingPairs = q.matchingPairs || [
        { left: "", right: "" },
        { left: "", right: "" },
        { left: "", right: "" },
        { left: "", right: "" },
      ];
      form.value.front = q.front || "";
      form.value.back = q.back || "";
      form.value.tags = q.tags;
    }
  }
});
</script>
