<template>
  <div v-if="questionData.type !== 'unknown'">
    <h3 class="text-lg font-medium mb-2">{{ questionData.content }}</h3>
    <div v-if="questionData.type === 'multiple_choice'">
      <a-checkbox-group v-model:value="selectedMultiple" @change="emitAnswer">
        <a-checkbox
          v-for="opt in questionData.metadata?.options || []"
          :key="opt.id"
          :value="opt.id"
        >
          {{ opt.text }}
        </a-checkbox>
      </a-checkbox-group>
    </div>
    <div v-else-if="questionData.type === 'single_choice'">
      <a-radio-group v-model:value="selectedSingle" @change="emitAnswer">
        <a-radio
          v-for="opt in questionData.metadata?.options || []"
          :key="opt.id"
          :value="opt.id"
        >
          {{ opt.text }}
        </a-radio>
      </a-radio-group>
    </div>
    <div v-else-if="questionData.type === 'true_false'">
      <a-radio-group v-model:value="selectedBoolean" @change="emitAnswer">
        <a-radio :value="true">True</a-radio>
        <a-radio :value="false">False</a-radio>
      </a-radio-group>
    </div>
    <div v-else-if="questionData.type === 'fill_blank'">
      <a-input
        v-model:value="fillText"
        @blur="emitAnswer"
        placeholder="Type your answer"
      />
    </div>
    <div v-else-if="questionData.type === 'ordering'">
      <div class="space-y-2">
        <div
          v-for="(item, idx) in orderItems"
          :key="idx"
          class="flex items-center gap-2"
        >
          <span>{{ idx + 1 }}.</span>
          <span class="flex-1">{{ item?.text || '' }}</span>
          <a-button size="small" @click="moveUp(idx)" :disabled="idx === 0">
            <UpOutlined />
          </a-button>
          <a-button size="small" @click="moveDown(idx)" :disabled="idx === orderItems.length - 1">
            <DownOutlined />
          </a-button>
        </div>
      </div>
    </div>
    <div v-else-if="questionData.type === 'matching'">
      <div class="space-y-2">
        <div
          v-for="(pair, idx) in matchingPairs"
          :key="idx"
          class="flex items-center gap-2"
        >
          <span class="w-24">{{ pair.left }}</span>
          <span class="text-gray-400">→</span>
          <a-select
            v-model:value="pair.selected"
            :options="rightOptions"
            style="width: 120px"
            @change="emitAnswer"
          />
        </div>
      </div>
    </div>
    <div v-else-if="questionData.type === 'flashcard'">
      <div class="p-4 bg-yellow-50 rounded">
        <p class="font-medium">Front:</p>
        <p>{{ questionData.metadata?.front || '' }}</p>
        <p class="font-medium mt-2">Back (hidden during attempt):</p>
        <p>{{ questionData.metadata?.back || '' }}</p>
      </div>
      <p class="text-gray-500 text-sm mt-2">Flashcards are informational and not scored.</p>
    </div>
    <div v-else>
      <p class="text-red-500">Unsupported question type: {{ questionData.type }}</p>
    </div>
  </div>
  <div v-else class="text-center py-4 text-gray-500">
    {{ questionData.content }}
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { UpOutlined, DownOutlined } from '@ant-design/icons-vue';

const props = defineProps<{
  question: any; // the question object from attempt (with snapshot)
  answer: any;   // current answer value (parsed object)
}>();

const emit = defineEmits(['answer-change']);

// Safe JSON parse with fallback – handles null/undefined question gracefully
const questionData = computed(() => {
  console.log('[QuestionDisplay] props.question:', props.question ? {
    quizQuestionId: props.question.quizQuestionId,
    hasSnapshot: !!props.question.questionSnapshotJson,
    snapshotType: typeof props.question.questionSnapshotJson,
    snapshotLength: props.question.questionSnapshotJson?.length,
    snapshotPreview: props.question.questionSnapshotJson?.slice(0, 50)
  } : null);
  if (!props.question?.questionSnapshotJson) {
    console.warn('[QuestionDisplay] missing snapshotJson', props.question);
    return { type: 'unknown', content: 'Question data missing', metadata: {} };
  }
  const json = props.question.questionSnapshotJson;
  try {
    const parsed = JSON.parse(json);
    console.log('[QuestionDisplay] parsed successfully, type:', parsed.type);
    return parsed;
  } catch (e) {
    console.error('[QuestionDisplay] JSON parse error:', e, json);
    return { type: 'unknown', content: 'Invalid question data', metadata: {} };
  }
});

