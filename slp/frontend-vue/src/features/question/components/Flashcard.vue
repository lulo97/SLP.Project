<template>
  <a-form-item label="Front">
    <a-textarea v-model:value="front" placeholder="Front content" :rows="3" data-testid="flashcard-front" />
  </a-form-item>
  <a-form-item label="Back">
    <a-textarea v-model:value="back" placeholder="Back content" :rows="3" data-testid="flashcard-back" />
  </a-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  front: string;
  back: string;
}>();

const emit = defineEmits<{
  (e: 'update:front', value: string): void;
  (e: 'update:back', value: string): void;
}>();

const front = computed({
  get: () => props.front,
  set: (val) => emit('update:front', val)
});

const back = computed({
  get: () => props.back,
  set: (val) => emit('update:back', val)
});
</script>