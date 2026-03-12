<!-- D:/SLP.Project/slp/frontend-vue/src/features/question/components/FillBlank.vue -->
<template>
  <div class="space-y-4">
    <!-- Single Keyword input -->
    <a-form-item label="Keyword/Answer">
      <a-input
        v-model:value="keyword"
        placeholder="Enter the correct keyword"
      />
    </a-form-item>

    <!-- Preview field (read-only) -->
    <a-form-item label="Preview">
      <div class="preview-container">
        <div v-if="!questionTitle" class="text-gray-400 italic p-3 bg-gray-50 rounded border">
          Enter question title first
        </div>
        <div v-else-if="!keyword" class="text-gray-400 italic p-3 bg-gray-50 rounded border">
          Enter a keyword to see preview
        </div>
        <div v-else class="preview-content p-3 bg-gray-50 rounded border">
          <span v-for="(part, index) in previewParts" :key="index" class="preview-part">
            <template v-if="part.isBlank">
              <span class="blank-placeholder px-3 py-0.5 bg-yellow-100 border border-yellow-300 rounded mx-0.5 font-mono">
                _____
              </span>
            </template>
            <template v-else>
              {{ part.text }}
            </template>
          </span>
        </div>
      </div>
    </a-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';

const props = defineProps<{
  answer: string;         // stores keyword as JSON string
  questionTitle: string;  // the question text from parent
}>();

const emit = defineEmits<{
  (e: 'update:answer', value: string): void;
}>();

// Local state for the single keyword
const keyword = ref('');
const isInternalUpdate = ref(false); // flag to prevent emit loop when prop updates

// Parse initial value from props.answer
watch(() => props.answer, (newAnswer) => {
  isInternalUpdate.value = true;
  try {
    const parsed = JSON.parse(newAnswer);
    if (Array.isArray(parsed)) {
      keyword.value = parsed.length > 0 ? parsed[0] : '';
    } else {
      keyword.value = newAnswer;
    }
  } catch {
    keyword.value = newAnswer;
  }
  // Reset flag after this update cycle so that subsequent user changes can emit
  nextTick(() => {
    isInternalUpdate.value = false;
  });
}, { immediate: true });

// Watch keyword changes and emit to parent (skip internal updates)
watch(keyword, (newVal) => {
  if (!isInternalUpdate.value) {
    const trimmedKeyword = newVal.trim();
    emit('update:answer', JSON.stringify([trimmedKeyword]));
  }
});

// Compute preview parts by replacing all occurrences of keyword with blanks
const previewParts = computed(() => {
  if (!props.questionTitle || !keyword.value) return [];

  const title = props.questionTitle;
  const searchTerm = keyword.value;
  const parts: { text: string; isBlank: boolean }[] = [];
  
  let lastIndex = 0;
  let index = title.indexOf(searchTerm, lastIndex);
  
  if (index === -1) {
    // If keyword not found, show whole title
    return [{ text: title, isBlank: false }];
  }
  
  while (index !== -1) {
    // Add text before the keyword
    if (index > lastIndex) {
      parts.push({
        text: title.substring(lastIndex, index),
        isBlank: false
      });
    }
    // Add blank for keyword
    parts.push({
      text: '_____',
      isBlank: true
    });
    lastIndex = index + searchTerm.length;
    index = title.indexOf(searchTerm, lastIndex);
  }
  
  // Add remaining text after last keyword
  if (lastIndex < title.length) {
    parts.push({
      text: title.substring(lastIndex),
      isBlank: false
    });
  }
  
  return parts;
});
</script>

<style scoped>
.preview-content {
  font-size: 1rem;
  line-height: 2;
  word-break: break-word;
  white-space: pre-wrap;
  min-height: 60px;
}

.blank-placeholder {
  display: inline-block;
  min-width: 80px;
  text-align: center;
  background: repeating-linear-gradient(45deg, #fef9c3, #fef9c3 10px, #fef08a 10px, #fef08a 20px);
  font-weight: 500;
}

.preview-part {
  display: inline;
}
</style>