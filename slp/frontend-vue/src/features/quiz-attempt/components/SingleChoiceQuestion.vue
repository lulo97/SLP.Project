<template>
  <a-radio-group
    :value="modelValue"
    @change="handleChange"
    data-testid="single-choice-group"
  >
    <a-radio
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :data-testid="`single-choice-option-${opt.id}`"
    >
      {{ opt.text }}
    </a-radio>
  </a-radio-group>
</template>

<script setup lang="ts">
defineProps<{
  options: Array<{ id: string; text: string }>; // ids are always strings per canonical schema
  modelValue?: string | null;                    // single string id, never a number
}>();

const emit = defineEmits(['update:model-value']);

// a-radio-group @change emits a RadioChangeEvent — must read e.target.value,
// same as TrueFalseQuestion. Previously this passed the raw event object,
// which would have stored the entire event as `selected` instead of the string id.
function handleChange(e: any) {
  emit('update:model-value', e.target.value);
}
</script>