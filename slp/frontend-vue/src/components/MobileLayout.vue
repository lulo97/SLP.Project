<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile Header with Right Sidebar Toggle -->
    <header class="bg-white shadow-sm fixed top-0 left-0 right-0 z-30">
      <div class="flex items-center justify-between p-4">
        <h1 class="text-xl font-semibold">{{ title }}</h1>
        <button @click="toggleSidebar" class="p-2 hover:bg-gray-100 rounded-lg">
          <Menu :size="24" />
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="pt-16 pb-6 px-4">
      <slot></slot>
    </main>

    <!-- Right Sidebar -->
    <RightSidebar 
      :is-open="sidebarOpen" 
      @close="sidebarOpen = false"
      @logout="handleLogout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Menu } from 'lucide-vue-next';
import RightSidebar from './RightSidebar.vue';

defineProps<{
  title: string;
}>();

const router = useRouter();
const sidebarOpen = ref(false);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const handleLogout = () => {
  router.push('/login');
};
</script>