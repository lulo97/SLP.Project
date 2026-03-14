<template>
  <a-checkbox-group :value="modelValue" @change="handleChange">
    <a-checkbox
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
    >
      {{ opt.text }}
    </a-checkbox>
  </a-checkbox-group>
</template>

<script setup lang="ts">
defineProps<{
  options: Array<{ id: number | string; text: string }>;
  modelValue?: number[] | string[];
}>();

const emit = defineEmits(['update:model-value']);

function handleChange(value: any) {
  emit('update:model-value', value);
}
</script>