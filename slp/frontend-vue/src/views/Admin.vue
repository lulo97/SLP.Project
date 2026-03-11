<template>
  <MobileLayout title="Admin Panel">
    <div class="space-y-4">
      <!-- Admin Stats -->
      <div class="grid grid-cols-2 gap-4">
        <a-card class="shadow-sm text-center">
          <Users :size="24" class="mx-auto mb-2 text-blue-500" />
          <div class="text-2xl font-bold">42</div>
          <div class="text-sm text-gray-500">Total Users</div>
        </a-card>

        <a-card class="shadow-sm text-center">
          <UserCheck :size="24" class="mx-auto mb-2 text-green-500" />
          <div class="text-2xl font-bold">38</div>
          <div class="text-sm text-gray-500">Active Users</div>
        </a-card>
      </div>

      <!-- Users List -->
      <a-card title="User Management" class="shadow-sm">
        <a-input-search
          v-model:value="search"
          placeholder="Search users..."
          style="margin-bottom: 16px"
        />

        <a-list :data-source="filteredUsers" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #avatar>
                  <a-avatar :style="{ backgroundColor: getAvatarColor(item.username) }">
                    {{ item.username.charAt(0).toUpperCase() }}
                  </a-avatar>
                </template>
                <template #title>
                  <div class="flex items-center justify-between">
                    <span>{{ item.username }}</span>
                    <a-tag :color="item.role === 'admin' ? 'red' : 'blue'">
                      {{ item.role }}
                    </a-tag>
                  </div>
                </template>
                <template #description>
                  <div class="text-sm">
                    <div>{{ item.email }}</div>
                    <div class="flex items-center mt-1">
                      <a-tag :color="item.status === 'active' ? 'success' : 'default'" size="small">
                        {{ item.status }}
                      </a-tag>
                      <a-tag :color="item.emailConfirmed ? 'success' : 'warning'" size="small">
                        {{ item.emailConfirmed ? 'Verified' : 'Unverified' }}
                      </a-tag>
                    </div>
                  </div>
                </template>
              </a-list-item-meta>
              <template #actions>
                <a-popconfirm
                  title="Delete this user?"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="handleDeleteUser(item)"
                >
                  <a-button type="text" danger :icon="h(Trash2, { size: 16 })" />
                </a-popconfirm>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { Card, List, Avatar, Tag, Input, Button, Popconfirm, message } from 'ant-design-vue';
import { Users, UserCheck, Trash2 } from 'lucide-vue-next';
import MobileLayout from '../components/MobileLayout.vue';
import { useAuthStore } from '../stores/auth';
import { useUserStore } from '../stores/user';

const ACard = Card;
const AList = List;
const AListItem = List.Item;
const AListItemMeta = List.Item.Meta;
const AAvatar = Avatar;
const ATag = Tag;
const AInputSearch = Input.Search;
const AButton = Button;
const APopconfirm = Popconfirm;

const authStore = useAuthStore();
const userStore = useUserStore();

const search = ref('');

// Mock data for now - replace with actual API call
const mockUsers = ref([
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    emailConfirmed: true,
  },
  {
    id: 2,
    username: 'john_doe',
    email: 'john@example.com',
    role: 'user',
    status: 'active',
    emailConfirmed: false,
  },
  {
    id: 3,
    username: 'jane_smith',
    email: 'jane@example.com',
    role: 'user',
    status: 'active',
    emailConfirmed: true,
  },
]);

const filteredUsers = computed(() => {
  if (!search.value) return mockUsers.value;
  return mockUsers.value.filter(
    user => 
      user.username.toLowerCase().includes(search.value.toLowerCase()) ||
      user.email.toLowerCase().includes(search.value.toLowerCase())
  );
});

const getAvatarColor = (username: string) => {
  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae'];
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
};

const handleDeleteUser = async (user: any) => {
  // Don't allow deleting admin
  if (user.username === 'admin') {
    message.error('Cannot delete admin user');
    return;
  }

  const success = await userStore.deleteUser(user.id);
  if (success) {
    message.success('User deleted successfully');
    mockUsers.value = mockUsers.value.filter(u => u.id !== user.id);
  } else {
    message.error('Failed to delete user');
  }
};
</script>