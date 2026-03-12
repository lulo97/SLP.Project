<!-- D:/SLP.Project/slp/frontend-vue/src/features/question/pages/QuestionFormPage.vue -->
<template>
  <MobileLayout :title="isEdit ? 'Edit Question' : 'Create Question'">
    <a-card class="shadow-sm">
      <a-form :model="form" @submit.prevent="handleSubmit" layout="vertical">
        <!-- Common fields -->
        <a-form-item label="Question Title" required>
          <a-input
            v-model:value="form.title"
            placeholder="Enter the question"
            data-testid="question-title"
          />
        </a-form-item>

        <a-form-item label="Description / Details">
          <a-textarea
            v-model:value="form.description"
            placeholder="Additional context"
            :rows="2"
            data-testid="question-description"
          />
        </a-form-item>

        <a-form-item label="Question Type" required>
          <a-select v-model:value="form.type" placeholder="Select type" data-testid="question-type">
            <a-select-option value="multiple_choice">Multiple Choice</a-select-option>
            <a-select-option value="true_false">True/False</a-select-option>
            <a-select-option value="fill_blank">Fill Blank</a-select-option>
            <a-select-option value="ordering">Ordering</a-select-option>
            <a-select-option value="matching">Matching</a-select-option>
            <!-- Flashcard removed – not supported by backend -->
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

        <!-- Explanation -->
        <a-form-item label="Explanation">
          <a-textarea
            v-model:value="form.explanation"
            placeholder="Why this answer is correct"
            :rows="2"
            data-testid="question-explanation"
          />
        </a-form-item>

        <a-form-item label="Tags">
          <a-select
            v-model:value="form.tags"
            mode="tags"
            placeholder="Enter tags and press enter"
            :token-separators="[',']"
            data-testid="question-tags"
          />
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="questionStore.loading"
            block
            data-testid="submit-question"
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
// Flashcard component removed
import type { CreateQuestionPayload } from "../stores/questionStore";

const route = useRoute();
const router = useRouter();
const questionStore = useQuestionStore();

const questionId = computed(() =>
  route.params.id ? Number(route.params.id) : null
);
const isEdit = computed(() => !!questionId.value);

interface QuestionForm {
  title: string;
  description: string;
  type: CreateQuestionPayload['type'];
  options: string[];               // for multiple choice
  correctAnswers: string[];         // selected correct options (text)
  answer: string;                   // for TF (string 'true'/'false') and fill blank (JSON string)
  explanation: string;
  orderingItems: string[];
  matchingPairs: { left: string; right: string }[];
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
  tags: [],
});

// Reset type-specific fields when type changes
watch(
  () => form.value.type,
  (newType) => {
    if (newType === "multiple_choice") {
      form.value.options = ["", "", "", ""];
      form.value.correctAnswers = [];
      form.value.answer = "";
    } else if (newType === "true_false") {
      form.value.answer = "true";
    } else if (newType === "fill_blank") {
      form.value.answer = "[]";
    } else if (newType === "ordering") {
      form.value.orderingItems = ["", "", "", ""];
    } else if (newType === "matching") {
      form.value.matchingPairs = [
        { left: "", right: "" },
        { left: "", right: "" },
        { left: "", right: "" },
        { left: "", right: "" },
      ];
    }
  }
);

