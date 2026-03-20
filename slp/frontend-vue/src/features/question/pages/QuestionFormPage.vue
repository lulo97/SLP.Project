<template>
  <MobileLayout :title="isEdit ? 'Edit Question' : 'Create Question'">
    <a-card class="shadow-sm">
      <QuestionForm
        :initial-question="initialQuestion"
        :loading="questionStore.loading"
        data-testid="question-form-add-tags"
        @save="handleSave"
        @cancel="goBack"
      />
    </a-card>
  </MobileLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import QuestionForm from '../components/QuestionForm.vue';
import { useQuestionStore } from '../stores/questionStore';
import type { CreateQuestionPayload, UpdateQuestionPayload } from '../stores/questionStore';

const route         = useRoute();
const router        = useRouter();
const questionStore = useQuestionStore();

const questionId = computed(() => (route.params.id ? Number(route.params.id) : null));
const isEdit     = computed(() => !!questionId.value);

const initialQuestion = computed(() =>
  isEdit.value && questionStore.currentQuestion ? questionStore.currentQuestion : null,
);

const goBack = () => router.back();

const handleSave = async (payload: CreateQuestionPayload) => {
  if (isEdit.value) {
    const updated = await questionStore.updateQuestion(questionId.value!, payload as UpdateQuestionPayload);
    if (updated) {
      message.success('Question updated');
      router.push('/questions');
    }
  } else {
    const created = await questionStore.createQuestion(payload);
    if (created) {
      message.success('Question created');
      router.push('/questions');
    }
  }
};

onMounted(async () => {
  if (isEdit.value) {
    await questionStore.fetchQuestionById(questionId.value!);
  }
});
</script>