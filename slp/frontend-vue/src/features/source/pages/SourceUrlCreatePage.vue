<template>
  <MobileLayout title="Add Source from URL">
    <a-card class="shadow-sm" data-testid="source-url-create-card">
      <a-form :model="form" @submit.prevent="handleSubmit" layout="vertical" data-testid="source-url-create-form">
        <a-form-item label="Title" required>
          <a-input v-model:value="form.title" placeholder="Enter source title" data-testid="source-url-create-title-input" />
        </a-form-item>

        <a-form-item label="URL" required>
          <a-input v-model:value="form.url" placeholder="https://example.com/document" data-testid="source-url-create-url-input" />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="sourceStore.loading" block data-testid="source-url-create-submit-button">
            Create Source
          </a-button>
        </a-form-item>
      </a-form>

      <a-alert
        v-if="sourceStore.error"
        :message="sourceStore.error"
        type="error"
        show-icon
        closable
        @close="sourceStore.clearError"
        class="mt-4"
        data-testid="source-url-create-error"
      />
    </a-card>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useSourceStore } from '../stores/sourceStore';

const router = useRouter();
const sourceStore = useSourceStore();

const form = ref({
  title: '',
  url: '',
});

const handleSubmit = async () => {
  if (!form.value.title.trim() || !form.value.url.trim()) {
    message.warning('Title and URL are required');
    return;
  }

  const created = await sourceStore.createSourceFromUrl(form.value);
  if (created) {
    message.success('Source created');
    router.push(`/source/${created.id}`);
  }
};
</script>