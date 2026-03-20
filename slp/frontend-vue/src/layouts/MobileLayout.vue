<template>
  <div class="min-h-screen bg-gray-50" data-test-id="layout-container">
    <header
      class="bg-white shadow-sm fixed top-0 left-0 right-0 z-30 h-[10vh]"
      data-test-id="main-header"
    >
      <div
        class="flex items-center justify-between p-4"
        data-test-id="header-content"
      >
        <div data-test-id="header-left-section">
          <slot name="header-left">
            <BreadcrumbNav
              :fallback-title="title"
              data-test-id="breadcrumb-nav"
            />
          </slot>
        </div>

        <div data-test-id="header-center-section">
          <slot name="header-center" />
        </div>

        <div
          class="flex items-center gap-2"
          data-test-id="header-right-section"
        >
          <slot name="header-right" />

          <button
            @click="toggleSidebar"
            class="p-2 hover:bg-gray-100 rounded-lg"
            data-test-id="sidebar-toggle-button"
            aria-label="Toggle Sidebar"
          >
            <Menu :size="24" data-test-id="menu-icon" />
          </button>
        </div>
      </div>
    </header>

    <main class="mt-[10vh] pt-4 pb-6 px-4" data-test-id="main-content-area">
      <slot></slot>
    </main>

    <RightSidebar
      :is-open="sidebarOpen"
      @close="sidebarOpen = false"
      @logout="handleLogout"
      data-test-id="right-sidebar-component"
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
