<template>
  <a-select
    v-model:value="selected"
    mode="tags"
    :placeholder="placeholder"
    :loading="tagStore.loading"
    :options="options"
    :token-separators="[',']"
    :max-tag-count="MAX_TAGS"
    :status="atLimit ? 'warning' : undefined"
    allow-clear
    style="width: 100%"
    data-testid="tag-selector"
    @change="handleChange"
  >
    <template v-if="tagStore.error" #notFoundContent>
      <span
        class="text-red-400 text-xs px-2"
        data-testid="tag-selector-not-found"
        >{{ tagStore.error }}</span
      >
    </template>
  </a-select>

  <div
    v-if="atLimit"
    class="text-yellow-500 text-xs mt-1"
    data-testid="tag-selector-warning"
  >
    Maximum {{ MAX_TAGS }} tags allowed.
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useTagStore } from "@/components/tag/stores/tagStore";

const MAX_TAGS = 10;

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    placeholder?: string;
  }>(),
  { placeholder: "Select or create tags…" },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
}>();

const tagStore = useTagStore();

// Merge existing tags from store with any free-typed values already in modelValue,
// de-duplicated and sorted so the dropdown always shows the union.
const options = computed(() =>
  Array.from(
    new Map(
      [
        ...tagStore.tags.map((t) => ({ value: t.name, label: t.name })),
        ...props.modelValue.map((v) => ({ value: v, label: v })),
      ].map((o) => [o.value.toLowerCase(), o]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label)),
);

const selected = computed<string[]>({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const atLimit = computed(() => props.modelValue.length >= MAX_TAGS);

// Enforce max-10 and de-duplicate on every change
function handleChange(newVal: string[]) {
  // Normalise: trim + lowercase for de-dup comparison, but keep original casing
  const seen = new Set<string>();
  const clean = newVal
    .map((v) => v.trim())
    .filter((v) => {
      if (!v) return false;
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TAGS); // hard cap

  emit("update:modelValue", clean);
}

onMounted(() => tagStore.fetchTags());
</script>
