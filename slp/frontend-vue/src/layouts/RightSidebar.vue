<template>
  <div
    data-testid="sidebar-container"
    class="fixed top-0 right-0 h-screen w-64 bg-white shadow-lg transform transition-transform duration-300 z-50"
    :class="{ 'translate-x-0': isOpen, 'translate-x-full': !isOpen }"
  >
    <div class="flex flex-col h-full" data-testid="sidebar-content">
      <div
        class="p-4 border-b flex justify-between items-center"
        data-testid="sidebar-header"
      >
        <h2 class="font-semibold" data-testid="sidebar-title">Menu</h2>
        <button
          @click="$emit('close')"
          class="p-2"
          data-testid="sidebar-close-button"
        >
          <X :size="20" />
        </button>
      </div>

      <div
        v-if="authStore.user"
        class="p-4 border-b"
        data-testid="user-info-section"
      >
        <div class="flex items-center space-x-3">
          <div
            data-testid="user-avatar"
            class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold"
          >
            {{ authStore.user.username.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate" data-testid="user-username">
              {{ authStore.user.username }}
            </p>
            <p class="text-sm text-gray-500 truncate" data-testid="user-email">
              {{ authStore.user.email }}
            </p>
          </div>
        </div>
        <div v-if="!authStore.isEmailVerified" class="mt-2">
          <a-button
            data-testid="verify-email-button"
            type="link"
            size="small"
            @click="sendVerification"
            :loading="sendingVerification"
          >
            Verify Email
          </a-button>
        </div>
      </div>

      <div
        class="flex-1 overflow-y-auto p-2"
        data-testid="navigation-menu-container"
      >
        <a-menu
          mode="inline"
          :selected-keys="[currentRoute]"
          class="border-none"
          data-testid="navigation-menu"
        >
          <a-menu-item key="/dashboard" data-testid="nav-item-dashboard">
            <router-link to="/dashboard" class="flex items-center">
              <LayoutDashboard :size="18" class="mr-2" />Dashboard
            </router-link>
          </a-menu-item>

          <a-menu-item key="/quiz" data-testid="nav-item-quizzes">
            <router-link to="/quiz" class="flex items-center">
              <FileText :size="18" class="mr-2" />My Quizzes
            </router-link>
          </a-menu-item>
          <a-menu-item key="/quiz/new" data-testid="nav-item-create-quiz">
            <router-link to="/quiz/new" class="flex items-center">
              <PlusCircle :size="18" class="mr-2" />Create Quiz
            </router-link>
          </a-menu-item>

          <a-menu-item key="/questions" data-testid="nav-item-question-bank">
            <router-link to="/questions" class="flex items-center">
              <HelpCircle :size="18" class="mr-2" />Question Bank
            </router-link>
          </a-menu-item>
          <a-menu-item key="/question/new" data-testid="nav-item-new-question">
            <router-link to="/question/new" class="flex items-center">
              <Plus :size="18" class="mr-2" />New Question
            </router-link>
          </a-menu-item>

          <a-menu-item key="/source" data-testid="nav-item-sources">
            <router-link to="/source" class="flex items-center">
              <FolderOpen :size="18" class="mr-2" />My Sources
            </router-link>
          </a-menu-item>
          <a-menu-item key="/source/upload" data-testid="nav-item-upload">
            <router-link to="/source/upload" class="flex items-center">
              <Upload :size="18" class="mr-2" />Upload File
            </router-link>
          </a-menu-item>
          <a-menu-item key="/source/new-url" data-testid="nav-item-add-url">
            <router-link to="/source/new-url" class="flex items-center">
              <LinkIcon :size="18" class="mr-2" />Add from URL
            </router-link>
          </a-menu-item>
          <a-menu-item key="/source/new-note" data-testid="nav-item-add-text">
            <router-link to="/source/new-note" class="flex items-center">
              <FileText :size="18" class="mr-2" />Add from Text
            </router-link>
          </a-menu-item>
          <a-menu-item key="/notes">
            <router-link to="/notes" class="flex items-center">
              <FileText :size="18" class="mr-2" />My Notes
            </router-link>
          </a-menu-item>
          <a-menu-item key="/favourites">
            <router-link to="/favourites" class="flex items-center">
              <Star :size="18" class="mr-2" />Favourite
            </router-link>
          </a-menu-item>
          <a-menu-item key="/search" data-testid="nav-item-search">
            <router-link to="/search" class="flex items-center">
              <Search :size="18" class="mr-2" />Search
            </router-link>
          </a-menu-item>

          <a-menu-divider data-testid="nav-divider-1" />

          <a-menu-item key="/profile" data-testid="nav-item-profile">
            <router-link to="/profile" class="flex items-center">
              <User :size="18" class="mr-2" />Profile
            </router-link>
          </a-menu-item>

          <a-menu-item key="/reports" data-testid="nav-item-reports">
            <router-link to="/reports" class="flex items-center">
              <Flag :size="18" class="mr-2" />My Reports
            </router-link>
          </a-menu-item>

          <a-menu-item
            v-if="authStore.isAdmin"
            key="/admin"
            data-testid="nav-item-admin"
          >
            <router-link to="/admin" class="flex items-center">
              <Shield :size="18" class="mr-2" />Admin
            </router-link>
          </a-menu-item>

          <a-menu-item
            v-if="authStore.isAdmin"
            key="/admin/health"
            data-testid="nav-item-admin-health"
          >
            <router-link to="/admin/health" class="flex items-center">
              <Activity :size="18" class="mr-2" />Service Health
            </router-link>
          </a-menu-item>

          <a-menu-item
            v-if="authStore.isAdmin"
            key="/admin/metrics"
            data-testid="nav-item-admin-metrics"
          >
            <router-link to="/admin/metrics" class="flex items-center">
              <BarChart2 :size="18" class="mr-2" />Metrics
            </router-link>
          </a-menu-item>

          <a-menu-divider data-testid="nav-divider-2" />

          <a-menu-item
            key="settings"
            @click="settingsOpen = true"
            data-testid="nav-item-settings"
          >
            <div class="flex items-center">
              <Settings :size="18" class="mr-2" />Settings
            </div>
          </a-menu-item>

          <a-menu-item
            key="logout"
            @click="handleLogout"
            data-testid="nav-item-logout"
          >
            <div class="flex items-center text-red-500">
              <LogOut :size="18" class="mr-2" />Logout
            </div>
          </a-menu-item>
        </a-menu>
      </div>
    </div>
  </div>

  <div
    v-if="isOpen"
    data-testid="sidebar-overlay"
    class="fixed inset-0 bg-black bg-opacity-50 z-40"
    @click="$emit('close')"
  />

  <a-modal
    v-model:open="settingsOpen"
    title="Settings"
    :footer="null"
    width="320px"
    centered
    data-testid="settings-modal"
  >
    <div class="space-y-6 py-2" data-testid="settings-modal-content">
      <div data-testid="settings-theme-section">
        <p class="text-sm font-medium text-gray-600 mb-2">Theme</p>
        <div class="flex gap-2">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            :data-testid="`theme-option-${option.value}`"
            class="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all"
            :class="
              settingsStore.theme === option.value
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            "
            @click="settingsStore.setTheme(option.value)"
          >
            <component :is="option.icon" :size="16" />
            {{ option.label }}
          </button>
        </div>
      </div>

      <div data-testid="settings-language-section">
        <p class="text-sm font-medium text-gray-600 mb-2">Language</p>
        <div class="flex gap-2">
          <button
            v-for="option in languageOptions"
            :key="option.value"
            :data-testid="`language-option-${option.value}`"
            class="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all"
            :class="
              settingsStore.language === option.value
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            "
            @click="settingsStore.setLanguage(option.value)"
          >
            <span>{{ option.flag }}</span>
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import { Menu, Divider, Button, Modal as AModal } from "ant-design-vue";
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
  Upload,
  FolderOpen,
  Link as LinkIcon,
  Search,
  Settings,
  Sun,
  Moon,
  Flag,
  Activity,
  BarChart2,
  Star
} from "lucide-vue-next";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useSettingsStore } from "@/features/settings/stores/settingsStore";
import type { Theme, Language } from "@/features/settings/stores/settingsStore";
import { message } from "ant-design-vue";

const AMenu = Menu;
const AMenuItem = Menu.Item;
const AMenuDivider = Divider;
const AButton = Button;

defineProps<{ isOpen: boolean }>();
const emit = defineEmits(["close", "logout"]);

const route = useRoute();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const currentRoute = route.path;

const settingsOpen = ref(false);
const sendingVerification = ref(false);

// ── Option lists ──────────────────────────────────────────────────────────────
const themeOptions: { value: Theme; label: string; icon: any }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

// ── Handlers ──────────────────────────────────────────────────────────────────
const handleLogout = async () => {
  await authStore.logout();
  emit("logout");
  emit("close");
};

const sendVerification = async () => {
  sendingVerification.value = true;
  const success = await authStore.sendVerificationEmail();
  sendingVerification.value = false;
  if (success) message.success("Verification email sent!");
  else message.error("Failed to send verification email");
};
</script>
