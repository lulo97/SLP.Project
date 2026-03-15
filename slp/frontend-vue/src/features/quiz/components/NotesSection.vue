<template>
  <a-card title="My Notes" class="shadow-sm">
    <div v-if="loading" class="text-center py-4">
      <a-spin size="small" data-testid="notes-loading" />
    </div>
    <div
      v-else-if="notes.length === 0"
      class="text-gray-400 text-sm py-2"
      data-testid="no-notes-message"
    >
      No notes yet.
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="note in notes"
        :key="note.id"
        class="border rounded p-3 relative"
        :data-testid="`note-item-${note.id}`"
      >
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-medium">{{ note.title }}</h4>
          <a-button
            @click="emit('remove', note.id)"
            type="text"
            danger
            size="small"
            :data-testid="`delete-note-${note.id}`"
          >
            <DeleteOutlined />
          </a-button>
        </div>
        <p class="text-sm whitespace-pre-wrap">{{ note.content }}</p>
        <div class="text-xs text-gray-400 mt-1">
          {{ new Date(note.createdAt).toLocaleString() }}
        </div>
      </div>
    </div>
    <a-button
      @click="openAddModal"
      block
      type="dashed"
      class="mt-2"
      data-testid="add-note-button"
    >
      <PlusOutlined /> Add Note
    </a-button>

    <!-- Add Note Modal -->
    <a-modal
      v-model:visible="modalVisible"
      title="Add Note"
      @ok="handleAdd"
      ok-text="Add"
      :okButtonProps="{ 'data-testid': 'add-note-submit' }"
      :cancelButtonProps="{ 'data-testid': 'add-note-cancel' }"
    >
      <a-form :model="form" layout="vertical">
        <div data-testid="add-note-modal">
          <a-form-item label="Title" required>
            <a-input
              v-model:value="form.title"
              data-testid="note-title-input"
            />
          </a-form-item>
          <a-form-item label="Content" required>
            <a-textarea
              v-model:value="form.content"
              :rows="4"
              data-testid="note-content-input"
            />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";

const props = defineProps<{
  notes: any[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "add", note: { title: string; content: string }): void;
  (e: "remove", noteId: number): void;
}>();

const modalVisible = ref(false);
const form = ref({ title: "", content: "" });

const openAddModal = () => {
  form.value = { title: "", content: "" };
  modalVisible.value = true;
};

const handleAdd = () => {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    message.warning("Both title and content are required");
    return;
  }
  emit("add", form.value);
  modalVisible.value = false;
};
</script>
