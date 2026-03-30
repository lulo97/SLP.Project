<template>
  <MobileLayout title="Admin Panel">
    <a-tabs v-model:activeKey="activeTab" class="admin-tabs">
      <!-- Users Tab -->
      <a-tab-pane key="users">
        <template #tab>
          <span data-testid="admin-tab-users">Users</span>
        </template>
        <div data-testid="admin-users-panel">
          <a-input-search
            v-model:value="userSearch"
            placeholder="Search by username or email..."
            style="margin-bottom: 16px"
            @search="handleUserSearch"
            data-testid="admin-users-search"
          />
          <!-- Desktop table -->
          <div class="desktop-table">
            <a-table
              :data-source="adminStore.users"
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
                    {{ record.emailConfirmed ? "Verified" : "Unverified" }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <div class="flex gap-2">
                    <a-popconfirm
                      :title="
                        record.status === 'active'
                          ? 'Ban this user?'
                          : 'Unban this user?'
                      "
                      @confirm="
                        record.status === 'active'
                          ? adminStore.banUser(record.id)
                          : adminStore.unbanUser(record.id)
                      "
                    >
                      <a-button
                        :type="
                          record.status === 'active' ? 'primary' : 'default'
                        "
                        :danger="record.status === 'active'"
                        size="small"
                        :data-testid="`admin-user-${record.status === 'active' ? 'ban' : 'unban'}-${record.id}`"
                      >
                        {{ record.status === "active" ? "Ban" : "Unban" }}
                      </a-button>
                    </a-popconfirm>
                  </div>
                </template>
              </template>
            </a-table>
          </div>
          <!-- Mobile cards -->
          <div class="mobile-cards">
            <a-card
              v-for="user in adminStore.users"
              :key="user.id"
              class="mobile-card"
              size="small"
            >
              <div class="field-row">
                <span class="field-label">ID:</span>
                <span class="field-value">{{ user.id }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Username:</span>
                <span class="field-value">{{ user.username }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Email:</span>
                <span class="field-value">{{ user.email || "—" }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Role:</span>
                <span class="field-value">
                  <a-tag :color="user.role === 'admin' ? 'red' : 'blue'">{{
                    user.role
                  }}</a-tag>
                </span>
              </div>
              <div class="field-row">
                <span class="field-label">Status:</span>
                <span class="field-value">
                  <a-tag :color="user.status === 'active' ? 'green' : 'red'">{{
                    user.status
                  }}</a-tag>
                </span>
              </div>
              <div class="field-row">
                <span class="field-label">Email Confirmed:</span>
                <span class="field-value">
                  <a-tag :color="user.emailConfirmed ? 'green' : 'orange'">
                    {{ user.emailConfirmed ? "Verified" : "Unverified" }}
                  </a-tag>
                </span>
              </div>
              <div class="field-row">
                <span class="field-label">Created:</span>
                <span class="field-value">{{ user.createdAt }}</span>
              </div>
              <div class="actions">
                <a-popconfirm
                  :title="
                    user.status === 'active'
                      ? 'Ban this user?'
                      : 'Unban this user?'
                  "
                  @confirm="
                    user.status === 'active'
                      ? adminStore.banUser(user.id)
                      : adminStore.unbanUser(user.id)
                  "
                >
                  <a-button
                    :type="user.status === 'active' ? 'primary' : 'default'"
                    :danger="user.status === 'active'"
                    class="touch-button"
                    :data-testid="`admin-user-${user.status === 'active' ? 'ban' : 'unban'}-${user.id}`"
                  >
                    {{ user.status === "active" ? "Ban" : "Unban" }}
                  </a-button>
                </a-popconfirm>
              </div>
            </a-card>
          </div>
        </div>
      </a-tab-pane>

      <!-- Quizzes Tab -->
      <a-tab-pane key="quizzes">
        <template #tab>
          <span data-testid="admin-tab-quizzes">Quizzes</span>
        </template>
        <div data-testid="admin-quizzes-panel">
          <a-input-search
            v-model:value="quizSearch"
            placeholder="Search by title or username..."
            style="margin-bottom: 16px"
            @search="handleQuizSearch"
            data-testid="admin-quizzes-search"
          />
          <!-- Desktop table -->
          <div class="desktop-table">
            <a-table
              :data-source="adminStore.quizzes"
              :loading="adminStore.loading.quizzes"
              :columns="quizColumns"
              row-key="id"
              size="small"
              :scroll="{ x: 'max-content' }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'visibility'">
                  <a-tag
                    :color="record.visibility === 'public' ? 'green' : 'orange'"
                  >
                    {{ record.visibility }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'disabled'">
                  <a-tag :color="record.disabled ? 'red' : 'green'">
                    {{ record.disabled ? "Disabled" : "Enabled" }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <div class="flex gap-2">
                    <a-popconfirm
                      :title="
                        record.disabled
                          ? 'Enable this quiz?'
                          : 'Disable this quiz?'
                      "
                      @confirm="
                        record.disabled
                          ? adminStore.enableQuiz(record.id)
                          : adminStore.disableQuiz(record.id)
                      "
                    >
                      <a-button
                        :type="record.disabled ? 'primary' : 'default'"
                        :danger="!record.disabled"
                        size="small"
                        :data-testid="`admin-quiz-${record.disabled ? 'enable' : 'disable'}-${record.id}`"
                      >
                        {{ record.disabled ? "Enable" : "Disable" }}
                      </a-button>
                    </a-popconfirm>
                  </div>
                </template>
              </template>
            </a-table>
          </div>
          <!-- Mobile cards -->
          <div class="mobile-cards">
            <a-card
              v-for="quiz in adminStore.quizzes"
              :key="quiz.id"
              class="mobile-card"
              size="small"
            >
              <div class="field-row">
                <span class="field-label">ID:</span>
                <span class="field-value">{{ quiz.id }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Title:</span>
                <span class="field-value">{{ quiz.title }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">User:</span>
                <span class="field-value">{{ quiz.username }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Visibility:</span>
                <span class="field-value">
                  <a-tag
                    :color="quiz.visibility === 'public' ? 'green' : 'orange'"
                    >{{ quiz.visibility }}</a-tag
                  >
                </span>
              </div>
              <div class="field-row">
                <span class="field-label">Status:</span>
                <span class="field-value">
                  <a-tag :color="quiz.disabled ? 'red' : 'green'">
                    {{ quiz.disabled ? "Disabled" : "Enabled" }}
                  </a-tag>
                </span>
              </div>
              <div class="field-row">
                <span class="field-label">Created:</span>
                <span class="field-value">{{ quiz.createdAt }}</span>
              </div>
              <div class="actions">
                <a-popconfirm
                  :title="
                    quiz.disabled ? 'Enable this quiz?' : 'Disable this quiz?'
                  "
                  @confirm="
                    quiz.disabled
                      ? adminStore.enableQuiz(quiz.id)
                      : adminStore.disableQuiz(quiz.id)
                  "
                >
                  <a-button
                    :type="quiz.disabled ? 'primary' : 'default'"
                    :danger="!quiz.disabled"
                    class="touch-button"
                    :data-testid="`admin-quiz-${quiz.disabled ? 'enable' : 'disable'}-${quiz.id}`"
                  >
                    {{ quiz.disabled ? "Enable" : "Disable" }}
                  </a-button>
                </a-popconfirm>
              </div>
            </a-card>
          </div>
        </div>
      </a-tab-pane>

      <!-- Comments Tab -->
      <a-tab-pane key="comments">
        <template #tab>
          <span data-testid="admin-tab-comments">Comments</span>
        </template>
        <div data-testid="admin-comments-panel">
          <div class="mb-4 flex items-center gap-2">
            <a-checkbox
              v-model:checked="includeDeleted"
              @change="handleIncludeDeletedChange"
              data-testid="admin-comments-show-deleted"
            >
              Show deleted
            </a-checkbox>
            <a-button
              size="small"
              @click="refreshComments"
              data-testid="admin-comments-refresh"
              >Refresh</a-button
            >
          </div>

          <a-input-search
            v-model:value="commentSearch"
            placeholder="Search by username or content..."
            style="margin-bottom: 16px"
            @search="handleCommentSearch"
            data-testid="admin-comments-search"
          />

          <!-- Desktop table -->
          <div class="desktop-table">
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
                    {{ record.deletedAt ? "Deleted" : "Active" }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <div class="flex gap-2">
                    <a-popconfirm
                      v-if="!record.deletedAt"
                      title="Delete this comment?"
                      @confirm="adminStore.deleteComment(record.id)"
                    >
                      <a-button
                        danger
                        size="small"
                        :data-testid="`admin-comment-delete-${record.id}`"
                        >Delete</a-button
                      >
                    </a-popconfirm>
                    <a-popconfirm
                      v-if="record.deletedAt"
                      title="Restore this comment?"
                      @confirm="adminStore.restoreComment(record.id)"
                    >
                      <a-button
                        type="primary"
                        size="small"
                        :data-testid="`admin-comment-restore-${record.id}`"
                        >Restore</a-button
                      >
                    </a-popconfirm>
                  </div>
                </template>
              </template>
            </a-table>
          </div>
          <!-- Mobile cards -->
          <div class="mobile-cards">
            <a-card
              v-for="comment in adminStore.comments"
              :key="comment.id"
              class="mobile-card"
              size="small"
            >
              <div class="field-row">
                <span class="field-label">ID:</span>
                <span class="field-value">{{ comment.id }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">User:</span>
                <span class="field-value">{{ comment.username }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Content:</span>
                <span class="field-value line-clamp-2">{{
                  comment.content
                }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Target:</span>
                <span class="field-value"
                  >{{ comment.targetType }} #{{ comment.targetId }}</span
                >
              </div>
              <div class="field-row">
                <span class="field-label">Status:</span>
                <span class="field-value">
                  <a-tag :color="comment.deletedAt ? 'red' : 'green'">
                    {{ comment.deletedAt ? "Deleted" : "Active" }}
                  </a-tag>
                </span>
              </div>
              <div class="field-row">
                <span class="field-label">Created:</span>
                <span class="field-value">{{ comment.createdAt }}</span>
              </div>
              <div class="actions">
                <a-popconfirm
                  v-if="!comment.deletedAt"
                  title="Delete this comment?"
                  @confirm="adminStore.deleteComment(comment.id)"
                >
                  <a-button
                    danger
                    class="touch-button"
                    :data-testid="`admin-comment-delete-${comment.id}`"
                    >Delete</a-button
                  >
                </a-popconfirm>
                <a-popconfirm
                  v-if="comment.deletedAt"
                  title="Restore this comment?"
                  @confirm="adminStore.restoreComment(comment.id)"
                >
                  <a-button
                    type="primary"
                    class="touch-button"
                    :data-testid="`admin-comment-restore-${comment.id}`"
                    >Restore</a-button
                  >
                </a-popconfirm>
              </div>
            </a-card>
          </div>
        </div>
      </a-tab-pane>

      <!-- Logs Tab -->
      <a-tab-pane key="logs">
        <template #tab>
          <span data-testid="admin-tab-logs">Logs</span>
        </template>
        <div data-testid="admin-logs-panel">
          <!-- New filter component -->
          <AdminLogFilters @apply="handleLogFilters" />

          <!-- Desktop table -->
          <div class="desktop-table">
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
                  <span v-if="record.details" class="text-xs text-gray-500"
                    >(details)</span
                  >
                </template>
              </template>
            </a-table>
          </div>

          <!-- Mobile cards -->
          <div class="mobile-cards">
            <a-card
              v-for="log in adminStore.logs"
              :key="log.id"
              class="mobile-card"
              size="small"
            >
              <div class="field-row">
                <span class="field-label">ID:</span>
                <span class="field-value">{{ log.id }}</span>
              </div>
              <!-- Admin field removed -->
              <div class="field-row">
                <span class="field-label">Action:</span>
                <span class="field-value"
                  ><a-tag color="blue">{{ log.action }}</a-tag></span
                >
              </div>
              <div class="field-row">
                <span class="field-label">Target:</span>
                <span class="field-value"
                  >{{ log.targetType }} #{{ log.targetId }}</span
                >
              </div>
              <div class="field-row">
                <span class="field-label">Details:</span>
                <span class="field-value">{{ log.details ? "Yes" : "—" }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Created:</span>
                <span class="field-value">{{ log.createdAt }}</span>
              </div>
            </a-card>
          </div>
        </div>
      </a-tab-pane>

      <!-- Reports Tab -->
      <a-tab-pane key="reports">
        <template #tab>
          <span data-testid="admin-tab-reports">Reports</span>
        </template>
        <div data-testid="admin-reports-panel">
          <!-- Desktop view (existing component) -->
          <div class="desktop-table">
            <AdminReports />
          </div>
          <!-- Mobile cards placeholder – replace with actual data when available -->
          <div class="mobile-cards">
            <!-- Example card structure – assumes reports have fields like id, reportedBy, target, reason, status, createdAt -->
            <a-card class="mobile-card" size="small" v-if="false">
              <!-- This is a template; replace with v-for when reports data is available -->
              <div class="field-row">
                <span class="field-label">ID:</span>
                <span class="field-value">123</span>
              </div>
              <div class="field-row">
                <span class="field-label">Reported by:</span>
                <span class="field-value">User name</span>
              </div>
              <div class="field-row">
                <span class="field-label">Target:</span>
                <span class="field-value">Comment #456</span>
              </div>
              <div class="field-row">
                <span class="field-label">Reason:</span>
                <span class="field-value">Spam</span>
              </div>
              <div class="field-row">
                <span class="field-label">Status:</span>
                <span class="field-value"
                  ><a-tag color="orange">Pending</a-tag></span
                >
              </div>
              <div class="field-row">
                <span class="field-label">Created:</span>
                <span class="field-value">2025-03-19</span>
              </div>
              <div class="actions">
                <a-button class="touch-button" type="primary">Resolve</a-button>
                <a-button class="touch-button" danger>Delete</a-button>
              </div>
            </a-card>
            <p v-else class="text-gray-500 p-4 text-center">
              Mobile view for reports is under development. Please use desktop
              or the reports component directly.
            </p>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  Tabs,
  TabPane,
  Input,
  Table,
  Tag,
  Button,
  Popconfirm,
  Checkbox,
} from "ant-design-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useAdminStore } from "../stores/adminStore";
import AdminReports from "@/features/report/pages/AdminReports.vue";
import AdminLogFilters from "../components/AdminLogFilters.vue";

const ATabs = Tabs;
const ATabPane = TabPane;
const AInputSearch = Input.Search;
const ATable = Table;
const ATag = Tag;
const AButton = Button;
const APopconfirm = Popconfirm;
const ACheckbox = Checkbox;

const adminStore = useAdminStore();

const activeTab = ref("users");
const userSearch = ref("");
const quizSearch = ref("");
const includeDeleted = ref(false);
const commentSearch = ref("");
const logSearch = ref("");

const handleUserSearch = () => {
  adminStore.fetchUsers(userSearch.value);
};

const handleQuizSearch = () => {
  adminStore.fetchQuizzes(quizSearch.value);
};

const handleCommentSearch = () => {
  adminStore.fetchComments(includeDeleted.value, commentSearch.value);
};

const handleLogSearch = () => {
  adminStore.fetchLogs(100, logSearch.value);
};

function handleLogFilters(filters: any) {
  adminStore.fetchLogs(filters);
}

// Update the includeDeleted change to refresh comments with current search
const handleIncludeDeletedChange = () => {
  adminStore.fetchComments(includeDeleted.value, commentSearch.value);
};

const refreshComments = () => {
  adminStore.fetchComments(includeDeleted.value, commentSearch.value);
};

const userColumns = [
  { title: "ID", dataIndex: "id", key: "id", width: 60 },
  { title: "Username", dataIndex: "username", key: "username" },
  { title: "Email", dataIndex: "email", key: "email" },
  { title: "Role", key: "role" },
  { title: "Status", key: "status" },
  { title: "Email Confirmed", key: "emailConfirmed" },
  { title: "Created", dataIndex: "createdAt", key: "createdAt" },
  { title: "Actions", key: "actions", width: 100 },
];

const quizColumns = [
  { title: "ID", dataIndex: "id", key: "id", width: 60 },
  { title: "Title", dataIndex: "title", key: "title" },
  { title: "User", dataIndex: "username", key: "username" },
  { title: "Visibility", key: "visibility" },
  { title: "Status", key: "disabled" },
  { title: "Created", dataIndex: "createdAt", key: "createdAt" },
  { title: "Actions", key: "actions", width: 100 },
];

const commentColumns = [
  { title: "ID", dataIndex: "id", key: "id", width: 60 },
  { title: "User", dataIndex: "username", key: "username" },
  { title: "Content", key: "content" },
  { title: "Target", key: "targetType" },
  { title: "Target ID", dataIndex: "targetId", key: "targetId" },
  { title: "Status", key: "deletedAt" },
  { title: "Created", dataIndex: "createdAt", key: "createdAt" },
  { title: "Actions", key: "actions", width: 100 },
];

const logColumns = [
  { title: "ID", dataIndex: "id", key: "id", width: 60 },
  // { title: "Admin", dataIndex: "adminName", key: "adminName" }, // REMOVED
  { title: "Action", key: "action" },
  { title: "Target Type", dataIndex: "targetType", key: "targetType" },
  { title: "Target ID", dataIndex: "targetId", key: "targetId" },
  { title: "Details", key: "details" },
  { title: "Created", dataIndex: "createdAt", key: "createdAt" },
];

onMounted(() => {
  adminStore.fetchUsers();
  adminStore.fetchQuizzes();
  adminStore.fetchComments(false);
  adminStore.fetchLogs({});
});
</script>

<style scoped>
/* Desktop / Mobile toggling */
.desktop-table {
  display: block;
}
.mobile-cards {
  display: none;
}
@media (max-width: 768px) {
  .desktop-table {
    display: none;
  }
  .mobile-cards {
    display: block;
  }
}

/* Touch targets: ensure all buttons and interactive elements are at least 44px */
.touch-button {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px; /* maintain comfortable padding */
}

/* Card styling */
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
  width: 110px;
  font-weight: 500;
  color: #666;
  flex-shrink: 0;
}
.field-value {
  flex: 1;
  word-break: break-word;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
/* Truncate long content */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
