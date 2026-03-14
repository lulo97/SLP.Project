<template>
  <div class="p-4 bg-yellow-50 rounded">
    <p class="font-medium">Front:</p>
    <p>{{ front || '' }}</p>
    <p class="font-medium mt-2">Back (hidden during attempt):</p>
    <p>{{ back || '' }}</p>
  </div>
  <p class="text-gray-500 text-sm mt-2">Flashcards are informational and not scored.</p>
</template>

<script setup lang="ts">
defineProps<{
  front?: string;
  back?: string;
}>();
</script>