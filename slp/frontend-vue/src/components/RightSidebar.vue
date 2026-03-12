<template>
  <div class="fixed top-0 right-0 h-screen w-64 bg-white shadow-lg transform transition-transform duration-300 z-50"
       :class="{ 'translate-x-0': isOpen, 'translate-x-full': !isOpen }">
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="p-4 border-b flex justify-between items-center">
        <h2 class="font-semibold">Menu</h2>
        <button @click="$emit('close')" class="p-2">
          <X :size="20" />
        </button>
      </div>

      <!-- User Info -->
      <div v-if="authStore.user" class="p-4 border-b">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {{ authStore.user.username.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ authStore.user.username }}</p>
            <p class="text-sm text-gray-500 truncate">{{ authStore.user.email }}</p>
          </div>
        </div>
        <div v-if="!authStore.isEmailVerified" class="mt-2">
          <a-button type="link" size="small" @click="sendVerification" :loading="sendingVerification">
            Verify Email
          </a-button>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex-1 overflow-y-auto p-2">
        <a-menu mode="inline" :selected-keys="[currentRoute]" class="border-none">
          <!-- Dashboard -->
          <a-menu-item key="/dashboard">
            <router-link to="/dashboard" class="flex items-center">
              <LayoutDashboard :size="18" class="mr-2" />
              Dashboard
            </router-link>
          </a-menu-item>
          
          <!-- Quiz Section -->
          <a-menu-item key="/quiz">
            <router-link to="/quiz" class="flex items-center">
              <FileText :size="18" class="mr-2" />
              My Quizzes
            </router-link>
          </a-menu-item>

          <a-menu-item key="/quiz/new">
            <router-link to="/quiz/new" class="flex items-center">
              <PlusCircle :size="18" class="mr-2" />
              Create Quiz
            </router-link>
          </a-menu-item>

          <!-- Question Bank Section -->
          <a-menu-item key="/questions">
            <router-link to="/questions" class="flex items-center">
              <HelpCircle :size="18" class="mr-2" />
              Question Bank
            </router-link>
          </a-menu-item>

          <a-menu-item key="/question/new">
            <router-link to="/question/new" class="flex items-center">
              <Plus :size="18" class="mr-2" />
              New Question
            </router-link>
          </a-menu-item>

          <!-- Source Section -->
          <a-menu-item key="/source/upload">
            <router-link to="/source/upload" class="flex items-center">
              <Upload :size="18" class="mr-2" />
              Upload Source
            </router-link>
          </a-menu-item>

          <a-menu-divider />

          <!-- Profile -->
          <a-menu-item key="/profile">
            <router-link to="/profile" class="flex items-center">
              <User :size="18" class="mr-2" />
              Profile
            </router-link>
          </a-menu-item>

          <!-- Admin (if admin) -->
          <a-menu-item v-if="authStore.isAdmin" key="/admin">
            <router-link to="/admin" class="flex items-center">
              <Shield :size="18" class="mr-2" />
              Admin
            </router-link>
          </a-menu-item>

          <a-menu-divider />

          <!-- Logout -->
          <a-menu-item key="logout" @click="handleLogout">
            <div class="flex items-center text-red-500">
              <LogOut :size="18" class="mr-2" />
              Logout
            </div>
          </a-menu-item>
        </a-menu>
      </div>
    </div>
  </div>

  <!-- Overlay -->
  <div v-if="isOpen" 
       class="fixed inset-0 bg-black bg-opacity-50 z-40"
       @click="$emit('close')"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { Menu, Divider, Button } from 'ant-design-vue';
import { 
  X, 
  LayoutDashboard, 
  User, 
  Shield, 
  LogOut,
  FileText,
  PlusCircle,
  HelpCircle,
  Plus,
  Upload
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { message } from 'ant-design-vue';

const AMenu = Menu;
const AMenuItem = Menu.Item;
const AMenuDivider = Divider;
const AButton = Button;

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close', 'logout']);

const route = useRoute();
const authStore = useAuthStore();
const currentRoute = route.path;

const sendingVerification = ref(false);

const handleLogout = async () => {
  await authStore.logout();
  emit('logout');
  emit('close');
};

const sendVerification = async () => {
  sendingVerification.value = true;
  const success = await authStore.sendVerificationEmail();
  sendingVerification.value = false;
  
  if (success) {
    message.success('Verification email sent!');
  } else {
    message.error('Failed to send verification email');
  }
};
</script>