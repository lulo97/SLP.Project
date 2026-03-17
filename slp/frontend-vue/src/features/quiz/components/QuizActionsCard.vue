<template>
  <a-card title="Actions" class="shadow-sm">
    <div class="space-y-2">
      <a-button block @click="router.push(`/quiz/${quizId}/edit`)" v-if="canEdit" data-testid="edit-quiz-button">
        <EditOutlined /> Edit Quiz
      </a-button>
      <a-button block @click="emit('duplicate')" data-testid="duplicate-quiz-button">
        <CopyOutlined /> Duplicate
      </a-button>
      <a-popconfirm
        title="Delete this quiz?"
        ok-text="Yes"
        cancel-text="No"
        @confirm="emit('delete')"
        :okButtonProps="{ 'data-testid': 'confirm-delete-quiz-button' }"
        :cancelButtonProps="{ 'data-testid': 'cancel-delete-quiz-button' }"
      >
        <a-button block danger v-if="canEdit" data-testid="delete-quiz-button">
          <DeleteOutlined /> Delete Quiz
        </a-button>
      </a-popconfirm>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
  quizId: number;
  canEdit: boolean;
}>();

const router = useRouter();
const emit = defineEmits<{
  (e: 'duplicate'): void;
  (e: 'delete'): void;
}>();
</script>