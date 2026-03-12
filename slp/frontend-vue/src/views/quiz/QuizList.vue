<template>
  <MobileLayout :title="currentTab === 'my' ? 'My Quizzes' : 'Public Quizzes'">
    <!-- Tab Switcher -->
    <div class="flex mb-4 space-x-2">
      <a-button
        :type="currentTab === 'my' ? 'primary' : 'default'"
        @click="switchTab('my')"
        block
      >
        My Quizzes
      </a-button>
      <a-button
        :type="currentTab === 'public' ? 'primary' : 'default'"
        @click="switchTab('public')"
        block
      >
        Public Quizzes
      </a-button>
    </div>

    <!-- Search (only for public) -->
    <a-input-search
      v-if="currentTab === 'public'"
      v-model:value="searchTerm"
      placeholder="Search public quizzes..."
      enter-button
      @search="handleSearch"
      class="mb-4"
    />

    <!-- Quiz List -->
    <a-list
      :loading="quizStore.loading"
      :data-source="quizStore.quizzes"
      item-layout="vertical"
      class="quiz-list"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <a-list-item-meta>
            <template #title>
              <div class="flex items-center justify-between">
                <router-link :to="`/quiz/${item.id}`" class="text-lg font-medium">
                  {{ item.title }}
                </router-link>
                <a-tag :color="item.visibility === 'public' ? 'green' : item.visibility === 'unlisted' ? 'orange' : 'blue'">
                  {{ item.visibility }}
                </a-tag>
              </div>
            </template>
            <template #description>
              <div class="text-sm text-gray-500">
                <div class="mb-2">{{ item.description || 'No description' }}</div>
                <div class="flex items-center justify-between">
                  <span>by {{ item.userName || 'Unknown' }}</span>
                  <span>{{ item.questionCount }} questions</span>
                </div>
                <div class="flex flex-wrap gap-1 mt-2">
                  <a-tag v-for="tag in item.tags" :key="tag" size="small">{{ tag }}</a-tag>
                </div>
              </div>
            </template>
          </a-list-item-meta>
          <template #actions>
            <span @click="handleDuplicate(item.id)">
              <CopyOutlined /> Duplicate
            </span>
            <span v-if="isOwnerOrAdmin(item)" @click="handleEdit(item.id)">
              <EditOutlined /> Edit
            </span>
            <span v-if="isOwnerOrAdmin(item)" @click="handleDelete(item.id)">
              <DeleteOutlined /> Delete
            </span>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <!-- Floating Action Button to Create Quiz -->
    <a-float-button-group shape="square" :style="{ right: '24px', bottom: '24px' }">
      <a-float-button @click="goToCreateQuiz">
        <template #icon><PlusOutlined /></template>
      </a-float-button>
    </a-float-button-group>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined, CopyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import MobileLayout from '../../components/MobileLayout.vue';
import { useQuizStore } from '../../stores/quiz';
import type { QuizListDto } from '../../stores/quiz';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const quizStore = useQuizStore();
const authStore = useAuthStore();

const currentTab = ref<'my' | 'public'>('my');
const searchTerm = ref('');

const switchTab = (tab: 'my' | 'public') => {
  currentTab.value = tab;
  if (tab === 'my') {
    quizStore.fetchMyQuizzes();
  } else {
    quizStore.fetchPublicQuizzes();
  }
};

const handleSearch = () => {
  if (searchTerm.value.trim()) {
    quizStore.searchQuizzes(searchTerm.value);
  } else {
    quizStore.fetchPublicQuizzes();
  }
};

const isOwnerOrAdmin = (quiz: QuizListDto) => {
  // You need to store userId in auth store, or compare with quiz.userId
  // For now, just check if user is admin or we have userId in quiz
  return authStore.isAdmin || (authStore.user && 'userId' in quiz && quiz.userId === authStore.user.id);
};

const handleDuplicate = async (id: number) => {
  const duplicated = await quizStore.duplicateQuiz(id);
  if (duplicated) {
    message.success('Quiz duplicated');
    router.push(`/quiz/${duplicated.id}/edit`);
  } else {
    message.error('Failed to duplicate');
  }
};

const handleEdit = (id: number) => {
  router.push(`/quiz/${id}/edit`);
};

const handleDelete = (id: number) => {
  Modal.confirm({
    title: 'Delete Quiz',
    content: 'Are you sure you want to delete this quiz?',
    okText: 'Yes',
    okType: 'danger',
    cancelText: 'No',
    onOk: async () => {
      const success = await quizStore.deleteQuiz(id);
      if (success) {
        message.success('Quiz deleted');
        // Refresh list
        switchTab(currentTab.value);
      } else {
        message.error('Failed to delete');
      }
    },
  });
};

const goToCreateQuiz = () => {
  router.push('/quiz/new');
};

onMounted(() => {
  switchTab('my');
});
</script>

<style scoped>
.quiz-list :deep(.ant-list-item-meta-description) {
  margin-top: 4px;
}
</style>