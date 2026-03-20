<template>
  <div
    data-testid="registration-container"
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
  >
    <a-card data-testid="registration-card" class="w-full max-w-md">
      <div data-testid="registration-header" class="text-center mb-8">
        <h1
          data-testid="registration-title"
          class="text-2xl font-bold text-gray-900"
        >
          Create Account
        </h1>
        <p data-testid="registration-subtitle" class="text-gray-600 mt-2">
          Sign up to get started
        </p>
      </div>

      <a-form
        data-testid="registration-form"
        :model="form"
        @submit.prevent="handleRegister"
        layout="vertical"
      >
        <a-form-item data-testid="form-item-username" label="Username" required>
          <a-input
            data-testid="input-username"
            v-model:value="form.username"
            placeholder="Choose a username"
            size="large"
          >
            <template #prefix>
              <User data-testid="icon-user" :size="16" class="text-gray-400" />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item data-testid="form-item-email" label="Email" required>
          <a-input
            data-testid="input-email"
            v-model:value="form.email"
            placeholder="Enter your email"
            type="email"
            size="large"
          >
            <template #prefix>
              <Mail data-testid="icon-mail" :size="16" class="text-gray-400" />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item data-testid="form-item-password" label="Password" required>
          <a-input-password
            data-testid="input-password"
            v-model:value="form.password"
            placeholder="Create a password"
            size="large"
          >
            <template #prefix>
              <Lock
                data-testid="icon-lock-password"
                :size="16"
                class="text-gray-400"
              />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item
          data-testid="form-item-confirm-password"
          label="Confirm Password"
          required
        >
          <a-input-password
            data-testid="input-confirm-password"
            v-model:value="form.confirmPassword"
            placeholder="Confirm your password"
            size="large"
          >
            <template #prefix>
              <Lock
                data-testid="icon-lock-confirm"
                :size="16"
                class="text-gray-400"
              />
            </template>
          </a-input-password>
        </a-form-item>

        <a-button
          data-testid="button-submit"
          type="primary"
          html-type="submit"
          :loading="authStore.loading"
          block
          size="large"
          class="mb-4"
        >
          Sign Up
        </a-button>

        <div data-testid="login-redirect-container" class="text-center">
          <span data-testid="login-redirect-text" class="text-gray-600"
            >Already have an account?
          </span>
          <router-link
            data-testid="link-login"
            to="/login"
            class="text-blue-600 hover:text-blue-700"
          >
            Sign in
          </router-link>
        </div>
      </a-form>

      <a-alert
        v-if="authStore.error"
        data-testid="error-alert"
        :message="authStore.error"
        type="error"
        show-icon
        closable
        @close="authStore.clearError"
        class="mt-4"
      />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Card, Form, Input, Button, Alert, message } from "ant-design-vue";
import { User, Mail, Lock } from "lucide-vue-next";
import { useAuthStore } from "../stores/authStore";

const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const AInputPassword = Input.Password;
const AButton = Button;
const ACard = Card;
const AAlert = Alert;

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const handleRegister = async () => {
  if (form.value.password !== form.value.confirmPassword) {
    message.error("Passwords do not match");
    return;
  }

  const success = await authStore.register(
    form.value.username,
    form.value.email,
    form.value.password,
  );

  if (success) {
    message.success("Registration successful! Please login.");
    router.push("/login");
  }
};
</script>
