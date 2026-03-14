<template>
  <a-checkbox-group
    :value="modelValue"
    @change="handleChange"
    data-testid="multiple-choice-group"
  >
    <a-checkbox
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :data-testid="`multiple-choice-option-${opt.id}`"
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