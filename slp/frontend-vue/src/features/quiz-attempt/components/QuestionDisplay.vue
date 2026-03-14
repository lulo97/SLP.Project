<template>
  <div
    v-if="questionData.type !== 'unknown'"
    data-testid="question-display-container"
    :data-question-type="questionData.type"
  >
    <h3
      class="text-lg font-medium mb-2"
      data-testid="question-content"
    >{{ displayContent }}</h3>

    <!-- Multiple choice -->
    <MultipleChoiceQuestion
      v-if="questionData.type === 'multiple_choice'"
      :options="questionData.metadata?.options || []"
      :model-value="answer?.selected ?? []"
      @update:model-value="emitAnswer({ selected: $event })"
      data-testid="question-type-multiple-choice"
    />

    <!-- Single choice -->
    <SingleChoiceQuestion
      v-else-if="questionData.type === 'single_choice'"
      :options="questionData.metadata?.options || []"
      :model-value="answer?.selected"
      @update:model-value="emitAnswer({ selected: $event })"
      data-testid="question-type-single-choice"
    />

    <!-- True/False -->
    <TrueFalseQuestion
      v-else-if="questionData.type === 'true_false'"
      :model-value="answer?.selected"
      @update:model-value="emitAnswer({ selected: $event })"
      data-testid="question-type-true-false"
    />

    <!-- Fill blank -->
    <FillBlankQuestion
      v-else-if="questionData.type === 'fill_blank'"
      :model-value="answer?.answer"
      @update:model-value="emitAnswer({ answer: $event })"
      data-testid="question-type-fill-blank"
    />

    <!-- Ordering -->
    <OrderingQuestion
      v-else-if="questionData.type === 'ordering'"
      :items="questionData.metadata?.items || []"
      :model-value="answer?.order ?? []"
      @update:model-value="emitAnswer({ order: $event })"
      data-testid="question-type-ordering"
    />

    <!-- Matching -->
    <MatchingQuestion
      v-else-if="questionData.type === 'matching'"
      :pairs="questionData.metadata?.pairs || []"
      :model-value="answer?.matches ?? []"
      @update:model-value="emitAnswer({ matches: $event })"
      data-testid="question-type-matching"
    />

    <!-- Flashcard (informational) -->
    <FlashcardQuestion
      v-else-if="questionData.type === 'flashcard'"
      :front="questionData.metadata?.front"
      :back="questionData.metadata?.back"
      data-testid="question-type-flashcard"
    />

    <!-- Unknown type -->
    <div v-else data-testid="question-type-unsupported">
      <p class="text-red-500">Unsupported question type: {{ questionData.type }}</p>
    </div>
  </div>

  <!-- Fallback for missing data -->
  <div
    v-else
    class="text-center py-4 text-gray-500"
    data-testid="question-fallback"
  >
    {{ questionData.content }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MultipleChoiceQuestion from './MultipleChoiceQuestion.vue';
import SingleChoiceQuestion from './SingleChoiceQuestion.vue';
import TrueFalseQuestion from './TrueFalseQuestion.vue';
import FillBlankQuestion from './FillBlankQuestion.vue';
import OrderingQuestion from './OrderingQuestion.vue';
import MatchingQuestion from './MatchingQuestion.vue';
import FlashcardQuestion from './FlashcardQuestion.vue';

const props = defineProps<{
  question: any;
  answer: any;
}>();

const emit = defineEmits(['answer-change']);

const questionData = computed(() => {
  if (!props.question?.questionSnapshotJson) {
    console.warn('[QuestionDisplay] missing snapshotJson', props.question);
    return { type: 'unknown', content: 'Question data missing', metadata: {} };
  }
  try {
    return JSON.parse(props.question.questionSnapshotJson);
  } catch (e) {
    console.error('[QuestionDisplay] JSON parse error:', e);
    return { type: 'unknown', content: 'Invalid question data', metadata: {} };
  }
});

const displayContent = computed(() => {
  const content = questionData.value.content || '';
  const keywords = questionData.value.metadata?.keywords;
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return content;
  }
  let result = content;
  keywords.forEach((kw: string) => {
    result = result.split(kw).join('___');
  });
  return result;
});

function emitAnswer(value: any) {
  emit('answer-change', value);
}
</script>