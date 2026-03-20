<template>
  <a-modal
    :visible="visible"
    title="Report"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :confirm-loading="submitting"
    ok-text="Submit Report"
    cancel-text="Cancel"
    :okButtonProps="{ 'data-testid': 'report-submit' }"
    :cancelButtonProps="{ 'data-testid': 'report-cancel' }"
  >
    <p class="mb-2">
      Reporting <strong>{{ targetType }}</strong> ID: {{ targetId }}
    </p>
    <a-textarea
      v-model:value="reason"
      placeholder="Please describe the issue..."
      :rows="4"
      :maxlength="500"
      show-count
      data-testid="report-reason"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import apiClient from '@/lib/api/client';

const props = defineProps<{
  visible: boolean;
  targetType: string;
  targetId: number;
  attemptId?: number;                 // <-- new optional prop
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'reported'): void;
}>();

const reason = ref('');
const submitting = ref(false);

const handleSubmit = async () => {
  if (!reason.value.trim()) {
    message.warning('Please provide a reason');
    return;
  }

  submitting.value = true;
  try {
    await apiClient.post('/reports', {
      targetType: props.targetType,
      targetId: props.targetId,
      reason: reason.value.trim(),
      attemptId: props.attemptId,      // <-- include if provided
    });
    message.success('Report submitted');
    emit('reported');
    handleCancel();
  } catch (err: any) {
    message.error(err.response?.data?.error || 'Failed to submit report');
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  reason.value = '';
  emit('update:visible', false);
};
</script>