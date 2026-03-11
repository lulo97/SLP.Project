<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#3b82f6',
      borderRadius: 8,
    },
  }">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue';
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const AConfigProvider = ConfigProvider;
const authStore = useAuthStore();

onMounted(() => {
  if (authStore.sessionToken) {
    authStore.fetchCurrentUser();
  }
});
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .ant-card-body {
    padding: 16px;
  }
}
</style>