<template>
  <MobileLayout title="Profile">
    <div class="space-y-4">
      <!-- Profile Header -->
      <a-card class="shadow-sm text-center">
        <!-- Avatar with upload overlay -->
        <div class="relative inline-block">
          <!-- Show uploaded avatar or initials fallback -->
          <img
            v-if="authStore.user?.avatarUrl"
            :src="authStore.user.avatarUrl"
            alt="Avatar"
            class="w-24 h-24 rounded-full object-cover mx-auto border-2 border-gray-200"
          />
          <div
            v-else
            class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mx-auto flex items-center justify-center text-white text-3xl font-bold"
          >
            {{ authStore.user?.username.charAt(0).toUpperCase() }}
          </div>

          <!-- Hidden file input -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png"
            class="hidden"
            @change="handleFileSelected"
          />

          <!-- Camera button -->
          <button
            @click="fileInputRef?.click()"
            :disabled="avatarUploading"
            class="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 disabled:opacity-50"
            title="Change avatar"
          >
            <a-spin v-if="avatarUploading" :size="'small'" />
            <Camera v-else :size="16" />
          </button>
        </div>

        <h2 class="text-xl font-semibold mt-4">
          {{ authStore.user?.username }}
        </h2>
        <p class="text-gray-500">{{ authStore.user?.email }}</p>

        <!-- Remove avatar link (only shown when an avatar exists) -->
        <div v-if="authStore.user?.avatarUrl" class="mt-2">
          <a-button
            type="link"
            danger
            size="small"
            :loading="avatarDeleting"
            @click="handleDeleteAvatar"
          >
            Remove photo
          </a-button>
        </div>
      </a-card>

      <!-- Account Settings -->
      <a-card
        title="Account Settings"
        class="shadow-sm"
        :bodyStyle="{ padding: '16px' }"
      >
        <div class="space-y-3">
          <!-- Email Verification -->
          <div class="flex items-center justify-between py-1">
            <div class="flex items-start min-w-0 flex-1 mr-2">
              <Mail
                :size="18"
                class="mr-2 mt-0.5 flex-shrink-0 text-gray-400"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-700 truncate">
                  Email Verification
                </p>
                <p class="text-xs text-gray-500 truncate">
                  {{ authStore.user?.email }}
                </p>
              </div>
            </div>

            <div class="flex items-center flex-shrink-0">
              <a-tag
                :color="authStore.isEmailVerified ? 'success' : 'warning'"
                class="m-0 border-none px-2 text-[11px] leading-5 rounded-full"
              >
                {{ authStore.isEmailVerified ? "Verified" : "Pending" }}
              </a-tag>

              <a-button
                v-if="!authStore.isEmailVerified"
                type="link"
                size="small"
                :loading="sendingVerification"
                @click="sendVerification"
                class="ml-1 px-1 h-auto text-xs font-semibold"
              >
                Verify Now
              </a-button>
            </div>
          </div>

          <!-- Password -->
          <div class="flex items-start justify-between">
            <div class="flex items-start min-w-0 flex-1">
              <Key :size="18" class="mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">Password</p>
                <p class="text-xs text-gray-500 truncate">
                  Keep your account secure
                </p>
              </div>
            </div>
            <a-button
              type="link"
              @click="openChangePassword"
              class="ml-2 flex-shrink-0 text-xs px-2 h-auto"
            >
              Change
            </a-button>
          </div>

          <!-- Account Status -->
          <div class="flex items-start justify-between">
            <div class="flex items-start min-w-0 flex-1">
              <Shield
                :size="18"
                class="mr-2 mt-0.5 flex-shrink-0 text-gray-500"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">Account Status</p>
                <p class="text-xs text-gray-500 capitalize truncate">
                  {{ authStore.user?.status }}
                </p>
              </div>
            </div>
            <a-tag
              :color="
                authStore.user?.status === 'active' ? 'success' : 'default'
              "
              class="ml-2 flex-shrink-0 text-xs"
            >
              {{ authStore.user?.status }}
            </a-tag>
          </div>
        </div>
      </a-card>
    </div>

    <!-- ── Change Password Modal ─────────────────────────────────────────── -->
    <a-modal
      v-model:open="showChangePassword"
      title="Change Password"
      :confirm-loading="passwordLoading"
      :ok-text="'Update Password'"
      @ok="handleChangePassword"
      @cancel="resetPasswordForm"
    >
      <a-form layout="vertical" class="pt-2">
        <!-- Current password -->
        <a-form-item
          label="Current Password"
          :validate-status="pwErrors.current ? 'error' : undefined"
          :help="pwErrors.current"
          required
        >
          <a-input-password
            v-model:value="passwordForm.current"
            placeholder="Enter your current password"
            @input="pwErrors.current = ''"
          />
        </a-form-item>

        <!-- New password -->
        <a-form-item
          label="New Password"
          :validate-status="pwErrors.new ? 'error' : undefined"
          :help="pwErrors.new"
          required
        >
          <a-input-password
            v-model:value="passwordForm.new"
            placeholder="At least 8 characters"
            @input="pwErrors.new = ''"
          />
        </a-form-item>

        <!-- Confirm new password -->
        <a-form-item
          label="Confirm New Password"
          :validate-status="pwErrors.confirm ? 'error' : undefined"
          :help="pwErrors.confirm"
          required
        >
          <a-input-password
            v-model:value="passwordForm.confirm"
            placeholder="Repeat new password"
            @input="pwErrors.confirm = ''"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <!-- ─────────────────────────────────────────────────────────────────── -->
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  Card,
  Form,
  Input,
  Button,
  Tag,
  Modal,
  message,
  Spin,
} from "ant-design-vue";
import { Camera, Mail, Key, Shield } from "lucide-vue-next";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useAuthStore } from "@/features/auth/stores/authStore";
import apiClient from "@/lib/api/client";

