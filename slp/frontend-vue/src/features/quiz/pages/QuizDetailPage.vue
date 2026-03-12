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
          <a-tag :color="quizStore.currentQuiz.visibility === 'public' ? 'green' : quizStore.currentQuiz.visibility === 'unlisted' ? 'orange' : 'blue'">
            {{ quizStore.currentQuiz.visibility }}
          </a-tag>
        </div>
        <div class="flex items-center mt-4 text-sm text-gray-500">
          <span>Created by {{ quizStore.currentQuiz.userName || 'Unknown' }}</span>
          <a-divider type="vertical" />
          <span>{{ quizStore.currentQuiz.questionCount }} questions</span>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <a-tag v-for="tag in quizStore.currentQuiz.tags" :key="tag">{{ tag }}</a-tag>
        </div>
      </a-card>

      <!-- Actions -->
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

      <!-- Questions List (placeholder) -->
      <a-card title="Questions" class="shadow-sm">
        <p class="text-gray-500">Question management coming soon.</p>
        <a-button type="link" block>Add Questions</a-button>
      </a-card>
    </div>
    <div v-else class="text-center py-8 text-gray-500">
      Quiz not found.
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useQuizStore } from '../stores/quizStore';
import { useAuthStore } from '@/features/auth/stores/authStore';

const route = useRoute();
const router = useRouter();
const quizStore = useQuizStore();
const authStore = useAuthStore();

const quizId = computed(() => Number(route.params.id));

const canEdit = computed(() => {
  const quiz = quizStore.currentQuiz;
  return quiz && (authStore.isAdmin || quiz.userId === authStore.user?.id);
});

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

onMounted(() => {
  quizStore.fetchQuizById(quizId.value);
});
</script>