<template>
  <MobileLayout title="Question Bank">
    <!-- Filters -->
    <div class="space-y-3 mb-4">
      <a-input-search
        v-model:value="search"
        placeholder="Search questions..."
        enter-button
        @search="handleSearch"
        data-testid="question-search"
      />
      <div class="flex space-x-2">
        <a-select
          v-model:value="typeFilter"
          placeholder="All Types"
          style="width: 140px"
          allow-clear
          @change="handleFilterChange"
          data-testid="filter-type"
        >
          <a-select-option value="multiple_choice"
            >Multiple Choice</a-select-option
          >
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
          data-testid="filter-tag"
        />
      </div>
    </div>

    <a-list
      :loading="questionStore.loading"
      :data-source="questionStore.questions"
      item-layout="vertical"
      data-testid="questions-list"
    >
      <template #renderItem="{ item }">
        <a-list-item :data-testid="`question-item-${item.id}`">
          <a-list-item-meta :data-testid="`question-meta-${item.id}`">
            <template #title>
              <div
                class="flex items-center justify-between gap-2"
                data-testid="question-header"
              >
                <span
                  class="font-medium text-sm leading-snug"
                  :data-testid="`question-content-${item.id}`"
                >
                  {{ item.content }}
                </span>
                <a-tag
                  class="shrink-0"
                  :data-testid="`question-type-tag-${item.id}`"
                >
                  {{ formatType(item.type) }}
                </a-tag>
              </div>
            </template>
            <template #description>
              <div
                class="text-sm"
                :data-testid="`question-description-container-${item.id}`"
              >
                <p
                  class="text-gray-500"
                  :data-testid="`question-description-text-${item.id}`"
                >
                  {{ getDescription(item) || "No description" }}
                </p>
                <div
                  class="flex flex-wrap gap-1 mt-1"
                  data-testid="question-tags-container"
                >
                  <a-tag
                    v-for="tag in item.tags"
                    :key="tag"
                    size="small"
                    :data-testid="`question-tag-${tag}`"
                  >
                    {{ tag }}
                  </a-tag>
                </div>
              </div>
            </template>
          </a-list-item-meta>

          <template #actions>
            <span
              @click="handleEdit(item.id)"
              :data-testid="`edit-question-btn-${item.id}`"
              role="button"
            >
              <EditOutlined /> Edit
            </span>
            <a-popconfirm
              title="Delete this question?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="handleDelete(item.id)"
              :data-testid="`delete-confirm-${item.id}`"
            >
              <span
                :data-testid="`delete-question-btn-${item.id}`"
                role="button"
              >
                <DeleteOutlined /> Delete
              </span>
            </a-popconfirm>
          </template>
        </a-list-item>
      </template>
    </a-list>

    <!-- Pagination -->
    <div
      v-if="questionStore.total > questionStore.pageSize"
      class="flex justify-center mt-4 pb-20"
      data-testid="question-pagination"
    >
      <a-pagination
        v-model:current="questionStore.currentPage"
        :total="questionStore.total"
        :page-size="questionStore.pageSize"
        :show-size-changer="false"
        simple
        @change="handlePageChange"
      />
    </div>

    <!-- Empty state -->
    <div
      v-if="!questionStore.loading && questionStore.questions.length === 0"
      class="text-center py-12 text-gray-400"
      data-testid="question-list-empty"
    >
      <p class="text-base">No questions found.</p>
    </div>

    <!-- Floating Action Button -->
    <a-float-button-group
      shape="square"
      :style="{ right: '24px', bottom: '24px' }"
    >
      <a-float-button @click="goToCreateQuestion" data-testid="create-question">
        <template #icon><PlusOutlined /></template>
      </a-float-button>
    </a-float-button-group>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useQuestionStore } from "../stores/questionStore";

const router = useRouter();
const questionStore = useQuestionStore();

const search = ref("");
const typeFilter = ref<string | undefined>(undefined);
const tagFilter = ref("");

// Build the current filter params object
const buildParams = () => ({
  search: search.value || undefined,
  type: typeFilter.value || undefined,
  tag: tagFilter.value || undefined,
});

// Search triggered explicitly (search button or Enter in search box)
const handleSearch = () => {
  questionStore.fetchQuestions(buildParams(), 1);
};

// Filter changed (type select or tag Enter) — reset to page 1
const handleFilterChange = () => {
  questionStore.fetchQuestions(buildParams(), 1);
};

const handlePageChange = (page: number) => {
  questionStore.fetchQuestions(buildParams(), page);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const formatType = (type: string) => {
  if (!type) return "Unknown";
  return type
    .split(/[_\-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const getDescription = (item: any) => {
  if (!item.metadataJson) return "";
  try {
    const metadata = JSON.parse(item.metadataJson);
    return metadata.description || "";
  } catch {
    return "";
  }
};

const handleEdit = (id: number) => {
  router.push(`/question/${id}/edit`);
};

const handleDelete = async (id: number) => {
  const success = await questionStore.deleteQuestion(id);
  if (success) {
    message.success("Question deleted");
    // Reload the same page
    handlePageChange(questionStore.currentPage);
  } else {
    message.error("Delete failed");
  }
};

const goToCreateQuestion = () => {
  router.push("/question/new");
};

onMounted(() => {
  questionStore.fetchQuestions({}, 1);
});
</script>

<style scoped>
:deep(.ant-pagination-simple) {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
