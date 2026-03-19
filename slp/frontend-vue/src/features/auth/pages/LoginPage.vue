<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
  >
    <a-card class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p class="text-gray-600 mt-2">Sign in to your account</p>
      </div>

      <a-form :model="form" @submit.prevent="handleLogin" layout="vertical">
        <!-- Username field with validation -->
        <a-form-item
          label="Username"
          :validate-status="usernameError ? 'error' : undefined"
          :help="usernameError"
          required
        >
          <a-input
            v-model:value="form.username"
            placeholder="Enter your username"
            size="large"
            @input="clearFieldError('username')"
          >
            <template #prefix>
              <User :size="16" class="text-gray-400" />
            </template>
          </a-input>
        </a-form-item>

        <!-- Password field with validation -->
        <a-form-item
          label="Password"
          :validate-status="passwordError ? 'error' : undefined"
          :help="passwordError"
          required
        >
          <a-input-password
            v-model:value="form.password"
            placeholder="Enter your password"
            size="large"
            @input="clearFieldError('password')"
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

        <a-alert
          v-if="showVerificationAlert"
          type="warning"
          show-icon
          closable
          @close="showVerificationAlert = false"
          class="mb-4"
        >
          <template #message>
            <span>Your email is not verified. </span>
            <a-button
              type="link"
              @click="resendVerification"
              :loading="resending"
              class="p-0"
            >
              Resend verification email
            </a-button>
          </template>
        </a-alert>
      </a-form>

      <!-- General error alert (for non‑field errors) -->
      <a-alert
        v-if="authStore.error && !usernameError && !passwordError"
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
      <p class="mb-4">
        Enter your email address to receive a password reset link.
      </p>
      <a-input
        v-model:value="resetEmail"
        placeholder="Email address"
        type="email"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  Card,
  Form,
  Input,
  Button,
  Alert,
  Modal,
  message,
} from "ant-design-vue";
import { User, Lock } from "lucide-vue-next";
import { useAuthStore } from "../stores/authStore";

// Alias Ant Design components
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

// Form data
const form = ref({
  username: "",
  password: "",
});

// Field-specific error messages
const usernameError = ref("");
const passwordError = ref("");
const showVerificationAlert = ref(false);
const resending = ref(false);

// Forgot password modal state
const showForgotPassword = ref(false);
const resetEmail = ref("");
const resetLoading = ref(false);

// Clear a field error when user starts typing again
const clearFieldError = (field: "username" | "password") => {
  if (field === "username") usernameError.value = "";
  else passwordError.value = "";
};

// Handle login submission
const handleLogin = async () => {
  // Clear previous errors
  usernameError.value = "";
  passwordError.value = "";
  authStore.clearError();

  // Basic frontend validation
  if (!form.value.username.trim()) {
    usernameError.value = "Username is required";
    return;
  }
  if (!form.value.password) {
    passwordError.value = "Password is required";
    return;
  }

  const result = await authStore.login(
    form.value.username,
    form.value.password,
  );

  if (result.success) {
    message.success("Login successful!");
    router.push("/dashboard");
  } else {
    // Handle specific error codes
    switch (result.code) {
      case "EMAIL_NOT_VERIFIED":
        // Show a custom alert with a resend verification link
        showVerificationAlert.value = true;
        break;
      case "ACCOUNT_BANNED":
        message.error(result.message, 5);
        break;
      case "USER_NOT_FOUND":
      case "INVALID_PASSWORD":
        passwordError.value = "Invalid username or password";
        break;
      default:
        // Generic error
        message.error(result.message || "Login failed", 3);
    }
  }
};

// Forgot password submission
const handleForgotPassword = async () => {
  if (!resetEmail.value) {
    message.warning("Please enter your email");
    return;
  }

  resetLoading.value = true;
  const success = await authStore.requestPasswordReset(resetEmail.value);
  resetLoading.value = false;

  if (success) {
    message.success("Password reset email sent if account exists");
    showForgotPassword.value = false;
    resetEmail.value = "";
  } else {
    message.error("Failed to send reset email");
  }
};

const resendVerification = async () => {
  resending.value = true;
  const success = await authStore.sendVerificationEmail();
  resending.value = false;
  if (success) {
    message.success("Verification email sent!");
    showVerificationAlert.value = false;
  } else {
    message.error("Failed to send verification email");
  }
};
</script>
