<template>
  <a-card title="Comments" class="shadow-sm mt-4" data-testid="comments-section">
    <div v-if="store.loading" class="text-center py-4">
      <a-spin size="small" data-testid="comments-loading" />
    </div>
    <div v-else>
      <!-- New top‑level comment form -->
      <div v-if="isAuthenticated" class="mb-4">
        <a-textarea
          v-model:value="newCommentContent"
          placeholder="Write a comment..."
          :rows="2"
          data-testid="new-comment-input"
        />
        <a-button
          type="primary"
          class="mt-2"
          @click="handleAddComment"
          :loading="store.loading"
          data-testid="submit-comment-button"
        >
          Add Comment
        </a-button>
      </div>
      <div v-else class="text-gray-500 mb-4">
        <a href="/login" data-testid="login-to-comment">Log in</a> to comment.
      </div>

      <!-- Comments list -->
      <div v-if="store.comments.length === 0" class="text-gray-400 text-sm py-2" data-testid="no-comments-message">
        No comments yet.
      </div>
      <div v-else class="space-y-4">
        <CommentItem
          v-for="comment in store.comments"
          :key="comment.id"
          :comment="comment"
          :target-type="targetType"
          :target-id="targetId"
          :is-authenticated="isAuthenticated"
          :current-user-id="currentUserId"
          :is-admin="isAdmin"
          @reply="openReplyForm"
          @edit="() => {}"
          @delete="handleDeleteComment"
           @report="openReportModal"
        />
      </div>
    </div>

    <!-- Reply modal with custom footer buttons -->
    <a-modal
      v-model:visible="replyModalVisible"
      title="Reply to comment"
      :confirm-loading="store.loading"
      data-testid="reply-modal"
    >
      <a-textarea
        v-model:value="replyContent"
        :rows="3"
        placeholder="Write your reply..."
        data-testid="reply-input"
      />
      <template #footer>
        <a-button
          key="cancel"
          @click="replyModalVisible = false"
          data-testid="reply-modal-cancel"
        >
          Cancel
        </a-button>
        <a-button
          key="submit"
          type="primary"
          :loading="store.loading"
          @click="handleReplySubmit"
          data-testid="reply-modal-ok"
        >
          Reply
        </a-button>
      </template>
    </a-modal>

    <ReportModal
  v-model:visible="reportModalVisible"
  :target-type="'comment'"
  :target-id="reportingCommentId!"
  @reported="reportModalVisible = false"
/>
  </a-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';
import { useCommentStore } from '../stores/commentStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import CommentItem from './CommentItem.vue';
import ReportModal from '@/features/report/components/ReportModal.vue';

const props = defineProps<{
  targetType: string;
  targetId: number;
}>();

const store = useCommentStore();
const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated);
const currentUserId = computed(() => authStore.user?.id);
const isAdmin = computed(() => authStore.isAdmin);

const newCommentContent = ref('');
const replyModalVisible = ref(false);
const replyContent = ref('');
const replyingTo = ref<number | null>(null);
const reportModalVisible = ref(false);
const reportingCommentId = ref<number | null>(null);

  const openReportModal = (commentId: number) => {
  reportingCommentId.value = commentId;
  reportModalVisible.value = true;
};

const fetchComments = async () => {
  await store.fetchComments(props.targetType, props.targetId);
};

const handleAddComment = async () => {
  if (!newCommentContent.value.trim()) {
    message.warning('Comment cannot be empty');
    return;
  }
  try {
    await store.createComment({
      targetType: props.targetType,
      targetId: props.targetId,
      content: newCommentContent.value,
    });
    newCommentContent.value = '';
    message.success('Comment added');
  } catch {
    // error already in store
  }
};

const openReplyForm = (commentId: number) => {
  replyingTo.value = commentId;
  replyContent.value = '';
  replyModalVisible.value = true;
};

const handleReplySubmit = async () => {
  if (!replyContent.value.trim()) {
    message.warning('Reply cannot be empty');
    return;
  }
  try {
    await store.createComment({
      parentId: replyingTo.value!,
      targetType: props.targetType,
      targetId: props.targetId,
      content: replyContent.value,
    });
    replyModalVisible.value = false;
    message.success('Reply added');
  } catch {
    // handled
  }
};

const handleDeleteComment = async (commentId: number) => {
  const success = await store.deleteComment(commentId, props.targetType, props.targetId);
  if (success) {
    message.success('Comment deleted');
  } else {
    message.error('Failed to delete comment');
  }
};

// Initial fetch
fetchComments();
</script>