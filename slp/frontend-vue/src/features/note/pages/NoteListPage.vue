<template>
  <MobileLayout title="My Notes">
    <div class="space-y-4">
      <!-- Header with create button -->
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-semibold">{{ t('note.myNotes') }}</h1>
        <a-button type="primary" @click="goToCreate">
          <Plus :size="16" class="mr-1" />
          {{ t('note.createNote') }}
        </a-button>
      </div>

      <!-- Loading -->
      <a-spin :spinning="store.loading" tip="Loading...">
        <div class="space-y-3">
          <!-- Empty state -->
          <a-empty v-if="!store.loading && store.notes.length === 0" :description="t('note.noNotes')">
            <a-button type="primary" @click="goToCreate">{{ t('note.createNote') }}</a-button>
          </a-empty>

          <!-- Note cards -->
          <a-card
            v-for="note in store.notes"
            :key="note.id"
            class="cursor-pointer hover:shadow-md transition-shadow"
            @click="viewNote(note.id)"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="text-lg font-semibold">{{ note.title }}</h3>
                <p class="text-gray-500 text-sm mt-1">
                  {{ formatDate(note.updatedAt) }}
                </p>
                <p class="text-gray-700 mt-2 line-clamp-3">{{ note.content }}</p>
              </div>
              <div class="flex space-x-2 ml-4">
                <a-button type="text" size="small" @click.stop="editNote(note.id)">
                  <Edit :size="16" />
                </a-button>
                <a-popconfirm
                  :title="t('common.confirm')"
                  :ok-text="t('common.delete')"
                  :cancel-text="t('common.cancel')"
                  @confirm="deleteNote(note.id)"
                >
                  <a-button type="text" danger size="small" @click.stop>
                    <Trash2 :size="16" />
                  </a-button>
                </a-popconfirm>
              </div>
            </div>
          </a-card>
        </div>
      </a-spin>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Plus, Edit, Trash2 } from 'lucide-vue-next';
import { message } from 'ant-design-vue';
import { useNoteStore } from '../stores/noteStore';
import MobileLayout from '@/layouts/MobileLayout.vue';

const { t } = useI18n();
const router = useRouter();
const store = useNoteStore();

onMounted(() => {
  store.fetchNotes();
});

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function goToCreate() {
  router.push('/notes/new');
}

function viewNote(id: number) {
  router.push(`/notes/${id}`);
}

function editNote(id: number) {
  router.push(`/notes/${id}/edit`);
}

async function deleteNote(id: number) {
  try {
    await store.deleteNote(id);
    message.success(t('note.deleteSuccess'));
  } catch (err) {
    message.error(t('note.deleteError'));
  }
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>