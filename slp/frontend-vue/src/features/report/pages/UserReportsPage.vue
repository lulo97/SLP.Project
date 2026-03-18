<template>
  <MobileLayout title="My Reports">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <a-spin size="large" />
    </div>

    <!-- Error -->
    <a-alert
      v-else-if="error"
      type="error"
      :message="error"
      show-icon
      class="mb-4"
    />

    <!-- Empty -->
    <a-empty
      v-else-if="reports.length === 0"
      description="You haven't submitted any reports yet."
      class="mt-12"
    />

    <!-- List -->
    <div v-else class="space-y-3">
      <a-card
        v-for="report in reports"
        :key="report.id"
        class="shadow-sm"
        :bodyStyle="{ padding: '14px 16px' }"
      >
        <div class="flex items-start justify-between gap-3">
          <!-- Left: info -->
          <div class="min-w-0 flex-1 space-y-1">
            <!-- Target badge + type -->
            <div class="flex items-center gap-2 flex-wrap">
              <a-tag :color="targetColor(report.targetType)" class="capitalize text-xs m-0">
                {{ report.targetType }}
              </a-tag>
              <span class="text-xs text-gray-400">#{{ report.targetId }}</span>
              <a-tag
                :color="report.resolved ? 'success' : 'warning'"
                class="text-xs m-0"
              >
                {{ report.resolved ? 'Resolved' : 'Pending' }}
              </a-tag>
            </div>

            <!-- Reason -->
            <p class="text-sm text-gray-700 break-words">{{ report.reason }}</p>

            <!-- Timestamps -->
            <div class="flex flex-wrap gap-x-4 text-xs text-gray-400">
              <span>Submitted {{ formatDate(report.createdAt) }}</span>
              <span v-if="report.resolvedAt">
                Resolved {{ formatDate(report.resolvedAt) }}
              </span>
            </div>
          </div>

          <!-- Right: delete button (only if pending) -->
          <a-popconfirm
            v-if="!report.resolved"
            title="Delete this report?"
            ok-text="Delete"
            ok-type="danger"
            cancel-text="Cancel"
            @confirm="handleDelete(report.id)"
          >
            <a-button
              type="text"
              danger
              size="small"
              :loading="deletingId === report.id"
              class="flex-shrink-0 mt-0.5"
            >
              <template #icon><Trash2 :size="15" /></template>
            </a-button>
          </a-popconfirm>
        </div>
      </a-card>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Card, Tag, Button, Spin, Alert, Empty, Popconfirm, message,
} from 'ant-design-vue';
import { Trash2 } from 'lucide-vue-next';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { reportApi } from '../api/reportApi';
import type { ReportDto } from '../types';

const ACard        = Card;
const ATag         = Tag;
const AButton      = Button;
const ASpin        = Spin;
const AAlert       = Alert;
const AEmpty       = Empty;
const APopconfirm  = Popconfirm;

// ── State ─────────────────────────────────────────────────────────────────────
const reports   = ref<ReportDto[]>([]);
const loading   = ref(false);
const error     = ref<string | null>(null);
const deletingId = ref<number | null>(null);

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchReports() {
  loading.value = true;
  error.value   = null;
  try {
    reports.value = await reportApi.getMyReports();
  } catch {
    error.value = 'Failed to load reports. Please try again.';
  } finally {
    loading.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleDelete(id: number) {
  deletingId.value = id;
  try {
    await reportApi.deleteMyReport(id);
    reports.value = reports.value.filter(r => r.id !== id);
    message.success('Report deleted.');
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 409) {
      message.error('Cannot delete a resolved report.');
    } else {
      message.error('Failed to delete report. Please try again.');
    }
  } finally {
    deletingId.value = null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const TARGET_COLORS: Record<string, string> = {
  quiz:     'blue',
  question: 'purple',
  comment:  'orange',
};

function targetColor(type: string): string {
  return TARGET_COLORS[type] ?? 'default';
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(fetchReports);
</script>