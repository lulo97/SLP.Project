<template>
  <MobileLayout :title="currentTab === 'my' ? 'My Quizzes' : 'Public Quizzes'">
    <!-- Tab Switcher -->
    <div class="flex mb-4 space-x-2">
      <a-button
        :type="currentTab === 'my' ? 'primary' : 'default'"
        @click="switchTab('my')"
        block
        data-testid="tab-my-quizzes"
      >
        My Quizzes
      </a-button>
      <a-button
        :type="currentTab === 'public' ? 'primary' : 'default'"
        @click="switchTab('public')"
        block
        data-testid="tab-public-quizzes"
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
      data-testid="search-quizzes-input"
      :searchButtonProps="{ 'data-testid': 'search-quizzes-button' }"
    />

    <!-- Quiz List -->
    <a-list
      :loading="quizStore.loading"
      :data-source="quizStore.quizzes"
      item-layout="vertical"
      class="quiz-list"
    >
      <template #renderItem="{ item }">
        <a-list-item :data-testid="`quiz-list-item-${item.id}`">
          <a-list-item-meta>
            <template #title>
              <div class="flex items-center justify-between">
                <router-link
                  :to="`/quiz/${item.id}`"
                  class="text-base font-medium"
                  :data-testid="`quiz-title-link-${item.id}`"
                >
                  {{ item.title }}
                </router-link>
                <a-tag
                  :color="item.visibility === 'public' ? 'green' : 'blue'"
                  :data-testid="`quiz-visibility-${item.id}`"
                >
                  {{ item.visibility }}
                </a-tag>
              </div>
            </template>
            <template #description>
              <div class="text-sm text-gray-500">
                <div class="mb-1" :data-testid="`quiz-description-${item.id}`">
                  {{ item.description || 'No description' }}
                </div>
                <div class="flex items-center justify-between">
                  <span :data-testid="`quiz-author-${item.id}`">
                    by {{ item.userName || 'Unknown' }}
                  </span>
                  <span :data-testid="`quiz-question-count-${item.id}`">
                    {{ item.questionCount }} questions
                  </span>
                </div>
                <div class="flex flex-wrap gap-1 mt-1">
                  <a-tag
                    v-for="tag in item.tags"
                    :key="tag"
                    size="small"
                    :data-testid="`quiz-tag-${item.id}-${tag}`"
                  >
                    {{ tag }}
                  </a-tag>
                </div>
              </div>
            </template>
          </a-list-item-meta>
          <template #actions>
            <span
              @click="handleDuplicate(item.id)"
              :data-testid="`duplicate-quiz-${item.id}`"
            >
              <CopyOutlined /> Duplicate
            </span>
            <span
              v-if="isOwnerOrAdmin(item)"
              @click="handleEdit(item.id)"
              :data-testid="`edit-quiz-${item.id}`"
            >
              <EditOutlined /> Edit
            </span>
            <span
              v-if="isOwnerOrAdmin(item)"
              @click="handleDelete(item.id)"
              :data-testid="`delete-quiz-${item.id}`"
            >
              <DeleteOutlined /> Delete
            </span>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <!-- Pagination -->
    <div
      v-if="quizStore.total > quizStore.pageSize"
      class="flex justify-center mt-4 pb-20"
      data-testid="quiz-pagination"
    >
      <a-pagination
        v-model:current="quizStore.currentPage"
        :total="quizStore.total"
        :page-size="quizStore.pageSize"
        :show-size-changer="false"
        simple
        @change="handlePageChange"
      />
    </div>

    <!-- Empty state -->
    <div
      v-if="!quizStore.loading && quizStore.quizzes.length === 0"
      class="text-center py-12 text-gray-400"
      data-testid="quiz-list-empty"
    >
      <p class="text-base">No quizzes found.</p>
    </div>

    <!-- Floating Action Button -->
    <a-float-button-group shape="square" :style="{ right: '24px', bottom: '24px' }">
      <a-float-button @click="goToCreateQuiz" data-testid="create-quiz-fab">
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
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useQuizStore } from '../stores/quizStore';
import type { QuizListDto } from '../stores/quizStore';
import { useAuthStore } from '@/features/auth/stores/authStore';

const router = useRouter();
const quizStore = useQuizStore();
const authStore = useAuthStore();

const currentTab = ref<'my' | 'public'>('my');
const searchTerm = ref('');
// Track the last search term so page changes know what to search
const activeSearchTerm = ref('');

const switchTab = (tab: 'my' | 'public') => {
  currentTab.value = tab;
  searchTerm.value = '';
  activeSearchTerm.value = '';
  // Reset to page 1 on tab switch
  if (tab === 'my') {
    quizStore.fetchMyQuizzes(1);
  } else {
    quizStore.fetchPublicQuizzes(undefined, 1);
  }
};

const handleSearch = () => {
  activeSearchTerm.value = searchTerm.value.trim();
  if (activeSearchTerm.value) {
    quizStore.searchQuizzes(activeSearchTerm.value, 1);
  } else {
    quizStore.fetchPublicQuizzes(undefined, 1);
  }
};

const handlePageChange = (page: number) => {
  if (currentTab.value === 'my') {
    quizStore.fetchMyQuizzes(page);
  } else if (activeSearchTerm.value) {
    quizStore.searchQuizzes(activeSearchTerm.value, page);
  } else {
    quizStore.fetchPublicQuizzes(undefined, page);
  }
  // Scroll to top on page change
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const isOwnerOrAdmin = (quiz: QuizListDto) => {
  return authStore.isAdmin || (authStore.user && quiz.userId === authStore.user.id);
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
        // Reload current page (or go back one page if it was the only item)
        handlePageChange(quizStore.currentPage);
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
/* Ensure pagination is nicely centered on mobile */
:deep(.ant-pagination-simple) {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>