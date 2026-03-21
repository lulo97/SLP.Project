<template>
  <a-modal
    :visible="visible"
    title="Find Question"
    :footer="null"
    @cancel="handleCancel"
    width="90%"
    :mask-closable="false"
    wrap-class-name="full-width-modal"
    data-testid="question-picker-modal"
  >
    <div class="space-y-3">
      <!-- Filters -->
      <div class="flex flex-col gap-2">
        <a-input-search
          v-model:value="search"
          placeholder="Search questions..."
          enter-button
          @search="handleSearch"
          data-testid="picker-search"
        />
        <div class="flex gap-2">
          <a-select
            v-model:value="typeFilter"
            placeholder="All Types"
            style="width: 140px"
            allow-clear
            @change="handleFilterChange"
            data-testid="picker-type-filter"
          >
            <a-select-option value="multiple_choice">Multiple Choice</a-select-option>
            <a-select-option value="true_false">True/False</a-select-option>
            <a-select-option value="fill_blank">Fill Blank</a-select-option>
            <a-select-option value="ordering">Ordering</a-select-option>
            <a-select-option value="matching">Matching</a-select-option>
          </a-select>
          <a-input
            v-model:value="tagFilter"
            placeholder="Filter by tag"
            style="flex: 1"
            @pressEnter="handleFilterChange"
            data-testid="picker-tag-filter"
          />
        </div>
      </div>

      <!-- Questions list -->
      <a-list
        :loading="loading"
        :data-source="questions"
        item-layout="vertical"
        data-testid="picker-questions-list"
      >
        <template #renderItem="{ item }">
          <a-list-item :data-testid="`picker-question-${item.id}`">
            <a-list-item-meta>
              <template #title>
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium">{{ item.content }}</span>
                  <a-tag>{{ formatType(item.type) }}</a-tag>
                </div>
              </template>
              <template #description>
                <div class="text-sm">
                  <p class="text-gray-500">{{ getDescription(item) || 'No description' }}</p>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <a-tag v-for="tag in item.tags" :key="tag" size="small">{{ tag }}</a-tag>
                  </div>
                </div>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button type="primary" size="small" @click="handleSelect(item)" data-testid="picker-select-button">
                Select
              </a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="flex justify-center mt-4">
        <a-pagination
          v-model:current="currentPage"
          :total="total"
          :page-size="pageSize"
          :show-size-changer="false"
          simple
          @change="handlePageChange"
          data-testid="picker-pagination"
        />
      </div>

      <!-- Empty state -->
      <div v-if="!loading && questions.length === 0" class="text-center py-12 text-gray-400">
        <p class="text-base">No questions found.</p>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuestionStore } from '@/features/question/stores/questionStore';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', question: any): void;
}>();

const questionStore = useQuestionStore();

const search = ref('');
const typeFilter = ref<string | undefined>(undefined);
const tagFilter = ref('');
const currentPage = ref(1);
const pageSize = 10;

const questions = ref<any[]>([]);
const loading = ref(false);
const total = ref(0);

const formatType = (type: string) => {
  if (!type) return 'Unknown';
  return type.split(/[_\-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const getDescription = (item: any) => {
  if (!item.metadataJson) return '';
  try {
    const metadata = JSON.parse(item.metadataJson);
    return metadata.description || '';
  } catch {
    return '';
  }
};

const fetchQuestions = async () => {
  loading.value = true;
  try {
    const params: any = {
      search: search.value || undefined,
      type: typeFilter.value || undefined,
      tag: tagFilter.value || undefined,
    };
    await questionStore.fetchQuestions(params, currentPage.value, pageSize);
    questions.value = [...questionStore.questions];
    total.value = questionStore.total;
  } catch (err) {
    console.error('Failed to fetch questions', err);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchQuestions();
};

const handleFilterChange = () => {
  currentPage.value = 1;
  fetchQuestions();
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchQuestions();
};

const handleSelect = (question: any) => {
  emit('select', question);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('update:visible', false);
};

watch(() => props.visible, (newVal) => {
  if (newVal) {
    fetchQuestions();
  } else {
    search.value = '';
    typeFilter.value = undefined;
    tagFilter.value = '';
    currentPage.value = 1;
    questions.value = [];
  }
});
</script>

<style scoped>
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