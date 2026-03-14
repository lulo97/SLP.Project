<template>
  <span class="text-xs text-gray-500">
    <SyncOutlined v-if="saving" spin /> {{ saving ? 'Saving...' : 'Saved' }}
  </span>
</template>

<script setup lang="ts">
import { SyncOutlined } from '@ant-design/icons-vue';
defineProps<{ saving: boolean }>();
</script>