const ACard = Card;
const AForm = Form;
const AFormItem = Form.Item;
const AInputPassword = Input.Password;
const AButton = Button;
const ATag = Tag;
const AModal = Modal;
const ASpin = Spin;

const authStore = useAuthStore();

// ── Avatar ────────────────────────────────────────────────────────────────────

const fileInputRef = ref<HTMLInputElement | null>(null);
const avatarUploading = ref(false);
const avatarDeleting = ref(false);

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // Client-side validation
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    message.error("Only JPEG and PNG images are allowed.");
    return;
  }
  if (file.size > MAX_SIZE) {
    message.error("Image must be smaller than 2 MB.");
    return;
  }

  avatarUploading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await apiClient.post<{ avatarUrl: string }>(
      "/avatar",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    // Patch the local user object so the UI updates immediately
    if (authStore.user) {
      authStore.user.avatarUrl = data.avatarUrl;
    }

    message.success("Avatar updated!");
  } catch (err: any) {
    const detail =
      err.response?.data?.error ?? "Upload failed. Please try again.";
    message.error(detail);
  } finally {
    avatarUploading.value = false;
    // Reset the input so the same file can be re-selected if needed
    if (fileInputRef.value) fileInputRef.value.value = "";
  }
}

async function handleDeleteAvatar() {
  avatarDeleting.value = true;
  try {
    await apiClient.delete("/avatar");
    if (authStore.user) {
      authStore.user.avatarUrl = undefined;
    }
    message.success("Avatar removed.");
  } catch {
    message.error("Could not remove avatar. Please try again.");
  } finally {
    avatarDeleting.value = false;
  }
}

// ── Email Verification ────────────────────────────────────────────────────────

const sendingVerification = ref(false);

const sendVerification = async () => {
  sendingVerification.value = true;
  const success = await authStore.sendVerificationEmail();
  sendingVerification.value = false;
  if (success) {
    message.success("Verification email sent!");
  } else {
    message.error("Failed to send verification email");
  }
};

// ── Change Password ───────────────────────────────────────────────────────────

const showChangePassword = ref(false);
const passwordLoading = ref(false);

const passwordForm = ref({ current: "", new: "", confirm: "" });
const pwErrors = ref({ current: "", new: "", confirm: "" });

function openChangePassword() {
  resetPasswordForm();
  showChangePassword.value = true;
}

function resetPasswordForm() {
  passwordForm.value = { current: "", new: "", confirm: "" };
  pwErrors.value = { current: "", new: "", confirm: "" };
}

/** Front-end validation — returns true when all fields are valid. */
function validatePasswordForm(): boolean {
  let valid = true;

  if (!passwordForm.value.current) {
    pwErrors.value.current = "Current password is required.";
    valid = false;
  }

  if (!passwordForm.value.new) {
    pwErrors.value.new = "New password is required.";
    valid = false;
  } else if (passwordForm.value.new.length < 8) {
    pwErrors.value.new = "Password must be at least 8 characters.";
    valid = false;
  }

  if (!passwordForm.value.confirm) {
    pwErrors.value.confirm = "Please confirm your new password.";
    valid = false;
  } else if (passwordForm.value.new !== passwordForm.value.confirm) {
    pwErrors.value.confirm = "Passwords do not match.";
    valid = false;
  }

  return valid;
}

async function handleChangePassword() {
  if (!validatePasswordForm()) return;

  passwordLoading.value = true;
  const result = await authStore.changePassword(
    passwordForm.value.current,
    passwordForm.value.new,
  );
  passwordLoading.value = false;

  if (result.success) {
    message.success("Password updated successfully!");
    showChangePassword.value = false;
    resetPasswordForm();
  } else {
    // Map API error codes back to the relevant field
    switch (result.code) {
      case "INVALID_CURRENT_PASSWORD":
        pwErrors.value.current = "Current password is incorrect.";
        break;
      case "WEAK_PASSWORD":
        pwErrors.value.new = result.message ?? "Password is too weak.";
        break;
      default:
        message.error(result.message ?? "Failed to change password.");
    }
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  // Refresh user in case avatarUrl was updated elsewhere
  if (authStore.sessionToken) {
    authStore.fetchCurrentUser();
  }
});
</script>
