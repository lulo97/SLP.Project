<template>
  <span class="text-xs text-gray-500" data-testid="auto-save-indicator">
    <SyncOutlined v-if="saving" spin data-testid="saving-icon" />
    <span data-testid="auto-save-label">{{ saving ? 'Saving...' : 'Saved' }}</span>
  </span>
</template>

<script setup lang="ts">
import { SyncOutlined } from '@ant-design/icons-vue';
defineProps<{ saving: boolean }>();
</script>