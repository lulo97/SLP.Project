<template>
  <MobileLayout
    :title="note?.title || t('note.noteDetail')"
  >
    <div
      v-if="store.loading"
      class="flex justify-center py-12"
      data-testid="note-loading-spinner"
    >
      <a-spin data-testid="spinner-icon" />
    </div>

    <div
      v-else-if="note"
      class="space-y-4"
      data-testid="note-content-container"
    >
      <div class="bg-white rounded-lg p-4 shadow-sm" data-testid="note-card">
        <h1 class="text-2xl font-semibold" data-testid="note-title">
          {{ note.title }}
        </h1>
        <p class="text-gray-500 text-sm mt-1" data-testid="note-updated-at">
          {{ t("note.updatedAt") }}: {{ formatDate(note.updatedAt) }}
        </p>
        <div class="mt-4 whitespace-pre-wrap" data-testid="note-body">
          {{ note.content }}
        </div>
      </div>

      <div class="flex justify-end space-x-2" data-testid="note-actions">
        <a-button
          @click="router.push(`/notes/${note.id}/edit`)"
          data-testid="edit-note-button"
        >
          <Edit :size="16" class="mr-1" data-testid="edit-icon" />
          {{ t("common.edit") }}
        </a-button>

        <a-popconfirm
          :title="t('common.confirm')"
          :ok-text="t('common.delete')"
          :cancel-text="t('common.cancel')"
          @confirm="deleteNote"
          data-testid="delete-note-confirm"
        >
          <a-button danger data-testid="delete-note-button">
            <Trash2 :size="16" class="mr-1" data-testid="trash-icon" />
            {{ t("common.delete") }}
          </a-button>
        </a-popconfirm>
      </div>
    </div>

    <a-empty
      v-else
      :description="t('note.notFound')"
      data-testid="note-empty-state"
    />
  </MobileLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import { Edit, Trash2 } from "lucide-vue-next";
import { useNoteStore } from "../stores/noteStore";
import MobileLayout from "@/layouts/MobileLayout.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const store = useNoteStore();

const noteId = Number(route.params.id);
const note = computed(() => store.currentNote);

onMounted(async () => {
  if (noteId) {
    await store.fetchNoteById(noteId);
    if (!store.currentNote) {
      message.error(t("note.notFound"));
      router.push("/notes");
    }
  }
});

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

async function deleteNote() {
  try {
    await store.deleteNote(noteId);
    message.success(t("note.deleteSuccess"));
    router.push("/notes");
  } catch (err) {
    message.error(t("note.deleteError"));
  }
}
</script>
