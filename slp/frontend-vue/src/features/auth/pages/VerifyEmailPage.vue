<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <a-card class="w-full max-w-md text-center">
      <div v-if="loading" class="py-8">
        <a-spin size="large" />
        <p class="mt-4 text-gray-600">Verifying your email...</p>
      </div>

      <div v-else-if="verified" class="py-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle :size="32" class="text-green-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
        <p class="text-gray-600 mb-6">Your email has been successfully verified.</p>
        <a-button type="primary" @click="router.push('/dashboard')" size="large">
          Go to Dashboard
        </a-button>
      </div>

      <div v-else class="py-8">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle :size="32" class="text-red-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <a-button type="primary" @click="router.push('/login')" size="large">
          Back to Login
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Card, Spin, Button, message } from 'ant-design-vue';
import { CheckCircle, XCircle } from 'lucide-vue-next';
import { useAuthStore } from '../stores/authStore';

const ACard = Card;
const ASpin = Spin;
const AButton = Button;

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = route.query.token as string;
const loading = ref(true);
const verified = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  if (!token) {
    error.value = 'Invalid verification token.';
    loading.value = false;
    return;
  }

  const success = await authStore.verifyEmail(token);
  loading.value = false;
  if (success) {
    verified.value = true;
    message.success('Email verified successfully!');
  } else {
    error.value = 'Invalid or expired verification token.';
  }
});
</script>