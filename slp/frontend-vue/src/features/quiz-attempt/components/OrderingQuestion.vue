<template>
  <draggable
    v-model="localItems"
    handle=".drag-handle"
    @end="handleEnd"
    class="space-y-2"
  >
    <div
      v-for="(element, index) in localItems"
      :key="element.order_id"
      class="flex items-center gap-2 bg-gray-50 p-2 rounded border"
    >
      <span class="drag-handle cursor-move text-gray-400">☰</span>
      <span class="flex-1">{{ element.text }}</span>
      <span class="text-xs text-gray-400">{{ index + 1 }}</span>
    </div>
  </draggable>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { VueDraggableNext as draggable } from 'vue-draggable-next';

const props = defineProps<{
  items: Array<{ text: string; order_id: number }>;
  modelValue?: number[]; // array of order_id in correct order
}>();

const emit = defineEmits(['update:model-value']);

const localItems = ref<Array<{ text: string; order_id: number }>>([]);

// Initialize localItems from props.items respecting saved order if available
watch(
  () => [props.items, props.modelValue],
  () => {
    if (props.modelValue && props.modelValue.length) {
      // Reorder items according to saved order
      const orderMap = new Map(props.items.map(item => [item.order_id, item]));
      localItems.value = props.modelValue
        .map(id => orderMap.get(id))
        .filter(Boolean) as Array<{ text: string; order_id: number }>;
    } else {
      // Default to original order
      localItems.value = [...props.items];
    }
  },
  { immediate: true }
);

function handleEnd() {
  const order = localItems.value.map(item => item.order_id);
  emit('update:model-value', order);
}
</script>