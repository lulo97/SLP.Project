<template>
  <a-form :model="form" @submit.prevent="handleSubmit" layout="vertical">
    <!-- Common fields -->
    <a-form-item label="Question Title" required>
      <a-input
        v-model:value="form.title"
        placeholder="Enter the question"
        data-testid="question-title"
      />
    </a-form-item>

    <a-form-item label="Description / Details">
      <a-textarea
        v-model:value="form.description"
        placeholder="Additional context"
        :rows="2"
        data-testid="question-description"
      />
    </a-form-item>

    <a-form-item label="Question Type" required>
      <a-select v-model:value="form.type" placeholder="Select type" data-testid="question-type">
        <a-select-option value="multiple_choice">Multiple Choice</a-select-option>
        <a-select-option value="true_false">True/False</a-select-option>
        <a-select-option value="fill_blank">Fill Blank</a-select-option>
        <a-select-option value="ordering">Ordering</a-select-option>
        <a-select-option value="matching">Matching</a-select-option>
      </a-select>
    </a-form-item>

    <!-- Type-specific fields -->
    <template v-if="form.type === 'multiple_choice'">
      <MultipleChoice
        v-model:model-value="form.options"
        v-model:correct-answers="form.correctAnswers"
      />
    </template>

    <template v-else-if="form.type === 'true_false'">
      <TrueFalse v-model:answer="form.answer" />
    </template>

    <template v-else-if="form.type === 'fill_blank'">
      <FillBlank
        v-model:answer="form.answer"
        :question-title="form.title"
      />
    </template>

    <template v-else-if="form.type === 'ordering'">
      <Ordering v-model:model-value="form.orderingItems" />
    </template>

    <template v-else-if="form.type === 'matching'">
      <Matching v-model:model-value="form.matchingPairs" />
    </template>

    <!-- Explanation -->
    <a-form-item label="Explanation">
      <a-textarea
        v-model:value="form.explanation"
        placeholder="Why this answer is correct"
        :rows="2"
        data-testid="question-explanation"
      />
    </a-form-item>

    <!-- Tags — replaced with TagSelector -->
    <a-form-item label="Tags">
      <TagSelector v-model="form.tags" data-testid="question-tags" />
    </a-form-item>

    <a-form-item>
      <div class="flex gap-2">
        <a-button @click="handleCancel" block>Cancel</a-button>
        <a-button type="primary" html-type="submit" :loading="loading" block data-testid="submit-question">
          {{ isEdit ? 'Update Question' : 'Create Question' }}
        </a-button>
      </div>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import MultipleChoice from './MultipleChoice.vue';
import TrueFalse from './TrueFalse.vue';
import FillBlank from './FillBlank.vue';
import Ordering from './Ordering.vue';
import Matching from './Matching.vue';
import TagSelector from '@/components/TagSelector.vue';
import type { QuestionDto, CreateQuestionPayload } from '../stores/questionStore';

const props = defineProps<{
  initialQuestion?: Partial<QuestionDto> | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', payload: CreateQuestionPayload): void;
  (e: 'cancel'): void;
}>();

const isEdit = ref(!!props.initialQuestion?.id);

interface QuestionForm {
  title: string;
  description: string;
  type: CreateQuestionPayload['type'];
  options: string[];
  correctAnswers: string[];
  answer: string;
  explanation: string;
  orderingItems: string[];
  matchingPairs: { left: string; right: string }[];
  tags: string[];
}

const getDefaultForm = (): QuestionForm => ({
  title:         '',
  description:   '',
  type:          'multiple_choice',
  options:       ['', '', '', ''],
  correctAnswers: [],
  answer:        '',
  explanation:   '',
  orderingItems: ['', '', '', ''],
  matchingPairs: [
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
  ],
  tags: [],
});

const form = ref<QuestionForm>(getDefaultForm());

const resetForm = () => { form.value = getDefaultForm(); };

