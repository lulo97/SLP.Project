<!-- features/comment/components/CommentHistoryModal.vue -->

<template>
  <a-modal
    :open="visible"
    title="Edit History"
    :footer="null"
    width="600px"
    @update:open="$emit('update:visible', $event)"
  >
    <div data-testid="comment-history-modal">
      <div v-if="store.historyLoading" class="text-center py-6">
        <a-spin />
      </div>

      <div
        v-else-if="store.history.length === 0"
        class="text-gray-400 text-sm py-4"
      >
        No history available.
      </div>

      <a-timeline v-else>
        <a-timeline-item
          v-for="(entry, index) in store.history"
          :key="entry.id"
          :data-testid="`history-entry-${entry.id}`"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-gray-400">
              {{ index === 0 ? "Original" : `Edit ${index}` }}
              &mdash;
              {{ formatDate(entry.editedAt) }}
            </span>
            <a-tag
              v-if="index === store.history.length - 1"
              color="blue"
              class="text-xs"
            >
              Latest saved
            </a-tag>
          </div>
          <div class="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">
            {{ entry.content }}
          </div>
        </a-timeline-item>
      </a-timeline>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useCommentStore } from "../stores/commentStore";

const props = defineProps<{
  visible: boolean;
  commentId: number | null;
}>();

defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const store = useCommentStore();

watch(
  () => props.visible,
  (isOpen) => {
    if (isOpen && props.commentId !== null) {
      store.fetchHistory(props.commentId);
    }
  },
);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
</script>
