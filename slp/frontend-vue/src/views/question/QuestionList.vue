<template>
  <MobileLayout title="Question Bank">
    <!-- Filters -->
    <div class="space-y-3 mb-4">
      <a-input-search
        v-model:value="search"
        placeholder="Search questions..."
        enter-button
        @search="fetchQuestions"
      />
      <div class="flex space-x-2">
        <a-select
          v-model:value="typeFilter"
          placeholder="All Types"
          style="width: 120px"
          allow-clear
          @change="fetchQuestions"
        >
          <a-select-option value="multiple_choice">Multiple Choice</a-select-option>
          <a-select-option value="true_false">True/False</a-select-option>
          <a-select-option value="short_answer">Short Answer</a-select-option>
        </a-select>
        <a-input
          v-model:value="tagFilter"
          placeholder="Filter by tag"
          style="flex: 1"
          @pressEnter="fetchQuestions"
        />
      </div>
    </div>

    <!-- Questions List -->
    <a-list
      :loading="questionStore.loading"
      :data-source="questionStore.questions"
      item-layout="vertical"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <a-list-item-meta>
            <template #title>
              <div class="flex items-center justify-between">
                <span class="font-medium">{{ item.title }}</span>
                <a-tag>{{ item.type }}</a-tag>
              </div>
            </template>
            <template #description>
              <div class="text-sm">
                <p class="text-gray-600">{{ item.description || 'No description' }}</p>
                <div class="flex flex-wrap gap-1 mt-2">
                  <a-tag v-for="tag in item.tags" :key="tag" size="small">{{ tag }}</a-tag>
                </div>
              </div>
            </template>
          </a-list-item-meta>
          <template #actions>
            <span @click="handleEdit(item.id)">
              <EditOutlined /> Edit
            </span>
            <a-popconfirm
              title="Delete this question?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="handleDelete(item.id)"
            >
              <span>
                <DeleteOutlined /> Delete
              </span>
            </a-popconfirm>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <a-float-button-group shape="square" :style="{ right: '24px', bottom: '24px' }">
      <a-float-button @click="goToCreateQuestion">
        <template #icon><PlusOutlined /></template>
      </a-float-button>
    </a-float-button-group>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import MobileLayout from '../../components/MobileLayout.vue';
import { useQuestionStore } from '../../stores/question';

const router = useRouter();
const questionStore = useQuestionStore();

const search = ref('');
const typeFilter = ref<string | undefined>(undefined);
const tagFilter = ref('');

const fetchQuestions = () => {
  const params: any = {};
  if (search.value) params.search = search.value;
  if (typeFilter.value) params.type = typeFilter.value;
  if (tagFilter.value) params.tag = tagFilter.value;
  questionStore.fetchQuestions(params);
};

const handleEdit = (id: number) => {
  router.push(`/question/${id}/edit`);
};

const handleDelete = async (id: number) => {
  const success = await questionStore.deleteQuestion(id);
  if (success) {
    message.success('Question deleted');
    fetchQuestions();
  } else {
    message.error('Delete failed');
  }
};

const goToCreateQuestion = () => {
  router.push('/question/new');
};

onMounted(() => {
  fetchQuestions();
});
</script>