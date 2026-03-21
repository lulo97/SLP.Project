<template>
  <MobileLayout :title="note?.title || t('note.noteDetail')">
    <div v-if="store.loading" class="flex justify-center py-12">
      <a-spin />
    </div>
    <div v-else-if="note" class="space-y-4">
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <h1 class="text-2xl font-semibold">{{ note.title }}</h1>
        <p class="text-gray-500 text-sm mt-1">
          {{ t('note.updatedAt') }}: {{ formatDate(note.updatedAt) }}
        </p>
        <div class="mt-4 whitespace-pre-wrap">{{ note.content }}</div>
      </div>

      <div class="flex justify-end space-x-2">
        <a-button @click="router.push(`/notes/${note.id}/edit`)">
          <Edit :size="16" class="mr-1" />
          {{ t('common.edit') }}
        </a-button>
        <a-popconfirm
          :title="t('common.confirm')"
          :ok-text="t('common.delete')"
          :cancel-text="t('common.cancel')"
          @confirm="deleteNote"
        >
          <a-button danger>
            <Trash2 :size="16" class="mr-1" />
            {{ t('common.delete') }}
          </a-button>
        </a-popconfirm>
      </div>
    </div>
    <a-empty v-else :description="t('note.notFound')" />
  </MobileLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { message } from 'ant-design-vue';
import { Edit, Trash2 } from 'lucide-vue-next';
import { useNoteStore } from '../stores/noteStore';
import MobileLayout from '@/layouts/MobileLayout.vue';

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
      message.error(t('note.notFound'));
      router.push('/notes');
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
    message.success(t('note.deleteSuccess'));
    router.push('/notes');
  } catch (err) {
    message.error(t('note.deleteError'));
  }
}
</script>