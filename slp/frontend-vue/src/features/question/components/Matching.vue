<template>
  <a-form-item label="Matching Pairs">
    <div v-for="(pair, index) in pairs" :key="index" class="matching-row">
      <span class="pair-index">{{ index + 1 }}.</span>
      <a-input
        v-model:value="pair.left"
        placeholder="Left"
        size="small"
        class="input-left"
        :data-testid="`matching-left-${index}`"
      />
      <a-input
        v-model:value="pair.right"
        placeholder="Right"
        size="small"
        class="input-right"
        :data-testid="`matching-right-${index}`"
      />
      <a-button
        @click="removePair(index)"
        type="text"
        danger
        size="small"
        class="remove-btn"
        :aria-label="`Remove pair ${index + 1}`"
        :data-testid="`matching-remove-${index}`"
      >
        <CloseOutlined />
      </a-button>
    </div>
    <a-button @click="addPair" type="dashed" block size="small" data-testid="matching-add">Add Pair</a-button>
  </a-form-item>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { CloseOutlined } from '@ant-design/icons-vue';

export interface MatchingPair {
  left: string;
  right: string;
}

const props = defineProps<{
  modelValue: MatchingPair[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: MatchingPair[]): void;
}>();

const pairs = ref(props.modelValue.length ? props.modelValue.map(p => ({ ...p })) : [{ left: '', right: '' }]);

watch(pairs, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });

const addPair = () => {
  pairs.value.push({ left: '', right: '' });
};

const removePair = (index: number) => {
  pairs.value.splice(index, 1);
};
</script>

<style scoped>
.matching-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap; /* allows wrapping on very small screens */
}

.pair-index {
  font-size: 14px;
  color: #8c8c8c;
  font-weight: 500;
  min-width: 28px; /* space for "10." */
  text-align: right;
}

.input-left,
.input-right {
  flex: 1 1 0;
  min-width: 100px; /* prevents inputs from becoming too narrow */
}

.remove-btn {
  padding: 0 4px;
  height: auto;
  line-height: 1;
  flex-shrink: 0;
}

/* On very narrow screens, stack inputs */
@media (max-width: 480px) {
  .matching-row {
    gap: 4px;
  }
  .input-left,
  .input-right {
    min-width: 80px;
  }
}
</style>