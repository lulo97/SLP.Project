<template>
  <a-radio-group :value="modelValue" @change="handleChange">
    <a-radio :value="true">True</a-radio>
    <a-radio :value="false">False</a-radio>
  </a-radio-group>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: boolean | null;
}>();

const emit = defineEmits(['update:model-value']);

function handleChange(e: any) {
  emit('update:model-value', e.target.value);
}
</script>