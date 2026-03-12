<template>
  <MobileLayout title="Profile">
    <div class="space-y-4">
      <!-- Profile Header -->
      <a-card class="shadow-sm text-center">
        <div class="relative inline-block">
          <div
            class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mx-auto flex items-center justify-center text-white text-3xl font-bold"
          >
            {{ authStore.user?.username.charAt(0).toUpperCase() }}
          </div>
          <button
            @click="handleAvatarUpload"
            class="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg"
          >
            <Camera :size="16" />
          </button>
        </div>
        <h2 class="text-xl font-semibold mt-4">
          {{ authStore.user?.username }}
        </h2>
        <p class="text-gray-500">{{ authStore.user?.email }}</p>
      </a-card>

      <!-- Account Settings -->
      <a-card
        title="Account Settings"
        class="shadow-sm"
        :bodyStyle="{ padding: '16px' }"
      >
        <div class="space-y-3">
          <!-- Email Verification -->
          <div class="flex items-start justify-between">
            <div class="flex items-start min-w-0 flex-1">
              <Mail
                :size="18"
                class="mr-2 mt-0.5 flex-shrink-0 text-gray-500"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">Email Verification</p>
                <p class="text-xs text-gray-500 truncate">
                  {{ authStore.isEmailVerified ? "Verified" : "Not verified" }}
                </p>
              </div>
            </div>
            <a-tag
              :color="authStore.isEmailVerified ? 'success' : 'warning'"
              class="ml-2 flex-shrink-0 text-xs"
            >
              {{ authStore.isEmailVerified ? "Verified" : "Pending" }}
            </a-tag>
          </div>

          <!-- Password -->
          <div class="flex items-start justify-between">
            <div class="flex items-start min-w-0 flex-1">
              <Key :size="18" class="mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">Password</p>
                <p class="text-xs text-gray-500 truncate">
                  Last changed recently
                </p>
              </div>
            </div>
            <a-button
              type="link"
              @click="showChangePassword = true"
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

    <!-- Change Password Modal -->
    <a-modal
      v-model:open="showChangePassword"
      title="Change Password"
      @ok="handleChangePassword"
    >
      <a-form layout="vertical">
        <a-form-item label="Current Password" required>
          <a-input-password v-model:value="passwordForm.current" />
        </a-form-item>
        <a-form-item label="New Password" required>
          <a-input-password v-model:value="passwordForm.new" />
        </a-form-item>
        <a-form-item label="Confirm New Password" required>
          <a-input-password v-model:value="passwordForm.confirm" />
        </a-form-item>
      </a-form>
    </a-modal>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  Card,
  Form,
  Input,
  Button,
  Tag,
  Modal,
  Popconfirm,
  message,
} from "ant-design-vue";
import { Camera, Image, Mail, Key, Shield, Trash2 } from "lucide-vue-next";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useAuthStore } from "@/features/auth/stores/authStore";

const ACard = Card;
const AForm = Form;
const AFormItem = Form.Item;
const AInput = Input;
const AInputPassword = Input.Password;
const AButton = Button;
const ATag = Tag;
const AModal = Modal;
const APopconfirm = Popconfirm;

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  name: "",
  avatarUrl: "",
});

const showChangePassword = ref(false);
const passwordForm = ref({
  current: "",
  new: "",
  confirm: "",
});

onMounted(() => {
  if (authStore.user) {
    form.value.name = authStore.user.username;
  }
});

const handleUpdate = async () => {
  const success = await authStore.updateProfile(
    form.value.name,
    form.value.avatarUrl,
  );
  if (success) {
    message.success("Profile updated successfully");
  }
};

const handleAvatarUpload = () => {
  message.info("Avatar upload feature coming soon");
};

const handleChangePassword = () => {
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    message.error("New passwords do not match");
    return;
  }
  message.info("Password change feature coming soon");
  showChangePassword.value = false;
};

const handleDeleteAccount = () => {
  message.info("Account deletion feature coming soon");
};
</script>
