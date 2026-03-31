<template>
  <div data-testid="admin-reports-panel">
    <a-input-search
      v-model:value="searchTerm"
      placeholder="Search by reporter, target type, or reason..."
      style="margin-bottom: 16px"
      @search="handleSearch"
      data-testid="admin-reports-search"
    />

    <div v-if="loading" class="loading-state">
      <a-spin />
    </div>

    <template v-else>
      <a-card
        v-for="report in reports"
        :key="report.id"
        class="mobile-card"
        size="small"
      >
        <div class="field-row">
          <span class="field-label">ID:</span>
          <span class="field-value">{{ report.id }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Reporter:</span>
          <span class="field-value">{{ report.username }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Target:</span>
          <span class="field-value">
            {{ report.targetType }} #{{ report.targetId }}
          </span>
        </div>
        <div class="field-row">
          <span class="field-label">Reason:</span>
          <span class="field-value reason-text">{{ report.reason }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Created:</span>
          <span class="field-value">{{ formatDate(report.createdAt) }}</span>
        </div>

        <div class="actions">
          <a-button
            type="primary"
            ghost
            class="touch-button"
            :loading="resolvingIds.includes(report.id)"
            @click="handleResolve(report.id)"
            data-testid="resolve-report-btn"
          >
            Resolve
          </a-button>

          <a-popconfirm
            v-if="report.targetType === 'comment'"
            title="Delete this comment?"
            ok-text="Yes"
            cancel-text="No"
            @confirm="handleDeleteComment(report)"
          >
            <a-button
              danger
              ghost
              class="touch-button"
              data-testid="delete-comment-btn"
            >
              Delete Comment
            </a-button>
          </a-popconfirm>

          <a-popconfirm
            v-if="report.targetType === 'quiz'"
            title="Disable this quiz?"
            ok-text="Yes"
            cancel-text="No"
            @confirm="handleDisableQuiz(report)"
          >
            <a-button
              danger
              ghost
              class="touch-button"
              data-testid="disable-quiz-btn"
            >
              Disable Quiz
            </a-button>
          </a-popconfirm>

          <a-button
            class="touch-button"
            @click="viewTarget(report)"
            data-testid="view-target-btn"
          >
            View
          </a-button>
        </div>
      </a-card>

      <!-- Pagination -->
      <a-pagination
        v-model:current="currentPage"
        v-model:pageSize="pageSize"
        :total="totalReports"
        show-size-changer
        :page-size-options="['10', '20', '50', '100']"
        @change="handlePageChange"
        @showSizeChange="handleSizeChange"
        class="pagination-wrapper"
      />

      <div v-if="!reports.length" class="empty-state" data-testid="no-reports">
        No unresolved reports.
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message, Spin, Pagination } from "ant-design-vue";
import { useRouter } from "vue-router";
import apiClient from "@/lib/api/client";
import dayjs from "dayjs";

const ASpin = Spin;
const APagination = Pagination;

interface ReportDto {
  id: number;
  userId: number;
  username: string;
  targetType: "quiz" | "question" | "comment";
  targetId: number;
  reason: string;
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

const reports = ref<ReportDto[]>([]);
const loading = ref(false);
const searchTerm = ref("");
const resolvingIds = ref<number[]>([]);
const router = useRouter();

// Pagination state
const currentPage = ref(1);
const pageSize = ref(20);
const totalReports = ref(0);

// Fetch reports with pagination
const fetchReports = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get("/reports", {
      params: {
        search: searchTerm.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      },
    });
    // Backend returns PaginatedResult { items, total, page, pageSize }
    reports.value = response.data.items;
    totalReports.value = response.data.total;
    currentPage.value = response.data.page;
    pageSize.value = response.data.pageSize;
  } catch (err: any) {
    message.error("Failed to load reports");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// Search handler (reset to first page)
const handleSearch = () => {
  currentPage.value = 1;
  fetchReports();
};

// Pagination handlers
const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchReports();
};

const handleSizeChange = (current: number, size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  fetchReports();
};

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format("YYYY-MM-DD HH:mm");
};

const handleResolve = async (reportId: number) => {
  resolvingIds.value.push(reportId);
  try {
    await apiClient.post(`/reports/${reportId}/resolve`);
    message.success("Report resolved");
    await fetchReports(); // Refresh current page
  } catch (err: any) {
    message.error(err.response?.data?.error || "Failed to resolve report");
  } finally {
    resolvingIds.value = resolvingIds.value.filter((id) => id !== reportId);
  }
};

const handleDeleteComment = async (report: ReportDto) => {
  try {
    await apiClient.delete(`/admin/comments/${report.targetId}`);
    message.success("Comment deleted");
    await fetchReports(); // Refresh current page
  } catch (err: any) {
    message.error(err.response?.data?.error || "Failed to delete comment");
  }
};

const handleDisableQuiz = async (report: ReportDto) => {
  try {
    await apiClient.post(`/admin/quizzes/${report.targetId}/disable`);
    message.success("Quiz disabled");
    await fetchReports(); // Refresh current page
  } catch (err: any) {
    message.error(err.response?.data?.error || "Failed to disable quiz");
  }
};

const viewTarget = (report: ReportDto) => {
  switch (report.targetType) {
    case "quiz":
      router.push(`/quiz/${report.targetId}`);
      break;
    case "comment":
      message.info("Comments are viewed on their parent pages");
      break;
    case "question":
      router.push(`/question/${report.targetId}`);
      break;
    default:
      message.warning("Unknown target type");
  }
};

onMounted(() => {
  fetchReports();
});
</script>

<style scoped>
.mobile-card {
  margin-bottom: 12px;
}
.mobile-card :deep(.ant-card-body) {
  padding: 16px;
}

.field-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}
.field-label {
  width: 80px;
  font-weight: 500;
  color: #666;
  flex-shrink: 0;
}
.field-value {
  flex: 1;
  word-break: break-word;
}

.reason-text {
  white-space: pre-wrap;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.touch-button {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 32px 0;
  font-size: 14px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
