<template>
  <MobileLayout
    :title="isEdit ? t('note.editNote') : t('note.createNote')"
    data-testid="note-form-layout"
  >
    <div class="space-y-4" data-testid="note-form-container">
      <a-form layout="vertical" data-testid="note-entry-form">
        <a-form-item
          :label="t('note.title')"
          required
          data-testid="form-item-title"
        >
          <a-input
            v-model:value="form.title"
            :placeholder="t('note.titlePlaceholder')"
            :maxlength="255"
            data-testid="note-title-input"
          />
        </a-form-item>

        <a-form-item
          :label="t('note.content')"
          required
          data-testid="form-item-content"
        >
          <a-textarea
            v-model:value="form.content"
            :placeholder="t('note.contentPlaceholder')"
            :rows="10"
            data-testid="note-content-textarea"
          />
        </a-form-item>

        <a-form-item data-testid="form-actions-item">
          <div class="flex justify-end space-x-2">
            <a-button @click="router.back()" data-testid="cancel-form-button">
              {{ t("common.cancel") }}
            </a-button>

            <a-button
              type="primary"
              @click="handleSubmit"
              :loading="store.loading"
              data-testid="submit-form-button"
            >
              {{ isEdit ? t("common.save") : t("common.create") }}
            </a-button>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import { useNoteStore } from "../stores/noteStore";
import MobileLayout from "@/layouts/MobileLayout.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const store = useNoteStore();

const isEdit = computed(() => !!route.params.id && route.path.includes("edit"));
const noteId = computed(() => (isEdit.value ? Number(route.params.id) : null));

const form = ref({
  title: "",
  content: "",
});

onMounted(async () => {
  if (isEdit.value && noteId.value) {
    await store.fetchNoteById(noteId.value);
    if (store.currentNote) {
      form.value.title = store.currentNote.title;
      form.value.content = store.currentNote.content;
    } else {
      message.error(t("note.notFound"));
      router.back();
    }
  }
});

async function handleSubmit() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    message.error(t("note.titleContentRequired"));
    return;
  }

  try {
    if (isEdit.value && noteId.value) {
      await store.updateNote(
        noteId.value,
        form.value.title.trim(),
        form.value.content.trim(),
      );
      message.success(t("note.updateSuccess"));
    } else {
      await store.createNote(
        form.value.title.trim(),
        form.value.content.trim(),
      );
      message.success(t("note.createSuccess"));
    }
    router.push("/notes");
  } catch (err) {
    // error already handled in store
  }
}
</script>
