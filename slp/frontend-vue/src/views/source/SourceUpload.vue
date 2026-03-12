<template>
  <MobileLayout title="Upload Source">
    <a-card class="shadow-sm">
      <a-upload-dragger
        v-model:file-list="fileList"
        name="file"
        :multiple="false"
        :before-upload="beforeUpload"
        @remove="handleRemove"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">Click or drag file to this area to upload</p>
        <p class="ant-upload-hint">Support for PDF, TXT, DOCX. Max 10MB.</p>
      </a-upload-dragger>

      <a-button
        type="primary"
        :loading="sourceStore.loading"
        :disabled="!fileList.length"
        @click="handleUpload"
        block
        class="mt-4"
      >
        Upload
      </a-button>

      <a-alert
        v-if="sourceStore.error"
        :message="sourceStore.error"
        type="error"
        show-icon
        closable
        @close="sourceStore.clearError"
        class="mt-4"
      />
    </a-card>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';
import MobileLayout from '../../components/MobileLayout.vue';
import { useSourceStore } from '../../stores/source';

const sourceStore = useSourceStore();
const fileList = ref<any[]>([]);

const beforeUpload = (file: File) => {
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('File must be smaller than 10MB');
  }
  return isLt10M;
};

const handleRemove = () => {
  fileList.value = [];
};

const handleUpload = async () => {
  if (fileList.value.length === 0) return;
  const file = fileList.value[0].originFileObj;
  const result = await sourceStore.uploadSource(file);
  if (result) {
    message.success('File uploaded successfully');
    fileList.value = [];
    // Optionally navigate back or clear
  }
};
</script>