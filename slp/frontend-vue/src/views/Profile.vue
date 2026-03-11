<template>
  <MobileLayout title="Profile">
    <div class="space-y-4">
      <!-- Profile Header -->
      <a-card class="shadow-sm text-center">
        <div class="relative inline-block">
          <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mx-auto flex items-center justify-center text-white text-3xl font-bold">
            {{ authStore.user?.username.charAt(0).toUpperCase() }}
          </div>
          <button @click="handleAvatarUpload" class="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg">
            <Camera :size="16" />
          </button>
        </div>
        <h2 class="text-xl font-semibold mt-4">{{ authStore.user?.username }}</h2>
        <p class="text-gray-500">{{ authStore.user?.email }}</p>
      </a-card>

      <!-- Edit Profile Form -->
      <a-card title="Edit Profile" class="shadow-sm">
        <a-form
          :model="form"
          @submit.prevent="handleUpdate"
          layout="vertical"
        >
          <a-form-item label="Username" required>
            <a-input
              v-model:value="form.name"
              placeholder="Enter your username"
            />
          </a-form-item>

          <a-form-item label="Avatar URL">
            <a-input
              v-model:value="form.avatarUrl"
              placeholder="Enter avatar image URL"
            >
              <template #prefix>
                <Image :size="16" class="text-gray-400" />
              </template>
            </a-input>
          </a-form-item>

          <a-button
            type="primary"
            html-type="submit"
            :loading="authStore.loading"
            block
          >
            Update Profile
          </a-button>
        </a-form>
      </a-card>

      <!-- Account Settings -->
      <a-card title="Account Settings" class="shadow-sm">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <Mail :size="20" class="mr-3 text-gray-500" />
              <div>
                <p class="font-medium">Email Verification</p>
                <p class="text-sm text-gray-500">
                  {{ authStore.isEmailVerified ? 'Verified' : 'Not verified' }}
                </p>
              </div>
            </div>
            <a-tag :color="authStore.isEmailVerified ? 'success' : 'warning'">
              {{ authStore.isEmailVerified ? 'Verified' : 'Pending' }}
            </a-tag>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <Key :size="20" class="mr-3 text-gray-500" />
              <div>
                <p class="font-medium">Password</p>
                <p class="text-sm text-gray-500">Last changed recently</p>
              </div>
            </div>
            <a-button type="link" @click="showChangePassword = true">
              Change
            </a-button>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <Shield :size="20" class="mr-3 text-gray-500" />
              <div>
                <p class="font-medium">Account Status</p>
                <p class="text-sm text-gray-500 capitalize">{{ authStore.user?.status }}</p>
              </div>
            </div>
            <a-tag :color="authStore.user?.status === 'active' ? 'success' : 'default'">
              {{ authStore.user?.status }}
            </a-tag>
          </div>
        </div>
      </a-card>

      <!-- Danger Zone -->
      <a-card class="shadow-sm border-red-200">
        <template #title>
          <span class="text-red-600">Danger Zone</span>
        </template>
        
        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          
          <a-popconfirm
            title="Are you sure you want to delete your account?"
            ok-text="Yes, Delete"
            cancel-text="No"
            @confirm="handleDeleteAccount"
          >
            <a-button danger block>
              <Trash2 :size="16" class="mr-2" />
              Delete Account
            </a-button>
          </a-popconfirm>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Card, Form, Input, Button, Tag, Modal, Popconfirm, message } from 'ant-design-vue';
import { Camera, Image, Mail, Key, Shield, Trash2 } from 'lucide-vue-next';
import MobileLayout from '../components/MobileLayout.vue';
import { useAuthStore } from '../stores/auth';

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
  name: '',
  avatarUrl: '',
});

const showChangePassword = ref(false);
const passwordForm = ref({
  current: '',
  new: '',
  confirm: '',
});

onMounted(() => {
  if (authStore.user) {
    form.value.name = authStore.user.username;
  }
});

const handleUpdate = async () => {
  const success = await authStore.updateProfile(form.value.name, form.value.avatarUrl);
  if (success) {
    message.success('Profile updated successfully');
  }
};

const handleAvatarUpload = () => {
  message.info('Avatar upload feature coming soon');
};

const handleChangePassword = () => {
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    message.error('New passwords do not match');
    return;
  }
  message.info('Password change feature coming soon');
  showChangePassword.value = false;
};

const handleDeleteAccount = () => {
  message.info('Account deletion feature coming soon');
};
</script>