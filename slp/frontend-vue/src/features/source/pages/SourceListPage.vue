<template>
  <MobileLayout title="My Sources">
    <template #header-extra>
      <a-space>
        <a-button type="primary" size="small" @click="goToUpload" data-testid="source-list-upload-button">
          <UploadOutlined /> Upload File
        </a-button>
        <a-button type="primary" size="small" @click="goToUrlCreate" data-testid="source-list-add-url-button">
          <LinkOutlined /> Add from URL
        </a-button>
      </a-space>
    </template>

    <!-- Loading, Error, Empty states (unchanged) -->
    <!-- Loading -->
    <div v-if="sourceStore.loading" class="text-center py-8" data-testid="source-list-loading">
      <a-spin />
      <!-- Loading spinner -->
    </div>

    <!-- Source list -->
    <a-list
      v-else
      :data-source="sourceStore.sources"
      :pagination="pagination"
      class="source-list"
      data-testid="source-list"
    >
      <template #renderItem="{ item }">
        <a-list-item :data-testid="'source-list-item-' + item.id">
          <a-list-item-meta>
            <template #title>
              <router-link :to="`/source/${item.id}`" :data-testid="'source-list-item-link-' + item.id">
                {{ item.title || "Untitled" }}
              </router-link>
            </template>
            <template #description>
              <div class="text-xs text-gray-500">
                <span>Type: {{ formatType(item.type) }}</span>
                <span class="mx-2">•</span>
                <span>Added: {{ formatDate(item.createdAt) }}</span>
                <!-- No file size from backend -->
              </div>
            </template>
          </a-list-item-meta>
          <template #actions>
            <a-button type="text" size="small" @click="viewSource(item.id)" :data-testid="'source-list-view-' + item.id">
              <EyeOutlined />
            </a-button>
            <a-popconfirm
              title="Delete this source?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="deleteSource(item.id)"
            >
              <a-button type="text" size="small" danger :data-testid="'source-list-delete-' + item.id">
                <DeleteOutlined />
              </a-button>
            </a-popconfirm>
          </template>
        </a-list-item>
      </template>
    </a-list>
  </MobileLayout>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  UploadOutlined,
  LinkOutlined,
  FileTextOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useSourceStore } from "../stores/sourceStore";

const router = useRouter();
const sourceStore = useSourceStore();

const pagination = { pageSize: 20, showSizeChanger: false };

const formatType = (type: string) => {
  const map: Record<string, string> = {
    pdf: "PDF",
    txt: "Text",
    link: "Link",
    note: "Note",
    book: "Book",
  };
  return map[type] || type;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString();
};

const viewSource = (id: number) => router.push(`/source/${id}`);

const deleteSource = async (id: number) => {
  const success = await sourceStore.deleteSource(id);
  if (success) {
    message.success("Source deleted");
    await sourceStore.fetchSources();
  } else {
    message.error("Delete failed");
  }
};

const goToUpload = () => router.push("/source/upload");
const goToUrlCreate = () => router.push("/source/new-url");

onMounted(() => sourceStore.fetchSources());
</script>