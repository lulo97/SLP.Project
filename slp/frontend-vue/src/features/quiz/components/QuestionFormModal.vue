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
    <QuestionForm
      :initial-question="initialQuestion"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import QuestionForm from '@/features/question/components/QuestionForm.vue';
import type { CreateQuestionPayload } from '@/features/question/stores/questionStore';

const props = defineProps<{
  visible: boolean;
  question?: any; // the full snapshot object (if editing)
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved', payload: CreateQuestionPayload, id?: number): void;
}>();

// Convert snapshot to the shape expected by QuestionForm
const initialQuestion = computed(() => {
  if (!props.question) return null;
  // The snapshot may contain metadataJson string; QuestionForm expects parsed fields.
  // We'll just pass the whole object and let QuestionForm handle it.
  return {
    id: props.question.id,
    content: props.question.content,
    type: props.question.type,
    explanation: props.question.explanation,
    metadataJson: props.question.metadataJson,
    tags: props.question.tags,
  };
});

const handleSave = (payload: CreateQuestionPayload) => {
  emit('saved', payload, props.question?.id);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('update:visible', false);
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