<template>
  <a-radio-group :value="modelValue" @change="handleChange">
    <a-radio
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
    >
      {{ opt.text }}
    </a-radio>
  </a-radio-group>
</template>

<script setup lang="ts">
defineProps<{
  options: Array<{ id: number | string; text: string }>;
  modelValue?: number | string | null;
}>();

const emit = defineEmits(['update:model-value']);

function handleChange(value: any) {
  emit('update:model-value', value);
}
</script>