<template>
  <draggable
    v-model="localItems"
    handle=".drag-handle"
    @end="handleEnd"
    class="space-y-2"
    data-testid="ordering-container"
  >
    <div
      v-for="(element, index) in localItems"
      :key="element.order_id"
      class="flex items-center gap-2 bg-gray-50 p-2 rounded border"
      :data-testid="`ordering-row-${element.order_id}`"
      :data-index="index"
    >
      <span
        class="drag-handle cursor-move text-gray-400"
        :data-testid="`ordering-drag-handle-${element.order_id}`"
      >☰</span>
      <span
        class="flex-1"
        :data-testid="`ordering-item-text-${element.order_id}`"
      >{{ element.text }}</span>
      <span
        class="text-xs text-gray-400"
        :data-testid="`ordering-item-position-${element.order_id}`"
      >{{ index + 1 }}</span>
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

watch(
  () => [props.items, props.modelValue],
  () => {
    if (props.modelValue && props.modelValue.length) {
      const orderMap = new Map(props.items.map(item => [item.order_id, item]));
      localItems.value = props.modelValue
        .map(id => orderMap.get(id))
        .filter(Boolean) as Array<{ text: string; order_id: number }>;
    } else {
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