<template>
  <MobileLayout :title="isEdit ? 'Edit Quiz' : 'Create Quiz'">
    <a-card class="shadow-sm">
      <a-form
        :model="form"
        @submit.prevent="handleSubmit"
        layout="vertical"
      >
        <a-form-item label="Title" required>
          <a-input v-model:value="form.title" placeholder="Enter quiz title" />
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Describe your quiz" :rows="3" />
        </a-form-item>

        <a-form-item label="Visibility">
          <a-radio-group v-model:value="form.visibility">
            <a-radio value="private">Private (only you)</a-radio>
            <a-radio value="unlisted">Unlisted (anyone with link)</a-radio>
            <a-radio value="public">Public (visible to everyone)</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="Tags">
          <a-select
            v-model:value="form.tagNames"
            mode="tags"
            placeholder="Enter tags and press enter"
            :token-separators="[',']"
          />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="quizStore.loading" block>
            {{ isEdit ? 'Update Quiz' : 'Create Quiz' }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useQuizStore } from '../stores/quizStore';
import type { CreateQuizPayload, UpdateQuizPayload } from '../../quiz/stores/quizStore';

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();

const quizId = computed(() => route.params.id ? Number(route.params.id) : null);
const isEdit = computed(() => !!quizId.value);

const form = ref<CreateQuizPayload & { tagNames: string[] }>({
  title: '',
  description: '',
  visibility: 'private',
  tagNames: [],
});

const handleSubmit = async () => {
  if (!form.value.title.trim()) {
    message.warning('Title is required');
    return;
  }

  const payload = { ...form.value };
  if (isEdit.value) {
    const updated = await quizStore.updateQuiz(quizId.value!, payload as UpdateQuizPayload);
    if (updated) {
      message.success('Quiz updated');
      router.push(`/quiz/${updated.id}`);
    }
  } else {
    const created = await quizStore.createQuiz(payload);
    if (created) {
      message.success('Quiz created');
      router.push(`/quiz/${created.id}`);
    }
  }
};

onMounted(async () => {
  if (isEdit.value) {
    await quizStore.fetchQuizById(quizId.value!);
    if (quizStore.currentQuiz) {
      form.value = {
        title: quizStore.currentQuiz.title,
        description: quizStore.currentQuiz.description,
        visibility: quizStore.currentQuiz.visibility as any,
        tagNames: quizStore.currentQuiz.tags,
      };
    }
  }
});
</script>