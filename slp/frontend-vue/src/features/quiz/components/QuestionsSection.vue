<template>
  <a-card title="Questions" class="shadow-sm" data-testid="questions-card">
    <div
      class="mb-2 flex justify-between items-center"
      data-testid="questions-header-container"
    >
      <span class="font-medium" data-testid="questions-total"
        >Total: {{ questions.length }}</span
      >
      <a-button
        v-if="!readonly"
        type="primary"
        size="small"
        @click="emit('add')"
        data-testid="add-question-button"
      >
        <PlusOutlined data-testid="add-question-icon" /> Add Question
      </a-button>
    </div>

    <div
      v-if="!questions.length"
      class="text-center py-4 text-gray-500"
      data-testid="no-questions-message"
    >
      No questions yet.
    </div>

    <div
      v-else
      class="questions-list max-h-96 overflow-y-auto space-y-2 pr-1"
      data-testid="questions-list"
    >
      <div
        v-for="(q, index) in questions"
        :key="q.id"
        class="relative"
        :data-testid="`question-item-wrapper-${q.id}`"
      >
        <div
          class="flex items-start gap-2 p-2 bg-gray-50 rounded border"
          :data-testid="`question-row-${q.id}`"
        >
          <div
            v-if="!readonly"
            class="flex flex-col gap-1"
            :data-testid="`question-actions-${q.id}`"
          >
            <a-button
              @click="emit('edit', q)"
              size="small"
              type="text"
              :data-testid="`edit-question-button-${q.id}`"
            >
              <EditOutlined :data-testid="`edit-icon-${q.id}`" />
            </a-button>
            <a-button
              @click="emit('delete', q.id)"
              size="small"
              type="text"
              danger
              :data-testid="`delete-question-button-${q.id}`"
            >
              <DeleteOutlined :data-testid="`delete-icon-${q.id}`" />
            </a-button>
          </div>
          <div
            class="flex-1 min-w-0"
            :data-testid="`question-content-container-${q.id}`"
          >
            <div
              class="flex items-center gap-2"
              :data-testid="`question-header-${q.id}`"
            >
              <span
                class="text-sm font-medium truncate"
                :data-testid="`question-text-${q.id}`"
                >{{ q.content }}</span
              >
              <a-tag size="small" :data-testid="`question-type-tag-${q.id}`">{{
                formatQuestionType(q.type)
              }}</a-tag>
            </div>
            <div
              class="text-xs text-gray-500 mt-1"
              :data-testid="`question-summary-${q.id}`"
            >
              {{ getQuestionSummary(q) }}
            </div>
          </div>
          <div
            class="text-xs text-gray-400 font-mono w-6 text-center"
            :data-testid="`question-index-${q.id}`"
          >
            {{ index + 1 }}
          </div>
        </div>

        <div
          v-if="!readonly && index < questions.length - 1"
          class="flex justify-center my-1"
          :data-testid="`insert-button-container-${index}`"
        >
          <a-button
            @click="emit('insert', index + 1)"
            size="small"
            type="dashed"
            class="w-full text-xs"
            :data-testid="`insert-question-after-${q.id}`"
          >
            <PlusOutlined :data-testid="`insert-icon-${q.id}`" /> Insert
            Question
          </a-button>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons-vue";
import {
  formatQuestionType,
  getQuestionSummary,
} from "../utils/questionHelpers";
import type { DisplayQuestion } from "../types";

defineProps<{
  questions: DisplayQuestion[];
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: "add"): void;
  (e: "edit", question: DisplayQuestion): void;
  (e: "delete", questionId: number): void;
  (e: "insert", index: number): void;
}>();
</script>

<style scoped>
.questions-list {
  scrollbar-width: thin;
}
</style>
