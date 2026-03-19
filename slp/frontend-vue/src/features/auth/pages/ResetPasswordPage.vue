<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <a-card class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Reset Password</h1>
        <p class="text-gray-600 mt-2">Enter your new password below</p>
      </div>

      <a-form @submit.prevent="handleReset" layout="vertical">
        <a-form-item label="New Password" required>
          <a-input-password
            v-model:value="form.password"
            placeholder="Enter new password"
            size="large"
          />
        </a-form-item>

        <a-form-item label="Confirm Password" required>
          <a-input-password
            v-model:value="form.confirm"
            placeholder="Confirm new password"
            size="large"
          />
        </a-form-item>

        <a-button
          type="primary"
          html-type="submit"
          :loading="loading"
          block
          size="large"
          class="mb-4"
        >
          Reset Password
        </a-button>

        <div class="text-center">
          <router-link to="/login" class="text-blue-600 hover:text-blue-700">
            Back to Login
          </router-link>
        </div>
      </a-form>

      <a-alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
        closable
        @close="error = null"
        class="mt-4"
      />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Card, Form, Input, Button, Alert, message } from 'ant-design-vue';
import { useAuthStore } from '../stores/authStore';

const AForm = Form;
const AFormItem = Form.Item;
const AInputPassword = Input.Password;
const AButton = Button;
const ACard = Card;
const AAlert = Alert;

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = route.query.token as string;
const form = ref({ password: '', confirm: '' });
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  if (!token) {
    error.value = 'Invalid or missing reset token.';
  }
});

const handleReset = async () => {
  if (form.value.password !== form.value.confirm) {
    error.value = 'Passwords do not match';
    return;
  }
  if (form.value.password.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }

  loading.value = true;
  error.value = null;

  const success = await authStore.confirmPasswordReset(token, form.value.password);
  loading.value = false;

  if (success) {
    message.success('Password reset successful! Please login.');
    router.push('/login');
  } else {
    error.value = 'Invalid or expired reset token.';
  }
};
</script>