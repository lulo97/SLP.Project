<template>
  <div class="comment-item" :data-testid="`comment-${comment.id}`">
    <a-comment>
      <template #author>
        <span>{{ comment.username }}</span>
      </template>
      <template #avatar>
        <a-avatar :size="32" :style="{ backgroundColor: '#87d068' }">
          {{ comment.username.charAt(0).toUpperCase() }}
        </a-avatar>
      </template>
      <template #content>
        <div v-if="editing">
          <a-textarea v-model:value="editContent" :rows="2" />
          <div class="mt-2 space-x-2">
            <a-button type="primary" size="small" @click="saveEdit">Save</a-button>
            <a-button size="small" @click="cancelEdit">Cancel</a-button>
          </div>
        </div>
        <div v-else>
          <p>{{ comment.content }}</p>
          <div v-if="comment.editedAt" class="text-xs text-gray-400">(edited)</div>
        </div>
      </template>
      <template #actions>
        <span v-if="isAuthenticated" @click="reply" data-testid="reply-button">
          <MessageOutlined /> Reply
        </span>
        <span v-if="canEdit" @click="startEdit" data-testid="edit-button">
          <EditOutlined /> Edit
        </span>
        <a-popconfirm
          v-if="canDelete"
          title="Delete this comment?"
          ok-text="Yes"
          cancel-text="No"
          @confirm="deleteComment"
        >
          <span data-testid="delete-button">
            <DeleteOutlined /> Delete
          </span>
        </a-popconfirm>
      </template>
    </a-comment>

    <!-- Replies -->
    <div v-if="comment.replies && comment.replies.length" class="ml-8 mt-2 space-y-2">
      <CommentItem
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :target-type="targetType"
        :target-id="targetId"
        :is-authenticated="isAuthenticated"
        :current-user-id="currentUserId"
        :is-admin="isAdmin"
        @reply="(id) => $emit('reply', id)"
        @edit="(id) => $emit('edit', id)"
        @delete="(id) => $emit('delete', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { MessageOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import type { CommentDto } from '../stores/commentStore';
import { useCommentStore } from '../stores/commentStore';

const props = defineProps<{
  comment: CommentDto;
  targetType: string;
  targetId: number;
  isAuthenticated: boolean;
  currentUserId?: number;
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: 'reply', commentId: number): void;
  (e: 'edit', commentId: number): void;
  (e: 'delete', commentId: number): void;
}>();

const store = useCommentStore();
const editing = ref(false);
const editContent = ref(props.comment.content);

const canEdit = computed(() => 
  props.isAuthenticated && (props.currentUserId === props.comment.userId || props.isAdmin)
);
const canDelete = canEdit; // same permissions

const reply = () => {
  emit('reply', props.comment.id);
};

const startEdit = () => {
  editing.value = true;
  editContent.value = props.comment.content;
};

const cancelEdit = () => {
  editing.value = false;
};

const saveEdit = async () => {
  if (!editContent.value.trim()) {
    message.warning('Content cannot be empty');
    return;
  }
  try {
    await store.updateComment(props.comment.id, { content: editContent.value }, props.targetType, props.targetId);
    editing.value = false;
    message.success('Comment updated');
  } catch {
    // error already in store
  }
};

const deleteComment = () => {
  emit('delete', props.comment.id);
};
</script>