<template>
  <MobileLayout :title="favorite?.text || t('favourite.favouriteDetail')">
    <div
      v-if="store.loading"
      class="flex justify-center py-12"
      data-testid="loading-spinner-container"
    >
      <a-spin />
    </div>

    <div
      v-else-if="favorite"
      class="space-y-4"
      data-testid="favorite-detail-container"
    >
      <div
        class="bg-white rounded-lg p-4 shadow-sm"
        data-testid="favorite-card"
      >
        <div
          class="flex items-center gap-2 mb-2"
          data-testid="favorite-header"
        >
          <h1 class="text-2xl font-semibold" data-testid="favorite-title">
            {{ favorite.text }}
          </h1>
          <a-tag :color="getTypeColor(favorite.type)">{{
            getTypeLabel(favorite.type)
          }}</a-tag>
        </div>

        <p class="text-gray-500 text-sm" data-testid="favorite-created-at">
          {{ t("favourite.createdAt") }}: {{ formatDate(favorite.createdAt) }}
        </p>

        <p
          class="text-gray-500 text-sm mb-4"
          data-testid="favorite-updated-at"
        >
          {{ t("favourite.updatedAt") }}: {{ formatDate(favorite.updatedAt) }}
        </p>

        <div
          v-if="favorite.note"
          class="mt-4"
          data-testid="favorite-note-section"
        >
          <h3 class="font-semibold mb-2" data-testid="favorite-note-title">
            {{ t("favourite.note") }}:
          </h3>
          <p class="whitespace-pre-wrap" data-testid="favorite-note-content">
            {{ favorite.note }}
          </p>
        </div>
      </div>

      <div class="flex justify-end space-x-2" data-testid="favorite-actions">
        <a-button @click="router.push(`/favourites/${favorite.id}/edit`)">
          <Edit :size="16" class="mr-1" />
          {{ t("common.edit") }}
        </a-button>
        <a-popconfirm
          :title="t('common.confirm')"
          :ok-text="t('common.delete')"
          :cancel-text="t('common.cancel')"
          @confirm="deleteFavorite"
        >
          <a-button danger>
            <Trash2 :size="16" class="mr-1" />
            {{ t("common.delete") }}
          </a-button>
        </a-popconfirm>
      </div>
    </div>

    <a-empty v-else :description="t('favourite.notFound')" />
  </MobileLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import { Edit, Trash2 } from "lucide-vue-next";
import { useFavoriteStore } from "../stores/favouriteStore";
import MobileLayout from "@/layouts/MobileLayout.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const store = useFavoriteStore();

const favoriteId = Number(route.params.id);
const favorite = computed(() => store.currentFavorite);

onMounted(async () => {
  if (favoriteId) {
    await store.fetchFavoriteById(favoriteId);
    if (!store.currentFavorite) {
      message.error(t("favourite.notFound"));
      router.push("/favourites");
    }
  }
});

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    word: "blue",
    phrase: "green",
    idiom: "orange",
    other: "default",
  };
  return colors[type] || "default";
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    word: t("favourite.typeWord"),
    phrase: t("favourite.typePhrase"),
    idiom: t("favourite.typeIdiom"),
    other: t("favourite.typeOther"),
  };
  return labels[type] || type;
}

async function deleteFavorite() {
  try {
    await store.deleteFavorite(favoriteId);
    message.success(t("favourite.deleteSuccess"));
    router.push("/favourites");
  } catch (err) {
    message.error(t("favourite.deleteError"));
  }
}
</script>
