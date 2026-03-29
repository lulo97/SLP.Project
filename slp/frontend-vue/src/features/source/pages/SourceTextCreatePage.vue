<template>
  <MobileLayout title="Create Note Source">
    <a-card class="shadow-sm" data-testid="source-text-create-card">
      <a-form
        :model="form"
        @submit.prevent="handleSubmit"
        layout="vertical"
        data-testid="source-note-create-form"
      >
        <a-form-item label="Title" required>
          <a-input
            v-model:value="form.title"
            placeholder="Enter a descriptive title"
            :maxlength="255"
            show-count
            data-testid="source-note-create-title-input"
          />
        </a-form-item>

        <a-form-item label="Content" required>
          <a-textarea
            v-model:value="form.content"
            placeholder="Paste or type your text here..."
            :rows="8"
            :maxlength="10000"
            show-count
            data-testid="source-note-create-content-input"
          />
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="sourceStore.loading"
            :disabled="!form.title.trim() || !form.content.trim()"
            block
            data-testid="source-note-create-submit-btn"
          >
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
        data-testid="source-note-create-error"
      />
    </a-card>
  </MobileLayout>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useSourceStore } from "../stores/sourceStore";

const router = useRouter();
const sourceStore = useSourceStore();

const form = reactive({ title: "", content: "" });

const handleSubmit = async () => {
  if (!form.title.trim() || !form.content.trim()) {
    message.warning("Both title and content are required");
    return;
  }
  const created = await sourceStore.createSourceFromNote({
    title: form.title,
    content: form.content,
  });
  if (created) {
    message.success("Text source created");
    router.push(`/source/${created.id}`);
  }
};
</script>