// Build metadata object according to backend expectations
function buildMetadata(): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Store description for all types
  if (form.value.description.trim()) {
    metadata.description = form.value.description.trim();
  }

  switch (form.value.type) {
    case "multiple_choice": {
      // Filter out empty options
      const options = form.value.options.filter(opt => opt.trim() !== "");
      // Build options array with id and text (id = index as string)
      metadata.options = options.map((text, idx) => ({
        id: idx.toString(),
        text: text.trim()
      }));
      // Map correctAnswers (text) to ids
      const correctTexts = form.value.correctAnswers.filter(ans => ans.trim() !== "");
      metadata.correctAnswers = metadata.options
        .filter((opt: { text: string; }) => correctTexts.includes(opt.text))
        .map((opt: { id: any; }) => opt.id);
      break;
    }
    case "true_false":
      metadata.correctAnswer = form.value.answer === "true";
      break;
    case "fill_blank": {
      let keywords: string[] = [];
      try {
        keywords = JSON.parse(form.value.answer);
      } catch {
        keywords = [];
      }
      metadata.keywords = keywords.filter((k: string) => k.trim() !== "");
      break;
    }
    case "ordering": {
      const items = form.value.orderingItems
        .filter(item => item.trim() !== "")
        .map((text, idx) => ({
          order_id: idx + 1,
          text: text.trim()
        }));
      metadata.items = items;
      break;
    }
    case "matching": {
      const pairs = form.value.matchingPairs
        .filter(p => p.left.trim() !== "" || p.right.trim() !== "")
        .map((p, idx) => ({
          id: idx + 1,
          left: p.left.trim(),
          right: p.right.trim()
        }));
      metadata.pairs = pairs;
      break;
    }
  }
  return metadata;
}

const handleSubmit = async () => {
  if (!form.value.title.trim()) {
    message.warning("Title is required");
    return;
  }

  // Basic validation per type
  if (form.value.type === "multiple_choice") {
    const nonEmptyOptions = form.value.options.filter(opt => opt.trim() !== "");
    if (nonEmptyOptions.length < 2) {
      message.warning("At least two options are required");
      return;
    }
    if (form.value.correctAnswers.length === 0) {
      message.warning("Please select at least one correct answer");
      return;
    }
  }

  if (form.value.type === "fill_blank") {
    try {
      const keywords = JSON.parse(form.value.answer);
      if (!Array.isArray(keywords) || keywords.length === 0) {
        message.warning("Please enter at least one keyword");
        return;
      }
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

  const metadata = buildMetadata();
  const payload: CreateQuestionPayload = {
    type: form.value.type,
    content: form.value.title.trim(),
    explanation: form.value.explanation.trim() || undefined,
    metadataJson: Object.keys(metadata).length ? JSON.stringify(metadata) : undefined,
    tagNames: form.value.tags.length ? form.value.tags : undefined,
  };

  if (isEdit.value) {
    const updated = await questionStore.updateQuestion(questionId.value!, payload);
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

      // Common fields
      form.value.title = q.content;
      form.value.type = q.type as any;
      form.value.explanation = q.explanation || "";
      form.value.tags = q.tags || [];

      // Parse metadata
      let metadata: any = {};
      if (q.metadataJson) {
        try {
          metadata = JSON.parse(q.metadataJson);
        } catch {
          metadata = {};
        }
      }

      // Description (stored in metadata)
      form.value.description = metadata.description || "";

      // Type-specific fields
      switch (q.type) {
        case "multiple_choice": {
          const options = (metadata.options || []).map((opt: any) => opt.text);
          form.value.options = options.length ? options : ["", "", "", ""];
          const correctIds = metadata.correctAnswers || [];
          form.value.correctAnswers = (metadata.options || [])
            .filter((opt: any) => correctIds.includes(opt.id))
            .map((opt: any) => opt.text);
          break;
        }
        case "true_false":
          form.value.answer = metadata.correctAnswer === true ? "true" : "false";
          break;
        case "fill_blank":
          form.value.answer = JSON.stringify(metadata.keywords || []);
          break;
        case "ordering": {
          const items = (metadata.items || []).map((item: any) => item.text);
          form.value.orderingItems = items.length ? items : ["", "", "", ""];
          break;
        }
        case "matching": {
          const pairs = (metadata.pairs || []).map((p: any) => ({
            left: p.left,
            right: p.right
          }));
          form.value.matchingPairs = pairs.length ? pairs : [
            { left: "", right: "" },
            { left: "", right: "" },
            { left: "", right: "" },
            { left: "", right: "" },
          ];
          break;
        }
      }
    }
  }
});
</script>