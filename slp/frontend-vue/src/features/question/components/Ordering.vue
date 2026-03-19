<template>
  <a-form-item label="Ordered Items (from first to last)">
    <div v-for="(_item, index) in items" :key="index" class="flex items-center mb-2">
      <!-- Arrow container for alignment -->
      <div class="w-6 flex justify-center">
        {{ index + 1 }}.
      </div>
      <a-input
        v-model:value="items[index]"
        :placeholder="`Item ${index + 1}`"
        class="flex-1"
        :data-testid="`ordering-item-${index}`"
      />
      <a-button @click="removeItem(index)" type="text" danger size="small" class="ml-2" :data-testid="`ordering-remove-${index}`">Remove</a-button>
    </div>
    <a-button @click="addItem" type="dashed" block data-testid="ordering-add">Add Item</a-button>
  </a-form-item>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

// Create a local reactive copy to avoid mutating props directly
const items = ref(props.modelValue.length ? [...props.modelValue] : ['']);

// Watch for changes and emit updated array
watch(items, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });

const addItem = () => {
  items.value.push('');
};

const removeItem = (index: number) => {
  items.value.splice(index, 1);
};
</script>

<style scoped>
/* Optional: fine-tune spacing if needed */
.flex.items-center {
  gap: 0.5rem;
}
</style>