<template>
  <a-card>
    <div class="flex justify-between items-start">
      <div>
        <h2 class="text-xl font-semibold" data-testid="quiz-title">{{ quiz.title }}</h2>
        <p class="text-gray-600" data-testid="quiz-description">{{ quiz.description || 'No description' }}</p>
      </div>
      <div class="flex gap-2">
        <!-- Show disabled badge if the quiz is disabled -->
        <a-tag v-if="quiz.disabled" color="red" data-testid="quiz-disabled-badge">
          Disabled
        </a-tag>
        <a-tag :color="quiz.visibility === 'public' ? 'green' : 'blue'" data-testid="quiz-visibility">
          {{ quiz.visibility }}
        </a-tag>
      </div>
    </div>
    <div class="flex items-center mt-4 text-sm text-gray-500">
      <span data-testid="quiz-creator">Created by {{ quiz.userName || 'Unknown' }}</span>
      <a-divider type="vertical" />
      <span data-testid="quiz-questions-count">{{ totalQuestions }} questions</span>
    </div>
    <div class="flex flex-wrap gap-2 mt-3">
      <a-tag v-for="tag in quiz.tags" :key="tag" :data-testid="`quiz-tag-${tag}`">{{ tag }}</a-tag>
    </div>
  </a-card>
</template>

<script setup lang="ts">
defineProps<{
  quiz: any; // Replace with proper Quiz type
  totalQuestions: number;
}>();
</script>