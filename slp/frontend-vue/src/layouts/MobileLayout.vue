<template>
  <div class="min-h-screen bg-gray-50" data-testid="layout-container">
    <header
      class="bg-white shadow-sm fixed top-0 left-0 right-0 z-30 h-[10vh]"
      data-testid="main-header"
    >
      <div
        class="flex items-center justify-between p-4"
        data-testid="header-content"
      >
        <div data-testid="header-left-section">
          <slot name="header-left">
            <BreadcrumbNav
              :fallback-title="title"
              data-testid="breadcrumb-nav"
            />
          </slot>
        </div>

        <div data-testid="header-center-section">
          <slot name="header-center" />
        </div>

        <div
          class="flex items-center gap-2"
          data-testid="header-right-section"
        >
          <slot name="header-right" />

          <button
            @click="toggleSidebar"
            class="p-2 hover:bg-gray-100 rounded-lg"
            data-testid="sidebar-toggle-button"
            aria-label="Toggle Sidebar"
          >
            <Menu :size="24" data-testid="menu-icon" />
          </button>
        </div>
      </div>
    </header>

    <main class="mt-[10vh] pt-4 pb-6 px-4" data-testid="main-content-area">
      <slot></slot>
    </main>

    <RightSidebar
      :is-open="sidebarOpen"
      @close="sidebarOpen = false"
      @logout="handleLogout"
      data-testid="right-sidebar-component"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Menu } from "lucide-vue-next";
import RightSidebar from "./RightSidebar.vue";
import BreadcrumbNav from "@/components/Breadcrumb.vue";

defineProps<{
  title: string;
}>();

const router = useRouter();
const sidebarOpen = ref(false);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const handleLogout = () => {
  router.push("/login");
};
</script>
