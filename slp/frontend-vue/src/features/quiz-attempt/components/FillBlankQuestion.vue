<template>
  <a-input
    :value="modelValue"
    @blur="handleBlur"
    @update:value="handleInput"
    placeholder="Type your answer"
    data-testid="fill-blank-input"
  />
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits(['update:model-value']);

function handleInput(value: string) {
  emit('update:model-value', value);
}

function handleBlur() {
  // Optionally emit on blur only – we already emit on input,
  // but you could change to emit only on blur for performance.
}
</script>