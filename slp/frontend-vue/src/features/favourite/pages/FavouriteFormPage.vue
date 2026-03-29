<template>
  <MobileLayout
    :title="isEdit ? t('favourite.editFavourite') : t('favourite.addFavourite')"
  >
    <div class="space-y-4" data-testid="favorite-form-container">
      <a-form layout="vertical">
        <a-form-item :label="t('favourite.text')" required>
          <a-input
            v-model:value="form.text"
            :placeholder="t('favourite.textPlaceholder')"
            :maxlength="255"
            +
            data-testid="favourite-text-input"
          />
        </a-form-item>

        <a-form-item :label="t('favourite.type')">
          <a-select
            v-model:value="form.type"
            :placeholder="t('favourite.typePlaceholder')"
            data-testid="favourite-type-select"
            :dropdown-match-select-width="true"
          >
            <a-select-option value="word">
              <span data-testid="favourite-type-option-word">
                {{ t("favourite.typeWord") }}
              </span>
            </a-select-option>

            <a-select-option value="phrase">
              <span data-testid="favourite-type-option-phrase">
                {{ t("favourite.typePhrase") }}
              </span>
            </a-select-option>

            <a-select-option value="idiom">
              <span data-testid="favourite-type-option-idiom">
                {{ t("favourite.typeIdiom") }}
              </span>
            </a-select-option>

            <a-select-option value="other">
              <span data-testid="favourite-type-option-other">
                {{ t("favourite.typeOther") }}
              </span>
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('favourite.note')">
          <a-textarea
            v-model:value="form.note"
            :placeholder="t('favourite.notePlaceholder')"
            :rows="4"
            +
            data-testid="favourite-note-textarea"
          />
        </a-form-item>

        <a-form-item>
          <div
            class="flex justify-end space-x-2"
            data-testid="form-actions-wrapper"
          >
            <a-button @click="router.back()">{{ t("common.cancel") }}</a-button>
            <a-button
              type="primary"
              @click="handleSubmit"
              :loading="store.loading"
              +
              data-testid="submit-form-button"
            >
              {{ isEdit ? t("common.save") : t("common.create") }}
            </a-button>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import { useFavoriteStore } from "../stores/favouriteStore";
import MobileLayout from "@/layouts/MobileLayout.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const store = useFavoriteStore();

const isEdit = computed(() => !!route.params.id && route.path.includes("edit"));
const favId = computed(() => (isEdit.value ? Number(route.params.id) : null));

const form = ref({
  text: "",
  type: "word",
  note: "",
});

onMounted(async () => {
  if (isEdit.value && favId.value) {
    await store.fetchFavoriteById(favId.value);
    if (store.currentFavorite) {
      form.value.text = store.currentFavorite.text;
      form.value.type = store.currentFavorite.type;
      form.value.note = store.currentFavorite.note || "";
    } else {
      message.error(t("favourite.notFound"));
      router.back();
    }
  }
});

async function handleSubmit() {
  if (!form.value.text.trim()) {
    message.error(t("favourite.textRequired"));
    return;
  }

  try {
    if (isEdit.value && favId.value) {
      await store.updateFavorite(
        favId.value,
        form.value.text.trim(),
        form.value.type,
        form.value.note?.trim() || "",
      );
      message.success(t("favourite.updateSuccess"));
    } else {
      await store.createFavorite(
        form.value.text.trim(),
        form.value.type,
        form.value.note?.trim() || "",
      );
      message.success(t("favourite.createSuccess"));
    }
    router.push("/favourites");
  } catch (err) {
    // error already handled in store
  }
}
</script>
