<template>
  <a-card title="Sources" class="shadow-sm">
    <div v-if="loading" class="text-center py-4">
      <a-spin size="small" data-testid="sources-loading" />
    </div>
    <div v-else-if="sources.length === 0" class="text-gray-400 text-sm py-2" data-testid="no-sources-message">
      No sources attached.
    </div>
    <div v-else class="flex flex-wrap gap-2 mb-3">
      <a-tag
        v-for="src in sources"
        :key="src.id"
        :closable="!readonly && canEdit"
        @close="emit('detach', src.id)"
        :data-testid="`source-tag-${src.id}`"
      >
        {{ src.title }}
      </a-tag>
    </div>
    <a-button
      v-if="!readonly"
      @click="openAttachModal"
      block
      type="dashed"
      :disabled="!canEdit"
      data-testid="attach-source-button"
    >
      <PlusOutlined /> Attach Source
    </a-button>

    <!-- Attach Source Modal -->
    <a-modal
      v-model:visible="modalVisible"
      title="Attach Sources"
      @ok="handleAttach"
      ok-text="Attach"
      :confirm-loading="attaching"
      :okButtonProps="{ 'data-testid': 'attach-sources-submit' }"
      :cancelButtonProps="{ 'data-testid': 'attach-sources-cancel' }"
      data-testid="attach-source-modal"
    >
      <div v-if="availableSourcesLoading" class="text-center py-4">
        <a-spin />
      </div>
      <div v-else-if="availableSources.length === 0" class="text-gray-400">
        No sources available.
        <router-link to="/source/upload">Upload a source</router-link> first.
      </div>
      <a-checkbox-group
        v-else
        v-model:value="selectedIds"
        class="flex flex-col gap-2"
        data-testid="source-checkbox-group"
      >
        <a-checkbox
          v-for="src in availableSources"
          :key="src.id"
          :value="src.id"
          :disabled="isAlreadyAttached(src.id)"
          :data-testid="`source-checkbox-${src.id}`"
        >
          {{ src.title }} ({{ src.type }})
        </a-checkbox>
      </a-checkbox-group>
    </a-modal>
  </a-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

const props = defineProps<{
  sources: any[];
  loading: boolean;
  canEdit: boolean;
  readonly?: boolean;   // <-- new
  availableSources: any[];
  availableSourcesLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'attach', sourceIds: number[]): void;
  (e: 'detach', sourceId: number): void;
}>();

const modalVisible = ref(false);
const selectedIds = ref<number[]>([]);
const attaching = ref(false);

const isAlreadyAttached = (sourceId: number) => {
  return props.sources.some((s) => s.id === sourceId);
};

const openAttachModal = () => {
  selectedIds.value = [];
  modalVisible.value = true;
};

const handleAttach = async () => {
  if (selectedIds.value.length === 0) {
    message.warning('Select at least one source');
    return;
  }
  attaching.value = true;
  try {
    await emit('attach', selectedIds.value);
    modalVisible.value = false;
  } finally {
    attaching.value = false;
  }
};
</script>