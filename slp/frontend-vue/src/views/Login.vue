<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <a-card class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p class="text-gray-600 mt-2">Sign in to your account</p>
      </div>

      <a-form
        :model="form"
        @submit.prevent="handleLogin"
        layout="vertical"
      >
        <a-form-item label="Username" required>
          <a-input
            v-model:value="form.username"
            placeholder="Enter your username"
            size="large"
          >
            <template #prefix>
              <User :size="16" class="text-gray-400" />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item label="Password" required>
          <a-input-password
            v-model:value="form.password"
            placeholder="Enter your password"
            size="large"
          >
            <template #prefix>
              <Lock :size="16" class="text-gray-400" />
            </template>
          </a-input-password>
        </a-form-item>

        <div class="text-right mb-4">
          <a-button type="link" @click="showForgotPassword = true" class="p-0">
            Forgot password?
          </a-button>
        </div>

        <a-button
          type="primary"
          html-type="submit"
          :loading="authStore.loading"
          block
          size="large"
          class="mb-4"
        >
          Sign In
        </a-button>

        <div class="text-center">
          <span class="text-gray-600">Don't have an account? </span>
          <router-link to="/register" class="text-blue-600 hover:text-blue-700">
            Sign up
          </router-link>
        </div>
      </a-form>

      <a-alert
        v-if="authStore.error"
        :message="authStore.error"
        type="error"
        show-icon
        closable
        @close="authStore.clearError"
        class="mt-4"
      />
    </a-card>

    <!-- Forgot Password Modal -->
    <a-modal
      v-model:open="showForgotPassword"
      title="Reset Password"
      @ok="handleForgotPassword"
      :confirm-loading="resetLoading"
    >
      <p class="mb-4">Enter your email address to receive a password reset link.</p>
      <a-input
        v-model:value="resetEmail"
        placeholder="Email address"
        type="email"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Card, Form, Input, Button, Alert, Modal, message } from 'ant-design-vue';
import { User, Lock } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const AInputPassword = Input.Password;
const AButton = Button;
const ACard = Card;
const AAlert = Alert;
const AModal = Modal;

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  username: '',
  password: '',
});

const showForgotPassword = ref(false);
const resetEmail = ref('');
const resetLoading = ref(false);

const handleLogin = async () => {
  const success = await authStore.login(form.value.username, form.value.password);
  if (success) {
    message.success('Login successful!');
    router.push('/dashboard');
  }
};

const handleForgotPassword = async () => {
  if (!resetEmail.value) {
    message.warning('Please enter your email');
    return;
  }

  resetLoading.value = true;
  const success = await authStore.requestPasswordReset(resetEmail.value);
  resetLoading.value = false;
  
  if (success) {
    message.success('Password reset email sent if account exists');
    showForgotPassword.value = false;
    resetEmail.value = '';
  } else {
    message.error('Failed to send reset email');
  }
};
</script>