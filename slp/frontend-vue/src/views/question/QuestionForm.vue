<template>
  <MobileLayout :title="isEdit ? 'Edit Question' : 'Create Question'">
    <a-card class="shadow-sm">
      <a-form
        :model="form"
        @submit.prevent="handleSubmit"
        layout="vertical"
      >
        <a-form-item label="Question Title" required>
          <a-input v-model:value="form.title" placeholder="Enter the question" />
        </a-form-item>

        <a-form-item label="Description / Details">
          <a-textarea v-model:value="form.description" placeholder="Additional context" :rows="2" />
        </a-form-item>

        <a-form-item label="Question Type" required>
          <a-select v-model:value="form.type" placeholder="Select type">
            <a-select-option value="multiple_choice">Multiple Choice</a-select-option>
            <a-select-option value="true_false">True/False</a-select-option>
            <a-select-option value="short_answer">Short Answer</a-select-option>
          </a-select>
        </a-form-item>

        <!-- Dynamic fields based on type -->
        <div v-if="form.type === 'multiple_choice'">
          <a-form-item label="Options">
            <div v-for="(opt, index) in form.options" :key="index" class="flex mb-2">
              <a-input v-model:value="form.options[index]" placeholder="Option" style="margin-right: 8px" />
              <a-button @click="removeOption(index)" type="text" danger>Remove</a-button>
            </div>
            <a-button @click="addOption" type="dashed" block>Add Option</a-button>
          </a-form-item>
        </div>

        <a-form-item label="Correct Answer">
          <a-input v-model:value="form.answer" placeholder="Correct answer" />
        </a-form-item>

        <a-form-item label="Explanation">
          <a-textarea v-model:value="form.explanation" placeholder="Why this answer is correct" :rows="2" />
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
          <a-button type="primary" html-type="submit" :loading="questionStore.loading" block>
            {{ isEdit ? 'Update Question' : 'Create Question' }}
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
import MobileLayout from '../../components/MobileLayout.vue';
import { useQuestionStore } from '../../stores/question';
import type { CreateQuestionPayload } from '../../stores/question';

const route = useRoute();
const router = useRouter();
const questionStore = useQuestionStore();

const questionId = computed(() => route.params.id ? Number(route.params.id) : null);
const isEdit = computed(() => !!questionId.value);

const form = ref<CreateQuestionPayload & { options: string[]; tagNames: string[] }>({
  title: '',
  description: '',
  type: 'multiple_choice',
  options: [''],
  answer: '',
  explanation: '',
  tagNames: [],
});

const addOption = () => {
  form.value.options.push('');
};

const removeOption = (index: number) => {
  form.value.options.splice(index, 1);
};

const handleSubmit = async () => {
  if (!form.value.title.trim()) {
    message.warning('Title is required');
    return;
  }
  if (form.value.type === 'multiple_choice') {
    // Filter out empty options
    form.value.options = form.value.options.filter(opt => opt.trim() !== '');
  }

  const payload = { ...form.value };
  if (isEdit.value) {
    const updated = await questionStore.updateQuestion(questionId.value!, payload);
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
    if (questionStore.currentQuestion) {
      const q = questionStore.currentQuestion;
      form.value = {
        title: q.title,
        description: q.description,
        type: q.type,
        options: q.options || [''],
        answer: q.answer,
        explanation: q.explanation,
        tagNames: q.tags,
      };
    }
  }
});
</script>