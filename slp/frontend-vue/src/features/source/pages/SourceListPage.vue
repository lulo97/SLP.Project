<template>
  <MobileLayout title="My Sources">
    <template #header-right>
      <a-space>
        <a-button
          type="primary"
          size="small"
          @click="goToUpload"
          data-testid="source-list-upload-btn"
        >
          <UploadOutlined /> Upload File
        </a-button>
        <a-button
          type="primary"
          size="small"
          @click="goToUrlCreate"
          data-testid="source-list-add-url-btn"
        >
          <LinkOutlined /> Add from URL
        </a-button>
        <a-button
          size="small"
          @click="router.push('/source/new-note')"
          data-testid="source-list-add-note-btn"
        >
          Add Note
        </a-button>
      </a-space>
    </template>

    <!-- Search / filter bar -->
    <div
      class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#e8e4dc]"
      data-testid="source-list-filters"
    >
      <a-input-search
        v-model:value="searchQuery"
        placeholder="Search by title…"
        allow-clear
        class="max-w-[280px]"
        :loading="sourceStore.loading"
        @search="onSearch"
        @change="onSearchChange"
        data-testid="source-list-search-input"
      />

      <a-select
        v-model:value="typeFilter"
        placeholder="All types"
        allow-clear
        style="width: 140px"
        @change="onTypeChange"
        data-testid="source-list-type-filter"
      >
        <a-select-option value="pdf" data-testid="source-list-type-pdf"
          >PDF</a-select-option
        >
        <a-select-option value="link" data-testid="source-list-type-link"
          >URL</a-select-option
        >
        <a-select-option value="note" data-testid="source-list-type-note"
          >Note</a-select-option
        >
      </a-select>

      <span
        v-if="sourceStore.pagination.total > 0"
        class="text-xs text-gray-400 ml-auto"
        data-testid="source-list-total"
      >
        {{ sourceStore.pagination.total }} source{{
          sourceStore.pagination.total !== 1 ? "s" : ""
        }}
      </span>
    </div>

    <!-- Loading -->
    <div
      v-if="sourceStore.loading"
      class="text-center py-8"
      data-testid="source-list-loading"
    >
      <a-spin />
    </div>

    <!-- Empty -->
    <div
      v-else-if="!sourceStore.sources.length"
      class="text-center py-12 text-gray-400"
      data-testid="source-list-empty"
    >
      <template v-if="searchQuery || typeFilter">
        No sources match your filters.
      </template>
      <template v-else>
        No sources yet. Upload a file, add a URL, or create a note to get
        started.
      </template>
    </div>

    <!-- List -->
    <template v-else>
      <a-list
        :data-source="sourceStore.sources"
        class="source-list"
        data-testid="source-list"
      >
        <template #renderItem="{ item }">
          <a-list-item :data-testid="`source-list-item-${item.id}`">
            <a-list-item-meta>
              <template #title>
                <router-link
                  :to="`/source/${item.id}`"
                  :data-testid="`source-list-item-link-${item.id}`"
                >
                  {{ item.title || "Untitled" }}
                </router-link>
              </template>
              <template #description>
                <div
                  class="text-xs text-gray-500"
                  :data-testid="`source-list-item-meta-${item.id}`"
                >
                  <span :data-testid="`source-list-item-type-${item.id}`">
                    Type: {{ formatType(item.type) }}
                  </span>
                  <span class="mx-2">•</span>
                  <span :data-testid="`source-list-item-date-${item.id}`">
                    Added: {{ formatDate(item.createdAt) }}
                  </span>
                </div>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button
                type="text"
                size="small"
                @click="viewSource(item.id)"
                :data-testid="`source-list-view-btn-${item.id}`"
              >
                <EyeOutlined />
              </a-button>
              <a-popconfirm
                title="Delete this source?"
                ok-text="Yes"
                cancel-text="No"
                @confirm="deleteSource(item.id)"
                :data-testid="`source-list-delete-confirm-${item.id}`"
              >
                <a-button
                  type="text"
                  size="small"
                  danger
                  :data-testid="`source-list-delete-btn-${item.id}`"
                >
                  <DeleteOutlined />
                </a-button>
              </a-popconfirm>
            </template>
          </a-list-item>
        </template>
      </a-list>

      <!-- Server-driven pagination -->
      <div
        class="flex justify-center py-4"
        data-testid="source-list-pagination"
      >
        <a-pagination
          :current="sourceStore.pagination.page"
          :total="sourceStore.pagination.total"
          :page-size="sourceStore.pagination.pageSize"
          :show-size-changer="false"
          :show-quick-jumper="sourceStore.pagination.totalPages > 5"
          @change="onPageChange"
        />
      </div>
    </template>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  UploadOutlined,
  LinkOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import { useSourceStore } from "../stores/sourceStore";

const router = useRouter();
const sourceStore = useSourceStore();

// ── Filter state ──────────────────────────────────────────────────────────────
const searchQuery = ref("");
const typeFilter = ref<string | undefined>(undefined);

/** Debounce timer for the search input */
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatType = (type: string) => {
  const map: Record<string, string> = {
    pdf: "PDF",
    txt: "Text",
    link: "URL",
    url: "URL",
    note: "Note",
    book: "Book",
  };
  return map[type] ?? type.toUpperCase();
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

// ── Fetch wrapper ─────────────────────────────────────────────────────────────
function load(page = 1) {
  sourceStore.fetchSources({
    page,
    pageSize: sourceStore.pagination.pageSize,
    search: searchQuery.value.trim() || undefined,
    type: typeFilter.value || undefined,
  });
}

// ── Event handlers ────────────────────────────────────────────────────────────
function onSearch() {
  load(1);
}

/** Debounce free-typing by 400 ms so we don't fire on every keystroke */
function onSearchChange() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => load(1), 400);
}

function onTypeChange() {
  load(1);
}
function onPageChange(page: number) {
  load(page);
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
const viewSource = (id: number) => router.push(`/source/${id}`);
const goToUpload = () => router.push("/source/upload");
const goToUrlCreate = () => router.push("/source/new-url");

async function deleteSource(id: number) {
  const success = await sourceStore.deleteSource(id);
  if (success) {
    message.success("Source deleted");
    // Re-fetch the current page; if it is now empty, fall back to page 1
    const targetPage =
      sourceStore.sources.length === 0 && sourceStore.pagination.page > 1
        ? sourceStore.pagination.page - 1
        : sourceStore.pagination.page;
    load(targetPage);
  } else {
    message.error("Delete failed");
  }
}

onMounted(() => load());
</script>