const initializeForm = () => {
  if (!props.initialQuestion) return;

  const q = props.initialQuestion;
  form.value.title       = q.content || '';
  form.value.type        = q.type as any || 'multiple_choice';
  form.value.explanation = q.explanation || '';
  form.value.tags        = q.tags || [];

  let metadata: any = {};
  if (q.metadataJson) {
    try { metadata = JSON.parse(q.metadataJson); } catch { metadata = {}; }
  }

  form.value.description = metadata.description || '';

  switch (q.type) {
    case 'multiple_choice': {
      const options = (metadata.options || []).map((opt: any) => opt.text);
      form.value.options = options.length ? options : ['', '', '', ''];
      const correctIds   = metadata.correctAnswers || [];
      form.value.correctAnswers = (metadata.options || [])
        .filter((opt: any) => correctIds.includes(opt.id))
        .map((opt: any) => opt.text);
      break;
    }
    case 'true_false':
      form.value.answer = metadata.correctAnswer === true ? 'true' : 'false';
      break;
    case 'fill_blank':
      form.value.answer = JSON.stringify(metadata.keywords || []);
      break;
    case 'ordering': {
      const items = (metadata.items || []).map((item: any) => item.text);
      form.value.orderingItems = items.length ? items : ['', '', '', ''];
      break;
    }
    case 'matching': {
      const pairs = (metadata.pairs || []).map((p: any) => ({ left: p.left, right: p.right }));
      form.value.matchingPairs = pairs.length ? pairs : [
        { left: '', right: '' }, { left: '', right: '' },
        { left: '', right: '' }, { left: '', right: '' },
      ];
      break;
    }
  }
};

watch(() => props.initialQuestion, (newVal) => {
  if (newVal) { isEdit.value = true; initializeForm(); }
  else        { isEdit.value = false; resetForm(); }
}, { immediate: true });

watch(
  () => form.value.type,
  (newType) => {
    if (newType === 'multiple_choice')  { form.value.options = ['', '', '', '']; form.value.correctAnswers = []; form.value.answer = ''; }
    else if (newType === 'true_false')  { form.value.answer = 'true'; }
    else if (newType === 'fill_blank')  { form.value.answer = '[]'; }
    else if (newType === 'ordering')    { form.value.orderingItems = ['', '', '', '']; }
    else if (newType === 'matching')    { form.value.matchingPairs = [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }]; }
  },
);

function buildMetadata(): Record<string, any> {
  const metadata: Record<string, any> = {};
  if (form.value.description.trim()) metadata.description = form.value.description.trim();

  switch (form.value.type) {
    case 'multiple_choice': {
      const options = form.value.options.filter(opt => opt.trim() !== '');
      metadata.options = options.map((text, idx) => ({ id: idx.toString(), text: text.trim() }));
      const correctTexts = form.value.correctAnswers.filter(ans => ans.trim() !== '');
      metadata.correctAnswers = metadata.options
        .filter((opt: { text: string }) => correctTexts.includes(opt.text))
        .map((opt: { id: any })  => opt.id);
      break;
    }
    case 'true_false':
      metadata.correctAnswer = form.value.answer === 'true';
      break;
    case 'fill_blank': {
      let keywords: string[] = [];
      try { keywords = JSON.parse(form.value.answer); } catch { keywords = []; }
      metadata.keywords = keywords.filter((k: string) => k.trim() !== '');
      break;
    }
    case 'ordering': {
      metadata.items = form.value.orderingItems
        .filter(item => item.trim() !== '')
        .map((text, idx) => ({ order_id: idx + 1, text: text.trim() }));
      break;
    }
    case 'matching': {
      metadata.pairs = form.value.matchingPairs
        .filter(p => p.left.trim() !== '' || p.right.trim() !== '')
        .map((p, idx) => ({ id: idx + 1, left: p.left.trim(), right: p.right.trim() }));
      break;
    }
  }
  return metadata;
}

const handleSubmit = () => {
  if (!form.value.title.trim()) { message.warning('Title is required'); return; }

  if (form.value.type === 'multiple_choice') {
    const nonEmpty = form.value.options.filter(opt => opt.trim() !== '');
    if (nonEmpty.length < 2)                { message.warning('At least two options are required'); return; }
    if (form.value.correctAnswers.length === 0) { message.warning('Please select at least one correct answer'); return; }
  }

  if (form.value.type === 'fill_blank') {
    try {
      const keywords = JSON.parse(form.value.answer);
      if (!Array.isArray(keywords) || keywords.length === 0) { message.warning('Please enter at least one keyword'); return; }
      if (keywords.some((k: string) => k.includes(' ')))     { message.warning('Keywords must be single words (no spaces allowed)'); return; }
    } catch { message.warning('Invalid keyword format'); return; }
  }

  const metadata = buildMetadata();
  const payload: CreateQuestionPayload = {
    type:        form.value.type,
    content:     form.value.title.trim(),
    explanation: form.value.explanation.trim() || undefined,
    metadataJson: Object.keys(metadata).length ? JSON.stringify(metadata) : undefined,
    tagNames:    form.value.tags.length ? form.value.tags : undefined,
  };

  emit('save', payload);
};

const handleCancel = () => emit('cancel');
</script>