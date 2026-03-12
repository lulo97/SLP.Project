<template>
  <a-form-item label="Correct Answer">
    <a-radio-group
      :value="answer"
      @update:value="$emit('update:answer', $event)"
      data-testid="true-false-group"
    >
      <a-radio value="true" data-testid="true-false-true">True</a-radio>
      <a-radio value="false" data-testid="true-false-false">False</a-radio>
    </a-radio-group>
  </a-form-item>
</template>

<script setup lang="ts">
defineProps<{
  answer: string;
}>();

const emit = defineEmits<{
  (e: 'update:answer', value: string): void;
}>();
</script>