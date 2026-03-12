<template>
  <a-form-item label="Correct Answer">
    <a-radio-group
      :value="answer"
      @update:value="$emit('update:answer', $event)"
    >
      <a-radio value="true">True</a-radio>
      <a-radio value="false">False</a-radio>
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