<template>
  <a-radio-group
    :value="modelValue"
    @change="handleChange"
    data-testid="true-false-group"
  >
    <a-radio :value="true" data-testid="true-false-option-true">True</a-radio>
    <a-radio :value="false" data-testid="true-false-option-false">False</a-radio>
  </a-radio-group>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: boolean | null;
}>();

const emit = defineEmits(['update:model-value']);

function handleChange(e: any) {
  emit('update:model-value', e.target.value);
}
</script>