<template>
  <MobileLayout title="Admin Panel">
    <a-tabs v-model:activeKey="activeTab" class="admin-tabs">
      <!-- Users Tab -->
      <a-tab-pane key="users" tab="Users">
        <a-input-search
          v-model:value="userSearch"
          placeholder="Search users..."
          style="margin-bottom: 16px"
          @search="handleUserSearch"
        />
        <a-table
          :data-source="filteredUsers"
          :loading="adminStore.loading.users"
          :columns="userColumns"
          row-key="id"
          size="small"
          :scroll="{ x: 'max-content' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="record.status === 'active' ? 'green' : 'red'">
                {{ record.status }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'role'">
              <a-tag :color="record.role === 'admin' ? 'red' : 'blue'">
                {{ record.role }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'emailConfirmed'">
              <a-tag :color="record.emailConfirmed ? 'green' : 'orange'">
                {{ record.emailConfirmed ? 'Verified' : 'Unverified' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="flex gap-2">
                <a-popconfirm
                  :title="record.status === 'active' ? 'Ban this user?' : 'Unban this user?'"
                  @confirm="record.status === 'active' ? adminStore.banUser(record.id) : adminStore.unbanUser(record.id)"
                >
                  <a-button
                    :type="record.status === 'active' ? 'primary' : 'default'"
                    :danger="record.status === 'active'"
                    size="small"
                  >
                    {{ record.status === 'active' ? 'Ban' : 'Unban' }}
                  </a-button>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- Quizzes Tab -->
      <a-tab-pane key="quizzes" tab="Quizzes">
        <a-input-search
          v-model:value="quizSearch"
          placeholder="Search quizzes..."
          style="margin-bottom: 16px"
          @search="handleQuizSearch"
        />
        <a-table
          :data-source="filteredQuizzes"
          :loading="adminStore.loading.quizzes"
          :columns="quizColumns"
          row-key="id"
          size="small"
          :scroll="{ x: 'max-content' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'visibility'">
              <a-tag :color="record.visibility === 'public' ? 'green' : 'orange'">
                {{ record.visibility }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'disabled'">
              <a-tag :color="record.disabled ? 'red' : 'green'">
                {{ record.disabled ? 'Disabled' : 'Enabled' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="flex gap-2">
                <a-popconfirm
                  :title="record.disabled ? 'Enable this quiz?' : 'Disable this quiz?'"
                  @confirm="record.disabled ? adminStore.enableQuiz(record.id) : adminStore.disableQuiz(record.id)"
                >
                  <a-button
                    :type="record.disabled ? 'primary' : 'default'"
                    :danger="!record.disabled"
                    size="small"
                  >
                    {{ record.disabled ? 'Enable' : 'Disable' }}
                  </a-button>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- Comments Tab -->
      <a-tab-pane key="comments" tab="Comments">
        <div class="mb-4 flex items-center gap-2">
          <a-checkbox v-model:checked="includeDeleted" @change="handleIncludeDeletedChange">
            Show deleted
          </a-checkbox>
          <a-button size="small" @click="refreshComments">Refresh</a-button>
        </div>
        <a-table
          :data-source="adminStore.comments"
          :loading="adminStore.loading.comments"
          :columns="commentColumns"
          row-key="id"
          size="small"
          :scroll="{ x: 'max-content' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'content'">
              <div class="max-w-xs truncate">{{ record.content }}</div>
            </template>
            <template v-else-if="column.key === 'deletedAt'">
              <a-tag :color="record.deletedAt ? 'red' : 'green'">
                {{ record.deletedAt ? 'Deleted' : 'Active' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="flex gap-2">
                <a-popconfirm
                  v-if="!record.deletedAt"
                  title="Delete this comment?"
                  @confirm="adminStore.deleteComment(record.id)"
                >
                  <a-button danger size="small">Delete</a-button>
                </a-popconfirm>
                <a-popconfirm
                  v-if="record.deletedAt"
                  title="Restore this comment?"
                  @confirm="adminStore.restoreComment(record.id)"
                >
                  <a-button type="primary" size="small">Restore</a-button>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- Logs Tab -->
      <a-tab-pane key="logs" tab="Logs">
        <a-table
          :data-source="adminStore.logs"
          :loading="adminStore.loading.logs"
          :columns="logColumns"
          row-key="id"
          size="small"
          :scroll="{ x: 'max-content' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <a-tag color="blue">{{ record.action }}</a-tag>
            </template>
            <template v-if="column.key === 'details'">
              <span v-if="record.details" class="text-xs text-gray-500">(details)</span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { Tabs, TabPane, Input, Table, Tag, Button, Popconfirm, Checkbox, message } from 'ant-design-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useAdminStore } from '../stores/adminStore';

const ATabs = Tabs;
const ATabPane = TabPane;
const AInputSearch = Input.Search;
const ATable = Table;
const ATag = Tag;
const AButton = Button;
const APopconfirm = Popconfirm;
const ACheckbox = Checkbox;

const adminStore = useAdminStore();

// Active tab
const activeTab = ref('users');

// Search filters
const userSearch = ref('');
const quizSearch = ref('');
const includeDeleted = ref(false);

// Column definitions
const userColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: 'Username', dataIndex: 'username', key: 'username' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Role', key: 'role' },
  { title: 'Status', key: 'status' },
  { title: 'Email Confirmed', key: 'emailConfirmed' },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Actions', key: 'actions', width: 100 },
];

const quizColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'User', dataIndex: 'username', key: 'username' },
  { title: 'Visibility', key: 'visibility' },
  { title: 'Status', key: 'disabled' },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Actions', key: 'actions', width: 100 },
];

const commentColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: 'User', dataIndex: 'username', key: 'username' },
  { title: 'Content', key: 'content' },
  { title: 'Target', key: 'targetType' },
  { title: 'Target ID', dataIndex: 'targetId', key: 'targetId' },
  { title: 'Status', key: 'deletedAt' },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Actions', key: 'actions', width: 100 },
];

const logColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: 'Admin', dataIndex: 'adminName', key: 'adminName' },
  { title: 'Action', key: 'action' },
  { title: 'Target Type', dataIndex: 'targetType', key: 'targetType' },
  { title: 'Target ID', dataIndex: 'targetId', key: 'targetId' },
  { title: 'Details', key: 'details' },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt' },
];

// Filtered users
const filteredUsers = computed(() => {
  if (!userSearch.value) return adminStore.users;
  const search = userSearch.value.toLowerCase();
  return adminStore.users.filter(
    u => u.username.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search)
  );
});

// Filtered quizzes
const filteredQuizzes = computed(() => {
  if (!quizSearch.value) return adminStore.quizzes;
  const search = quizSearch.value.toLowerCase();
  return adminStore.quizzes.filter(
    q => q.title.toLowerCase().includes(search) || q.username.toLowerCase().includes(search)
  );
});

// Handlers
const handleUserSearch = () => {
  // Already computed
};

const handleQuizSearch = () => {
  // Already computed
};

const handleIncludeDeletedChange = () => {
  adminStore.fetchComments(includeDeleted.value);
};

const refreshComments = () => {
  adminStore.fetchComments(includeDeleted.value);
};

// Load data on mount and tab change
onMounted(() => {
  adminStore.fetchUsers();
  adminStore.fetchQuizzes();
  adminStore.fetchComments(false);
  adminStore.fetchLogs();
});

// Optionally, refetch when tab changes
// (We can add watch on activeTab)
</script>

<style scoped>
.admin-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

.flex {
  display: flex;
}
.gap-2 {
  gap: 0.5rem;
}
.max-w-xs {
  max-width: 20rem;
}
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>