<template>
  <MobileLayout :title="t('note.myNotes')">
    <div class="space-y-4">
      <!-- Header with create button and search -->
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 class="text-2xl font-semibold">{{ t('note.myNotes') }}</h1>
        <div class="flex gap-2">
          <a-input-search
            v-model:value="searchQuery"
            :placeholder="t('note.searchPlaceholder')"
            allow-clear
            @search="handleSearch"
            class="w-48"
          />
          <a-button type="primary" @click="goToCreate">
            <Plus :size="16" class="mr-1" />
            {{ t('note.createNote') }}
          </a-button>
        </div>
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

          <!-- Pagination -->
          <div class="flex justify-center mt-4">
            <a-pagination
              :current="store.currentPage"
              :total="store.totalItems"
              :page-size="store.pageSize"
              :show-size-changer="false"
              @change="handlePageChange"
            />
          </div>
        </div>
      </a-spin>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Plus, Edit, Trash2 } from 'lucide-vue-next';
import { message } from 'ant-design-vue';
import { useNoteStore } from '../stores/noteStore';
import MobileLayout from '@/layouts/MobileLayout.vue';

const { t } = useI18n();
const router = useRouter();
const store = useNoteStore();

const searchQuery = ref('');

onMounted(() => {
  store.fetchNotes(); // fetch first page
});

function handleSearch() {
  store.fetchNotes(searchQuery.value, 1); // reset to page 1 when searching
}

function handlePageChange(page: number) {
  store.fetchNotes(searchQuery.value, page);
}

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
    // After delete, refresh current page (or stay on same page if items remain)
    store.fetchNotes(searchQuery.value, store.currentPage);
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