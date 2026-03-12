<!-- D:/SLP.Project/slp/frontend-vue/src/features/question/components/MultipleChoice.vue -->
<template>
  <a-form-item label="Options">
    <div v-for="(opt, index) in localOptions" :key="index" class="flex items-center mb-2">
      <a-checkbox
        :checked="isCorrect(opt)"
        @change="toggleCorrect(opt, $event.target.checked)"
        class="mr-2"
        :disabled="!opt.trim()"
        :data-testid="`mc-option-${index}-checkbox`"
      />
      <a-input
        v-model:value="localOptions[index]"
        placeholder="Option"
        style="margin-right: 8px; flex: 1;"
        :data-testid="`mc-option-${index}-input`"
      />
      <a-button @click="removeOption(index)" type="text" danger size="small" :data-testid="`mc-option-${index}-remove`">Remove</a-button>
    </div>
    <a-button @click="addOption" type="dashed" block data-testid="mc-add-option">Add Option</a-button>
  </a-form-item>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  modelValue: string[];        // options
  correctAnswers: string[];     // selected correct options
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
  (e: 'update:correctAnswers', value: string[]): void;
}>();

// Local copy to allow direct editing
const localOptions = ref<string[]>([]);
const isInternalUpdate = ref(false); // flag to prevent emit loop when prop updates

// Initialize localOptions from props
const initFromProps = () => {
  isInternalUpdate.value = true;
  localOptions.value = props.modelValue.length ? [...props.modelValue] : ['', '', '', ''];
  nextTick(() => {
    isInternalUpdate.value = false;
  });
};

// Watch for external changes to modelValue
watch(() => props.modelValue, () => {
  initFromProps();
}, { deep: true, immediate: true });

// Watch localOptions and emit changes (skip internal updates)
watch(localOptions, (newVal) => {
  if (!isInternalUpdate.value) {
    emit('update:modelValue', newVal);
  }
}, { deep: true });

// Check if an option is currently marked correct
const isCorrect = (opt: string) => props.correctAnswers.includes(opt);

// Toggle correct status
const toggleCorrect = (opt: string, checked: boolean) => {
  let newCorrect = [...props.correctAnswers];
  if (checked) {
    if (!newCorrect.includes(opt)) newCorrect.push(opt);
  } else {
    newCorrect = newCorrect.filter(item => item !== opt);
  }
  emit('update:correctAnswers', newCorrect);
};

// Add a new empty option
const addOption = () => {
  localOptions.value.push('');
  // No need to emit manually; watcher will handle it
};

// Remove option at index, and remove it from correct answers if present
const removeOption = (index: number) => {
  const removed = localOptions.value[index];
  localOptions.value.splice(index, 1);
  // No need to emit manually; watcher will handle it

  // Remove from correct answers if that option was checked
  if (removed && props.correctAnswers.includes(removed)) {
    emit('update:correctAnswers', props.correctAnswers.filter(ans => ans !== removed));
  }
};
</script>