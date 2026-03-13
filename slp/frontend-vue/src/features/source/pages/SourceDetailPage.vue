<template>
  <MobileLayout :title="sourceStore.currentSource?.title || 'Source Details'">
    <a-card v-if="sourceStore.loading" class="text-center py-8" data-testid="source-detail-loading">
      <a-spin />
    </a-card>

    <a-alert
      v-else-if="sourceStore.error"
      :message="sourceStore.error"
      type="error"
      show-icon
      closable
      @close="sourceStore.clearError"
      data-testid="source-detail-error"
    />

    <div v-else-if="sourceStore.currentSource" class="space-y-4">
      <!-- Basic Info Card -->
      <a-card data-testid="source-detail-info-card">
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="font-medium">Title:</span>
            <span data-testid="source-detail-title">{{ sourceStore.currentSource.title || 'Untitled' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-medium">Type:</span>
            <a-tag data-testid="source-detail-type">{{ formatType(sourceStore.currentSource.type) }}</a-tag>
          </div>
          <div class="flex justify-between">
            <span class="font-medium">Added:</span>
            <span data-testid="source-detail-added">{{ formatDate(sourceStore.currentSource.createdAt) }}</span>
          </div>
          <div v-if="sourceStore.currentSource.url" class="flex justify-between">
            <span class="font-medium">URL:</span>
            <a :href="sourceStore.currentSource.url" target="_blank" class="text-blue-500 truncate max-w-[200px]" data-testid="source-detail-url">
              {{ sourceStore.currentSource.url }}
            </a>
          </div>
          <div v-if="sourceStore.currentSource.filePath" class="flex justify-between">
            <span class="font-medium">File path:</span>
            <span data-testid="source-detail-filepath">{{ sourceStore.currentSource.filePath }}</span>
          </div>
          <div v-if="sourceStore.currentSource.rawText" class="flex justify-between">
            <span class="font-medium">Content preview:</span>
            <div class="text-sm text-gray-600 max-h-32 overflow-auto" data-testid="source-detail-content-preview">
              {{ sourceStore.currentSource.rawText.substring(0, 200) }}...
            </div>
          </div>
        </div>
      </a-card>

      <!-- Actions Card -->
      <a-card title="Actions" data-testid="source-detail-actions-card">
        <div class="space-y-2">
          <!-- Edit not implemented on backend -->
          <a-button block disabled data-testid="source-detail-edit-button">
            <EditOutlined /> Edit (not available)
          </a-button>
          <a-popconfirm
            title="Delete this source?"
            ok-text="Yes"
            cancel-text="No"
            @confirm="deleteSource"
          >
            <a-button block danger data-testid="source-detail-delete-button">
              <DeleteOutlined /> Delete Source
            </a-button>
          </a-popconfirm>
        </div>
      </a-card>
    </div>

    <div v-else class="text-center py-8 text-gray-500" data-testid="source-detail-not-found">
      Source not found.
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useSourceStore } from '../stores/sourceStore';

const route = useRoute();
const router = useRouter();
const sourceStore = useSourceStore();
const sourceId = Number(route.params.id);

const formatType = (type: string) => {
  const map: Record<string, string> = {
    pdf: 'PDF',
    txt: 'Text',
    link: 'Link',
    note: 'Note',
    book: 'Book',
  };
  return map[type] || type;
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

const deleteSource = async () => {
  const success = await sourceStore.deleteSource(sourceId);
  if (success) {
    message.success('Source deleted');
    router.push('/source');
  } else {
    message.error('Delete failed');
  }
};

onMounted(() => sourceStore.fetchSource(sourceId));
</script>