watch(() => questionData.value.type, (type) => {
  if (type === 'unknown') {
    console.warn('[QuestionDisplay] questionData.type is unknown', questionData.value);
  }
}, { immediate: true });

// Multiple choice
const selectedMultiple = ref<number[]>([]);
// Single choice
const selectedSingle = ref<number | null>(null);
// True/False
const selectedBoolean = ref<boolean | null>(null);
// Fill blank
const fillText = ref('');
// Ordering
interface OrderItem {
  text: string;
  order_id: number;
}
const orderItems = ref<OrderItem[]>([]);
// Matching
interface MatchingPair {
  left: string;
  right: string;
  selected?: number;
}
const matchingPairs = ref<MatchingPair[]>([]);
const rightOptions = ref<{ label: string; value: number }[]>([]);

// Initialize from props.answer
watch(() => props.answer, (newVal) => {
  if (!newVal) {
    // reset to default
    const type = questionData.value.type;
    if (type === 'multiple_choice') selectedMultiple.value = [];
    else if (type === 'single_choice') selectedSingle.value = null;
    else if (type === 'true_false') selectedBoolean.value = null;
    else if (type === 'fill_blank') fillText.value = '';
    else if (type === 'ordering') {
      orderItems.value = questionData.value.metadata?.items || [];
      // answer might contain order array
      if (newVal && newVal.order) {
        orderItems.value = newVal.order.map((idx: number) => questionData.value.metadata?.items[idx]);
      }
    } else if (type === 'matching') {
      const pairs = questionData.value.metadata?.pairs || [];
      matchingPairs.value = pairs.map((p: any, idx: number) => ({
        left: p.left,
        right: p.right,
        selected: newVal?.matches?.[idx] ?? null
      }));
      rightOptions.value = pairs.map((p: any, idx: number) => ({
        label: p.right,
        value: idx
      }));
    }
  } else {
    // populate from answer
    const type = questionData.value.type;
    if (type === 'multiple_choice' && newVal.selected) {
      selectedMultiple.value = newVal.selected;
    } else if (type === 'single_choice' && newVal.selected !== undefined) {
      selectedSingle.value = newVal.selected;
    } else if (type === 'true_false' && newVal.selected !== undefined) {
      selectedBoolean.value = newVal.selected;
    } else if (type === 'fill_blank' && newVal.answer !== undefined) {
      fillText.value = newVal.answer;
    } else if (type === 'ordering' && newVal.order) {
      orderItems.value = newVal.order.map((idx: number) => questionData.value.metadata?.items[idx]);
    } else if (type === 'matching' && newVal.matches) {
      const pairs = questionData.value.metadata?.pairs || [];
      matchingPairs.value = pairs.map((p: any, idx: number) => ({
        left: p.left,
        right: p.right,
        selected: newVal.matches[idx] ?? null
      }));
    }
  }
}, { immediate: true });

// Emit answer when any field changes
function emitAnswer() {
  const type = questionData.value.type;
  let answerValue: any = {};

  if (type === 'multiple_choice') {
    answerValue = { selected: selectedMultiple.value };
  } else if (type === 'single_choice') {
    answerValue = { selected: selectedSingle.value };
  } else if (type === 'true_false') {
    answerValue = { selected: selectedBoolean.value };
  } else if (type === 'fill_blank') {
    answerValue = { answer: fillText.value };
  } else if (type === 'ordering') {
    const order = orderItems.value.map(item => item.order_id);
    answerValue = { order };
  } else if (type === 'matching') {
    const matches: Record<number, number> = {};
    matchingPairs.value.forEach((pair, idx) => {
      if (pair.selected !== undefined && pair.selected !== null) {
        matches[idx] = pair.selected;
      }
    });
    answerValue = { matches };
  } else {
    answerValue = {};
  }

  emit('answer-change', answerValue);
}

// Ordering helpers
function moveUp(idx: number) {
  if (idx > 0) {
    const current = orderItems.value[idx];
    const previous = orderItems.value[idx - 1];
    if (current && previous) {
      orderItems.value[idx] = previous;
      orderItems.value[idx - 1] = current;
      emitAnswer();
    }
  }
}

function moveDown(idx: number) {
  if (idx < orderItems.value.length - 1) {
    const current = orderItems.value[idx];
    const next = orderItems.value[idx + 1];
    if (current && next) {
      orderItems.value[idx] = next;
      orderItems.value[idx + 1] = current;
      emitAnswer();
    }
  }
}
</script>