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
import { useAuthStore } from './features/auth/stores/authStore';

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

/* 1. Force all buttons to use flex alignment */
.ant-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 2. Fix the icon alignment specifically */
.ant-btn .anticon {
  line-height: 0;
  vertical-align: middle;
}

/* 3. Ensure the text span is vertically centered */
.ant-btn > span {
  display: inline-block;
  line-height: 1; /* Prevents text from having extra top/bottom "leading" */
}

/* 4. Fix for small buttons specifically */
.ant-btn-sm {
  column-gap: 4px; /* Standardizes space between icon and text */
}
</style>