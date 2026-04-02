<template>
  <MobileLayout title="Profile" data-testid="profile-page-layout">
    <div class="space-y-4" data-testid="profile-container">
      <a-card class="shadow-sm text-center" data-testid="profile-header-card">
        <div class="relative inline-block" data-testid="avatar-wrapper">
          <img
            v-if="authStore.user?.avatarUrl"
            :src="authStore.user.avatarUrl"
            alt="Avatar"
            class="w-24 h-24 rounded-full object-cover mx-auto border-2 border-gray-200"
            data-testid="profile-avatar-img"
          />
          <div
            v-else
            class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mx-auto flex items-center justify-center text-white text-3xl font-bold"
            data-testid="profile-avatar-fallback"
          >
            {{ authStore.user?.username.charAt(0).toUpperCase() }}
          </div>

          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png"
            class="hidden"
            @change="handleFileSelected"
            data-testid="avatar-file-input"
          />

          <button
            @click="fileInputRef?.click()"
            :disabled="avatarUploading"
            class="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 disabled:opacity-50"
            title="Change avatar"
            data-testid="btn-upload-avatar"
          >
            <a-spin
              v-if="avatarUploading"
              :size="'small'"
              data-testid="avatar-upload-spinner"
            />
            <Camera v-else :size="16" data-testid="icon-camera" />
          </button>
        </div>

        <h2 class="text-xl font-semibold mt-4" data-testid="profile-username">
          {{ authStore.user?.username }}
        </h2>
        <p class="text-gray-500" data-testid="profile-email-display">
          {{ authStore.user?.email }}
        </p>

        <div
          v-if="authStore.user?.avatarUrl"
          class="mt-2"
          data-testid="remove-photo-container"
        >
          <a-button
            type="link"
            danger
            size="small"
            :loading="avatarDeleting"
            @click="handleDeleteAvatar"
            data-testid="btn-remove-photo"
          >
            Remove photo
          </a-button>
        </div>
      </a-card>

      <a-card
        title="Account Settings"
        class="shadow-sm"
        :bodyStyle="{ padding: '16px' }"
        data-testid="account-settings-card"
      >
        <div class="space-y-3">
          <div
            class="flex items-center justify-between py-1"
            data-testid="setting-item-email"
          >
            <div class="flex items-start min-w-0 flex-1 mr-2">
              <Mail
                :size="18"
                class="mr-2 mt-0.5 flex-shrink-0 text-gray-400"
                data-testid="icon-mail"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-700 truncate">
                  Email Verification
                </p>
                <p
                  class="text-xs text-gray-500 truncate"
                  data-testid="setting-email-value"
                >
                  {{ authStore.user?.email }}
                </p>
              </div>
            </div>

            <div class="flex items-center flex-shrink-0">
              <a-tag
                :color="authStore.isEmailVerified ? 'success' : 'warning'"
                class="m-0 border-none px-2 text-[11px] leading-5 rounded-full"
                data-testid="tag-email-status"
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
                data-testid="btn-verify-email"
              >
                Verify Now
              </a-button>
            </div>
          </div>

          <div
            class="flex items-start justify-between"
            data-testid="setting-item-password"
          >
            <div class="flex items-start min-w-0 flex-1">
              <Key
                :size="18"
                class="mr-2 mt-0.5 flex-shrink-0 text-gray-500"
                data-testid="icon-key"
              />
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
              data-testid="btn-open-change-password"
            >
              Change
            </a-button>
          </div>

          <div
            class="flex items-start justify-between"
            data-testid="setting-item-status"
          >
            <div class="flex items-start min-w-0 flex-1">
              <Shield
                :size="18"
                class="mr-2 mt-0.5 flex-shrink-0 text-gray-500"
                data-testid="icon-shield"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">Account Status</p>
                <p
                  class="text-xs text-gray-500 capitalize truncate"
                  data-testid="status-text-value"
                >
                  {{ authStore.user?.status }}
                </p>
              </div>
            </div>
            <a-tag
              :color="
                authStore.user?.status === 'active' ? 'success' : 'default'
              "
              class="ml-2 flex-shrink-0 text-xs"
              data-testid="tag-account-status"
            >
              {{ authStore.user?.status }}
            </a-tag>
          </div>
        </div>
      </a-card>
    </div>

    <a-modal
      v-model:open="showChangePassword"
      title="Change Password"
      :confirm-loading="passwordLoading"
      @cancel="resetPasswordForm"
      data-testid="modal-change-password"
    >
      <a-form layout="vertical" class="pt-2" data-testid="form-change-password">
        <a-form-item
          label="Current Password"
          :validate-status="pwErrors.current ? 'error' : undefined"
          :help="pwErrors.current"
          required
          data-testid="form-item-current-password"
        >
          <a-input-password
            v-model:value="passwordForm.current"
            placeholder="Enter your current password"
            @input="pwErrors.current = ''"
            data-testid="input-current-password"
          />
        </a-form-item>

        <a-form-item
          label="New Password"
          :validate-status="pwErrors.new ? 'error' : undefined"
          :help="pwErrors.new"
          required
          data-testid="form-item-new-password"
        >
          <a-input-password
            v-model:value="passwordForm.new"
            placeholder="At least 8 characters"
            @input="pwErrors.new = ''"
            data-testid="input-new-password"
          />
        </a-form-item>

        <a-form-item
          label="Confirm New Password"
          :validate-status="pwErrors.confirm ? 'error' : undefined"
          :help="pwErrors.confirm"
          required
          data-testid="form-item-confirm-password"
        >
          <a-input-password
            v-model:value="passwordForm.confirm"
            placeholder="Repeat new password"
            @input="pwErrors.confirm = ''"
            data-testid="input-confirm-password"
          />
        </a-form-item>
      </a-form>

      <template #footer>
        <a-button
          key="back"
          @click="showChangePassword = false"
          data-testid="btn-cancel-password"
        >
          Cancel
        </a-button>
        <a-button
          key="submit"
          type="primary"
          :loading="passwordLoading"
          @click="handleChangePassword"
          data-testid="btn-update-password"
        >
          Update Password
        </a-button>
      </template>
    </a-modal>
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
      err.response?.data?.message ?? "Upload failed. Please try again.";
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
    message.error(result.message ?? "Failed to change password.");
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
