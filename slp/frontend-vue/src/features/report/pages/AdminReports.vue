<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">Reports</h2>

    <a-table
      :data-source="reports"
      :loading="loading"
      :columns="columns"
      row-key="id"
      :pagination="false"
      data-testid="admin-reports-table"
    >
      <template #bodyCell="{ column, record }">
        <!-- Target info -->
        <template v-if="column.key === 'target'">
          {{ record.targetType }} #{{ record.targetId }}
        </template>

        <!-- Reason with truncation -->
        <template v-if="column.key === 'reason'">
          <a-tooltip :title="record.reason">
            <span>{{ truncate(record.reason, 50) }}</span>
          </a-tooltip>
        </template>

        <!-- Created at -->
        <template v-if="column.key === 'createdAt'">
          {{ formatDate(record.createdAt) }}
        </template>

        <!-- Actions -->
        <template v-if="column.key === 'actions'">
          <div class="space-x-2">
            <!-- Resolve button -->
            <a-button
              size="small"
              type="primary"
              ghost
              @click="handleResolve(record.id)"
              :loading="resolvingIds.includes(record.id)"
              data-testid="resolve-report-btn"
            >
              Resolve
            </a-button>

            <!-- Delete comment (if target is comment) -->
            <a-popconfirm
              v-if="record.targetType === 'comment'"
              title="Delete this comment?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="handleDeleteComment(record)"
            >
              <a-button size="small" danger ghost data-testid="delete-comment-btn">
                Delete Comment
              </a-button>
            </a-popconfirm>

            <!-- Disable quiz (if target is quiz) -->
            <a-popconfirm
              v-if="record.targetType === 'quiz'"
              title="Disable this quiz?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="handleDisableQuiz(record)"
            >
              <a-button size="small" danger ghost data-testid="disable-quiz-btn">
                Disable Quiz
              </a-button>
            </a-popconfirm>

            <!-- View target link -->
            <a-button size="small" @click="viewTarget(record)" data-testid="view-target-btn">
              View
            </a-button>
          </div>
        </template>
      </template>

      <template #emptyText>
        <div class="text-center py-8 text-gray-500" data-testid="no-reports">
          No unresolved reports.
        </div>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import apiClient from '@/lib/api/client';
import dayjs from 'dayjs';

interface ReportDto {
  id: number;
  userId: number;
  username: string;
  targetType: 'quiz' | 'question' | 'comment';
  targetId: number;
  reason: string;
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

const reports = ref<ReportDto[]>([]);
const loading = ref(false);
const resolvingIds = ref<number[]>([]);

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: 'Reporter', dataIndex: 'username', key: 'username' },
  { title: 'Target', key: 'target' },
  { title: 'Reason', key: 'reason' },
  { title: 'Created', key: 'createdAt', width: 150 },
  { title: 'Actions', key: 'actions', width: 240 },
];

const router = useRouter();

const truncate = (text: string, length: number) => {
  return text.length > length ? text.slice(0, length) + '…' : text;
};

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
};

const fetchReports = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get<ReportDto[]>('/reports');
    // The endpoint returns unresolved reports by default (see backend)
    reports.value = response.data;
  } catch (err: any) {
    message.error('Failed to load reports');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleResolve = async (reportId: number) => {
  resolvingIds.value.push(reportId);
  try {
    await apiClient.post(`/reports/${reportId}/resolve`);
    message.success('Report resolved');
    // Remove from list
    reports.value = reports.value.filter(r => r.id !== reportId);
  } catch (err: any) {
    message.error(err.response?.data?.message || 'Failed to resolve report');
  } finally {
    resolvingIds.value = resolvingIds.value.filter(id => id !== reportId);
  }
};

const handleDeleteComment = async (report: ReportDto) => {
  try {
    await apiClient.delete(`/admin/comments/${report.targetId}`);
    message.success('Comment deleted');
    // Optionally resolve the report automatically
    await handleResolve(report.id);
  } catch (err: any) {
    message.error(err.response?.data?.message || 'Failed to delete comment');
  }
};

const handleDisableQuiz = async (report: ReportDto) => {
  try {
    await apiClient.post(`/admin/quizzes/${report.targetId}/disable`);
    message.success('Quiz disabled');
    await handleResolve(report.id);
  } catch (err: any) {
    message.error(err.response?.data?.message || 'Failed to disable quiz');
  }
};

const viewTarget = (report: ReportDto) => {
  switch (report.targetType) {
    case 'quiz':
      router.push(`/quiz/${report.targetId}`);
      break;
    case 'comment':
      // Comments don't have standalone pages, but we could navigate to the parent entity
      // For simplicity, we'll just show a message
      message.info('Comments are viewed on their parent pages');
      break;
    case 'question':
      router.push(`/question/${report.targetId}`);
      break;
    default:
      message.warning('Unknown target type');
  }
};

onMounted(() => {
  fetchReports();
});
</script>