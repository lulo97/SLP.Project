<template>
  <MobileLayout title="Upload Source">
    <a-card class="shadow-sm" data-testid="source-upload-card">
      <a-form
        layout="vertical"
        @submit.prevent="handleUpload"
        data-testid="source-upload-form"
      >
        <a-form-item label="Title" required>
          <a-input
            v-model:value="title"
            placeholder="Enter source title"
            data-testid="source-upload-title-input"
          />
        </a-form-item>

        <a-upload-dragger
          v-model:file-list="fileList"
          name="file"
          :multiple="false"
          :before-upload="beforeUpload"
          @remove="handleRemove"
          data-testid="source-upload-dragger"
        >
          <p class="ant-upload-drag-icon" data-testid="source-upload-dragger-icon">
            <InboxOutlined />
          </p>
          <p class="ant-upload-text" data-testid="source-upload-dragger-text">
            Click or drag file to this area to upload
          </p>
          <p class="ant-upload-hint" data-testid="source-upload-dragger-hint">
            Support for PDF, TXT. Max 10MB.
          </p>
        </a-upload-dragger>

        <!-- Selected file name -->
        <div
          v-if="fileList.length"
          class="mt-2 text-xs text-gray-500"
          data-testid="source-upload-selected-file"
        >
          Selected: {{ fileList[0]?.name }}
        </div>

        <a-button
          type="primary"
          html-type="submit"
          :loading="sourceStore.loading"
          :disabled="!fileList.length || !title.trim()"
          block
          class="mt-4"
          data-testid="source-upload-submit-btn"
        >
          Upload
        </a-button>
      </a-form>

      <a-alert
        v-if="sourceStore.error"
        :message="sourceStore.error"
        type="error"
        show-icon
        closable
        @close="sourceStore.clearError"
        class="mt-4"
        data-testid="source-upload-error"
      />
    </a-card>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { InboxOutlined } from "@ant-design/icons-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useSourceStore } from "../stores/sourceStore";

const router = useRouter();
const sourceStore = useSourceStore();
const fileList = ref<any[]>([]);
const title = ref("");

const beforeUpload = (file: File) => {
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) message.error("File must be smaller than 10MB");
  return isLt10M;
};

const handleRemove = () => { fileList.value = []; };

const handleUpload = async () => {
  if (!fileList.value.length || !title.value.trim()) return;
  const file = fileList.value[0].originFileObj;
  const result = await sourceStore.uploadSource(file, title.value);
  if (result) {
    message.success("File uploaded successfully");
    fileList.value = [];
    title.value = "";
    router.push(`/source/${result.id}`);
  }
};
</script>