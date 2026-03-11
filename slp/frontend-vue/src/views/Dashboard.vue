<template>
  <MobileLayout title="Dashboard">
    <div class="space-y-4">
      <!-- Welcome Card -->
      <a-card class="shadow-sm">
        <div class="flex items-center space-x-4">
          <div class="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
            {{ authStore.user?.username.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h2 class="text-xl font-semibold">Welcome, {{ authStore.user?.username }}!</h2>
            <p class="text-gray-500">{{ authStore.user?.email }}</p>
            <a-tag :color="authStore.isEmailVerified ? 'success' : 'warning'" class="mt-2">
              {{ authStore.isEmailVerified ? 'Verified' : 'Not Verified' }}
            </a-tag>
          </div>
        </div>
      </a-card>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 gap-4">
        <a-card class="shadow-sm text-center">
          <Calendar :size="24" class="mx-auto mb-2 text-blue-500" />
          <div class="text-2xl font-bold">{{ formatDate(authStore.user?.createdAt) }}</div>
          <div class="text-sm text-gray-500">Member Since</div>
        </a-card>

        <a-card class="shadow-sm text-center">
          <Shield :size="24" class="mx-auto mb-2 text-green-500" />
          <div class="text-2xl font-bold capitalize">{{ authStore.user?.role }}</div>
          <div class="text-sm text-gray-500">User Role</div>
        </a-card>
      </div>

      <!-- Quick Actions -->
      <a-card title="Quick Actions" class="shadow-sm">
        <div class="space-y-2">
          <a-button block @click="handleSendVerification" :disabled="authStore.isEmailVerified">
            <Mail class="mr-2" :size="16" />
            {{ authStore.isEmailVerified ? 'Email Verified' : 'Verify Email' }}
          </a-button>
          
          <a-button block @click="router.push('/profile')">
            <User class="mr-2" :size="16" />
            Edit Profile
          </a-button>
        </div>
      </a-card>

      <!-- Activity Feed (Mock Data) -->
      <a-card title="Recent Activity" class="shadow-sm">
        <a-list :data-source="activities" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>
                  <span>{{ item.action }}</span>
                </template>
                <template #description>
                  <span class="text-xs text-gray-400">{{ item.time }}</span>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-card>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Card, Tag, Button, List, message } from 'ant-design-vue';
import { Calendar, Shield, Mail, User } from 'lucide-vue-next';
import MobileLayout from '../components/MobileLayout.vue';
import { useAuthStore } from '../stores/auth';

const ACard = Card;
const ATag = Tag;
const AButton = Button;
const AList = List;
const AListItem = List.Item;
const AListItemMeta = List.Item.Meta;

const router = useRouter();
const authStore = useAuthStore();

const activities = ref([
  { action: 'Logged in', time: 'Just now' },
  { action: 'Profile updated', time: '2 days ago' },
  { action: 'Account created', time: '1 week ago' },
]);

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const handleSendVerification = async () => {
  const success = await authStore.sendVerificationEmail();
  if (success) {
    message.success('Verification email sent!');
  } else {
    message.error('Failed to send verification email');
  }
};

onMounted(() => {
  if (!authStore.user) {
    authStore.fetchCurrentUser();
  }
});
</script>