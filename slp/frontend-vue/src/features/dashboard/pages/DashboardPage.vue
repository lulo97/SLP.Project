<template>
  <MobileLayout title="Dashboard">
    Dashboard
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Card, Tag, Button, List, message } from 'ant-design-vue';
import { Calendar, Shield, Mail, User } from 'lucide-vue-next';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useAuthStore } from '@/features/auth/stores/authStore';

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