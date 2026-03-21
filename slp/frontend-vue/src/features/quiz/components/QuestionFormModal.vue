<template>
  <a-modal
    :visible="visible"
    :title="question ? 'Edit Question' : 'Create Question'"
    :footer="null"
    @cancel="handleCancel"
    width="90%"
    :mask-closable="false"
    wrap-class-name="full-width-modal"
  >
    <div data-testid="question-form-modal">
      <QuestionForm
        :key="formKey"
        :initial-question="initialQuestion"
        @save="handleSave"
        @cancel="handleCancel"
      />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import QuestionForm from "@/features/question/components/QuestionForm.vue";
import type { CreateQuestionPayload } from "@/features/question/stores/questionStore";

const props = defineProps<{
  visible: boolean;
  question?: any; // the quiz question object (DisplayQuestion) with questionSnapshotJson
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "saved", payload: CreateQuestionPayload, id?: number): void;
}>();

const formKey = ref(0);

// Force a new key every time the modal becomes visible
watch(() => props.visible, (newVal) => {
  if (newVal) {
    formKey.value++;
  }
});

// Convert the quiz question (which contains a snapshot JSON string) to the shape expected by QuestionForm
const initialQuestion = computed(() => {
  if (!props.question) return null;

  // Parse the snapshot JSON
  let snapshot: any = {};
  try {
    snapshot = JSON.parse(props.question.questionSnapshotJson || "{}");
  } catch {
    console.error("Failed to parse question snapshot");
  }

  // Build the object matching QuestionDto structure
  return {
    id: props.question.id,
    content: snapshot.content || "",
    type: snapshot.type || "",
    explanation: snapshot.explanation || "",
    metadataJson: snapshot.metadata
      ? JSON.stringify(snapshot.metadata)
      : undefined,
    tags: snapshot.tags || [],
  };
});

const handleSave = (payload: CreateQuestionPayload) => {
  emit("saved", payload, props.question?.id);
  emit("update:visible", false);
};

const handleCancel = () => {
  emit("update:visible", false);
};
</script>

<style>
.full-width-modal .ant-modal {
  max-width: 100%;
  margin: 0;
  top: 0;
  height: 100%;
}
.full-width-modal .ant-modal-content {
  height: 100%;
  border-radius: 0;
  overflow-y: auto;
}
</style>
