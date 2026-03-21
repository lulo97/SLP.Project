<template>
  <MobileLayout :title="t('favourite.myFavourites')">
    <div class="space-y-4">
      <!-- Header with create button and search -->
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 class="text-2xl font-semibold">{{ t('favourite.myFavourites') }}</h1>
        <div class="flex gap-2">
          <a-input-search
            v-model:value="searchQuery"
            :placeholder="t('favourite.searchPlaceholder')"
            allow-clear
            @search="handleSearch"
            class="w-48"
          />
          <a-button type="primary" @click="goToCreate">
            <Plus :size="16" class="mr-1" />
            {{ t('favourite.addFavourite') }}
          </a-button>
        </div>
      </div>

      <!-- Loading -->
      <a-spin :spinning="store.loading" tip="Loading...">
        <div class="space-y-3">
          <!-- Empty state -->
          <a-empty v-if="!store.loading && store.favorites.length === 0" :description="t('favourite.noFavourites')">
            <a-button type="primary" @click="goToCreate">{{ t('favourite.addFavourite') }}</a-button>
          </a-empty>

          <!-- Favorite cards -->
          <a-card
            v-for="fav in store.favorites"
            :key="fav.id"
            class="cursor-pointer hover:shadow-md transition-shadow"
            @click="viewFavorite(fav.id)"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold">{{ fav.text }}</h3>
                  <a-tag :color="getTypeColor(fav.type)">{{ getTypeLabel(fav.type) }}</a-tag>
                </div>
                <p v-if="fav.note" class="text-gray-500 text-sm mt-1 line-clamp-2">{{ fav.note }}</p>
                <p class="text-gray-400 text-xs mt-1">{{ formatDate(fav.updatedAt) }}</p>
              </div>
              <div class="flex space-x-2 ml-4">
                <a-button type="text" size="small" @click.stop="editFavorite(fav.id)">
                  <Edit :size="16" />
                </a-button>
                <a-popconfirm
                  :title="t('common.confirm')"
                  :ok-text="t('common.delete')"
                  :cancel-text="t('common.cancel')"
                  @confirm="deleteFavorite(fav.id)"
                >
                  <a-button type="text" danger size="small" @click.stop>
                    <Trash2 :size="16" />
                  </a-button>
                </a-popconfirm>
              </div>
            </div>
          </a-card>

          <!-- Pagination -->
          <div class="flex justify-center mt-4">
            <a-pagination
              :current="store.currentPage"
              :total="store.totalItems"
              :page-size="store.pageSize"
              :show-size-changer="false"
              @change="handlePageChange"
            />
          </div>
        </div>
      </a-spin>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Plus, Edit, Trash2 } from 'lucide-vue-next';
import { message } from 'ant-design-vue';
import { useFavoriteStore } from '../stores/favouriteStore';
import MobileLayout from '@/layouts/MobileLayout.vue';

const { t } = useI18n();
const router = useRouter();
const store = useFavoriteStore();

const searchQuery = ref('');

onMounted(() => {
  store.fetchFavorites(); // fetch first page
});

function handleSearch() {
  store.fetchFavorites(searchQuery.value, 1); // reset to page 1 when searching
}

function handlePageChange(page: number) {
  store.fetchFavorites(searchQuery.value, page);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    word: 'blue',
    phrase: 'green',
    idiom: 'orange',
    other: 'default',
  };
  return colors[type] || 'default';
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    word: t('favourite.typeWord'),
    phrase: t('favourite.typePhrase'),
    idiom: t('favourite.typeIdiom'),
    other: t('favourite.typeOther'),
  };
  return labels[type] || type;
}

function goToCreate() {
  router.push('/favourites/new');
}

function viewFavorite(id: number) {
  router.push(`/favourites/${id}`);
}

function editFavorite(id: number) {
  router.push(`/favourites/${id}/edit`);
}

async function deleteFavorite(id: number) {
  try {
    await store.deleteFavorite(id);
    message.success(t('favourite.deleteSuccess'));
    // After delete, refresh current page (or stay on same page if items remain)
    store.fetchFavorites(searchQuery.value, store.currentPage);
  } catch (err) {
    message.error(t('favourite.deleteError'));
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>