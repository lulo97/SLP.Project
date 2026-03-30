<template>
  <div class="log-filters">
    <!-- Action select -->
    <a-select
      v-model:value="filters.action"
      placeholder="Action"
      allow-clear
      style="width: 150px"
      data-testid="log-filter-action"
    >
      <a-select-option
        value="ban_user"
        data-testid="log-filter-action-option-ban_user"
      >
        ban_user
      </a-select-option>
      <a-select-option
        value="unban_user"
        data-testid="log-filter-action-option-unban_user"
      >
        unban_user
      </a-select-option>
      <a-select-option
        value="disable_quiz"
        data-testid="log-filter-action-option-disable_quiz"
      >
        disable_quiz
      </a-select-option>
      <a-select-option
        value="enable_quiz"
        data-testid="log-filter-action-option-enable_quiz"
      >
        enable_quiz
      </a-select-option>
      <a-select-option
        value="delete_comment"
        data-testid="log-filter-action-option-delete_comment"
      >
        delete_comment
      </a-select-option>
      <a-select-option
        value="restore_comment"
        data-testid="log-filter-action-option-restore_comment"
      >
        restore_comment
      </a-select-option>
    </a-select>

    <!-- Target type select -->
    <a-select
      v-model:value="filters.targetType"
      placeholder="Target type"
      allow-clear
      style="width: 120px"
      data-testid="log-filter-target-type"
    >
      <a-select-option
        value="user"
        data-testid="log-filter-target-type-option-user"
      >
        user
      </a-select-option>
      <a-select-option
        value="quiz"
        data-testid="log-filter-target-type-option-quiz"
      >
        quiz
      </a-select-option>
      <a-select-option
        value="comment"
        data-testid="log-filter-target-type-option-comment"
      >
        comment
      </a-select-option>
    </a-select>

    <!-- Date range picker -->
    <a-range-picker
      v-model:value="filters.dateRange"
      show-time
      format="YYYY-MM-DD HH:mm"
      placeholder="From – To"
      style="width: 280px"
      data-testid="log-filter-date-range"
    />

    <!-- Free‑text search -->
    <a-input-search
      v-model:value="filters.search"
      placeholder="Search by admin, action, target ID, details..."
      style="width: 240px"
      @search="applyFilters"
      data-testid="log-filter-search"
    />

    <!-- Apply button -->
    <a-button
      type="primary"
      @click="applyFilters"
      data-testid="log-apply-filters"
    >
      Apply
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import type { Dayjs } from "dayjs";

const emit = defineEmits<{
  (e: "apply", filters: any): void;
}>();

const filters = reactive({
  action: null as string | null,
  targetType: null as string | null,
  dateRange: null as [Dayjs, Dayjs] | null,
  search: "",
});

function applyFilters() {
  const params: any = {
    action: filters.action,
    targetType: filters.targetType,
    search: filters.search || undefined,
  };
  if (filters.dateRange) {
    params.from = filters.dateRange[0].toISOString();
    params.to = filters.dateRange[1].toISOString();
  }
  emit("apply", params);
}
</script>

<style scoped>
.log-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}
@media (max-width: 768px) {
  .log-filters > * {
    width: 100% !important;
  }
}
</style>
