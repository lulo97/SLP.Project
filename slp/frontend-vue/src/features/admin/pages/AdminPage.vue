<template>
  <MobileLayout title="Admin Panel">
    <a-tabs
      v-model:activeKey="activeTab"
      class="admin-tabs"
      data-testid="admin-tabs"
    >
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
          <div v-if="adminStore.loading.users" class="loading-state">
            <a-spin />
          </div>
          <template v-else>
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
            <p v-if="!adminStore.users.length" class="empty-state">
              No users found.
            </p>
            <a-pagination
              v-model:current="userPage"
              v-model:pageSize="userPageSize"
              :total="adminStore.pagination.users.total"
              show-size-changer
              :page-size-options="['10', '20', '50', '100']"
              @change="handleUserPageChange"
              @showSizeChange="handleUserSizeChange"
              class="pagination-wrapper"
            />
          </template>
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
          <div v-if="adminStore.loading.quizzes" class="loading-state">
            <a-spin />
          </div>
          <template v-else>
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
            <p v-if="!adminStore.quizzes.length" class="empty-state">
              No quizzes found.
            </p>
            <a-pagination
              v-model:current="quizPage"
              v-model:pageSize="quizPageSize"
              :total="adminStore.pagination.quizzes.total"
              show-size-changer
              :page-size-options="['10', '20', '50', '100']"
              @change="handleQuizPageChange"
              @showSizeChange="handleQuizSizeChange"
              class="pagination-wrapper"
            />
          </template>
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
          <div v-if="adminStore.loading.comments" class="loading-state">
            <a-spin />
          </div>
          <template v-else>
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
            <p v-if="!adminStore.comments.length" class="empty-state">
              No comments found.
            </p>
            <a-pagination
              v-model:current="commentPage"
              v-model:pageSize="commentPageSize"
              :total="adminStore.pagination.comments.total"
              show-size-changer
              :page-size-options="['10', '20', '50', '100']"
              @change="handleCommentPageChange"
              @showSizeChange="handleCommentSizeChange"
              class="pagination-wrapper"
            />
          </template>
        </div>
      </a-tab-pane>

      <!-- Logs Tab -->
      <a-tab-pane key="logs">
        <template #tab>
          <span data-testid="admin-tab-logs">Logs</span>
        </template>
        <div data-testid="admin-logs-panel">
          <AdminLogFilters @apply="handleLogFilters" />
          <div v-if="adminStore.loading.logs" class="loading-state">
            <a-spin />
          </div>
          <template v-else>
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
            <p v-if="!adminStore.logs.length" class="empty-state">
              No logs found.
            </p>
            <a-pagination
              v-model:current="logPage"
              v-model:pageSize="logPageSize"
              :total="adminStore.pagination.logs.total"
              show-size-changer
              :page-size-options="['10', '20', '50', '100']"
              @change="handleLogPageChange"
              @showSizeChange="handleLogSizeChange"
              class="pagination-wrapper"
            />
          </template>
        </div>
      </a-tab-pane>

      <!-- Reports Tab -->
      <a-tab-pane key="reports">
        <template #tab>
          <span data-testid="admin-tab-reports">Reports</span>
        </template>
        <div data-testid="admin-reports-panel">
          <!-- Replace placeholder with the actual component -->
          <AdminReports />
        </div>
      </a-tab-pane>
    </a-tabs>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  Tabs,
  TabPane,
  Input,
  Tag,
  Button,
  Popconfirm,
  Checkbox,
  Spin,
} from "ant-design-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useAdminStore } from "../stores/adminStore";
import AdminLogFilters from "../components/AdminLogFilters.vue";
import AdminReports from "@/features/report/pages/AdminReports.vue";

const ATabs = Tabs;
const ATabPane = TabPane;
const AInputSearch = Input.Search;
const ATag = Tag;
const AButton = Button;
const APopconfirm = Popconfirm;
const ACheckbox = Checkbox;
const ASpin = Spin;

const adminStore = useAdminStore();

const activeTab = ref("users");
const userSearch = ref("");
const quizSearch = ref("");
const includeDeleted = ref(false);
const commentSearch = ref("");
const userPage = ref(1);
const userPageSize = ref(20);

const quizPage = ref(1);
const quizPageSize = ref(20);

const commentPage = ref(1);
const commentPageSize = ref(20);

const logPage = ref(1);
const logPageSize = ref(20);

// Users
const handleUserPageChange = (page: number) => {
  userPage.value = page;
  adminStore.fetchUsers(userSearch.value, page, userPageSize.value);
};
const handleUserSizeChange = (_current: number, size: number) => {
  userPageSize.value = size;
  userPage.value = 1;
  adminStore.fetchUsers(userSearch.value, 1, size);
};

// Quizzes (same pattern)
const handleQuizPageChange = (page: number) => {
  quizPage.value = page;
  adminStore.fetchQuizzes(quizSearch.value, page, quizPageSize.value);
};
const handleQuizSizeChange = (_current: number, size: number) => {
  quizPageSize.value = size;
  quizPage.value = 1;
  adminStore.fetchQuizzes(quizSearch.value, 1, size);
};

// Comments
const handleCommentPageChange = (page: number) => {
  commentPage.value = page;
  adminStore.fetchComments(
    includeDeleted.value,
    commentSearch.value,
    page,
    commentPageSize.value,
  );
};
const handleCommentSizeChange = (_current: number, size: number) => {
  commentPageSize.value = size;
  commentPage.value = 1;
  adminStore.fetchComments(includeDeleted.value, commentSearch.value, 1, size);
};

// Logs
const handleLogPageChange = (page: number) => {
  logPage.value = page;
  adminStore.fetchLogs(logFilters.value, page, logPageSize.value);
};
const handleLogSizeChange = (_current: number, size: number) => {
  logPageSize.value = size;
  logPage.value = 1;
  adminStore.fetchLogs(logFilters.value, 1, size);
};

const logFilters = ref<any>({});

const handleLogFilters = (filters: any) => {
  logFilters.value = filters;
  logPage.value = 1;
  adminStore.fetchLogs(filters, 1, logPageSize.value);
};

const handleUserSearch = () => {
  userPage.value = 1;
  adminStore.fetchUsers(userSearch.value, 1, userPageSize.value);
};

const handleQuizSearch = () => {
  quizPage.value = 1;
  adminStore.fetchQuizzes(quizSearch.value, 1, quizPageSize.value);
};

const handleCommentSearch = () => {
  commentPage.value = 1;
  adminStore.fetchComments(
    includeDeleted.value,
    commentSearch.value,
    1,
    commentPageSize.value,
  );
};

const handleIncludeDeletedChange = () => {
  commentPage.value = 1;
  adminStore.fetchComments(
    includeDeleted.value,
    commentSearch.value,
    1,
    commentPageSize.value,
  );
};

const refreshComments = () => {
  adminStore.fetchComments(includeDeleted.value, commentSearch.value);
};

onMounted(() => {
  adminStore.fetchUsers(undefined, 1, userPageSize.value);
  adminStore.fetchQuizzes(undefined, 1, quizPageSize.value);
  adminStore.fetchComments(false, undefined, 1, commentPageSize.value);
  adminStore.fetchLogs({}, 1, logPageSize.value);
});
</script>

<style scoped>
/* Card styling */
.mobile-card {
  margin-bottom: 12px;
}
.mobile-card :deep(.ant-card-body) {
  padding: 16px;
}
.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
.field-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}
.field-label {
  width: 120px;
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

/* Touch targets: at least 44×44px per accessibility guidelines */
.touch-button {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
}

/* Truncate long comment content */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
</style>
