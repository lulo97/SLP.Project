<template>
  <MobileLayout title="API Metrics">
    <div class="metrics-page space-y-4">

      <!-- ── Time Range Controls ─────────────────────────────────────── -->
      <a-card :bodyStyle="{ padding: '12px 16px' }">
        <div class="controls-row">
          <div class="preset-buttons">
            <a-button
              v-for="preset in PRESETS"
              :key="preset.label"
              :type="activePreset === preset.label ? 'primary' : 'default'"
              size="small"
              @click="applyPreset(preset)"
            >
              {{ preset.label }}
            </a-button>
          </div>

          <a-range-picker
            v-model:value="pickerRange"
            show-time
            :format="'YYYY-MM-DD HH:mm'"
            size="small"
            :allow-clear="false"
            class="range-picker"
            @change="onRangeChange"
          />

          <a-button
            type="primary"
            size="small"
            :loading="anyLoading"
            @click="loadAll"
          >
            <template #icon><ReloadOutlined /></template>
            Refresh
          </a-button>
        </div>
      </a-card>

      <!-- ── Summary Stats ───────────────────────────────────────────── -->
      <div class="stats-grid">
        <a-card
          v-for="stat in summaryStats"
          :key="stat.label"
          :bodyStyle="{ padding: '16px' }"
        >
          <div class="stat-inner">
            <div class="stat-icon" :style="{ background: stat.bg }">
              <component :is="stat.icon" :size="20" :style="{ color: stat.color }" />
            </div>
            <div class="stat-body">
              <p class="stat-label">{{ stat.label }}</p>
              <p class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</p>
              <p v-if="stat.sub" class="stat-sub">{{ stat.sub }}</p>
            </div>
          </div>
        </a-card>
      </div>

      <!-- ── Requests Chart ──────────────────────────────────────────── -->
      <a-card title="Requests / min" :bodyStyle="{ padding: '8px 16px 16px' }">
        <div v-if="metricsStore.loading.requests" class="chart-placeholder">
          <a-spin />
        </div>
        <div v-else-if="metricsStore.requests.length === 0" class="chart-empty">
          No data for this period
        </div>
        <Line v-else :data="requestsChartData" :options="areaOptions('#4f88ff')" class="chart-canvas" />
      </a-card>

      <!-- ── Errors Chart ────────────────────────────────────────────── -->
      <a-card title="Errors / min" :bodyStyle="{ padding: '8px 16px 16px' }">
        <div v-if="metricsStore.loading.errors" class="chart-placeholder">
          <a-spin />
        </div>
        <div v-else-if="metricsStore.errors.length === 0" class="chart-empty">
          No data for this period
        </div>
        <Line v-else :data="errorsChartData" :options="areaOptions('#ff4d4f')" class="chart-canvas" />
      </a-card>

      <!-- ── Latency Chart ───────────────────────────────────────────── -->
      <a-card title="Latency (ms)" :bodyStyle="{ padding: '8px 16px 16px' }">
        <div v-if="metricsStore.loading.latency" class="chart-placeholder">
          <a-spin />
        </div>
        <div v-else-if="metricsStore.latency.length === 0" class="chart-empty">
          No data for this period
        </div>
        <Line v-else :data="latencyChartData" :options="latencyOptions" class="chart-canvas" />
      </a-card>

    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import dayjs, { type Dayjs } from 'dayjs';
import { Spin, Button, Card, DatePicker } from 'ant-design-vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { Activity, AlertCircle, Clock, TrendingUp } from 'lucide-vue-next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'vue-chartjs';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { useMetricsStore } from '../stores/metricsStore';

// Register Chart.js modules once
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const ARangePicker = DatePicker.RangePicker;
const ACard = Card;
const AButton = Button;
const ASpin = Spin;

// ── Store ────────────────────────────────────────────────────────────────────
const metricsStore = useMetricsStore();

// ── Time Range ───────────────────────────────────────────────────────────────
type RangeValue = [Dayjs, Dayjs];

const PRESETS = [
  { label: 'Last 1h',  hours: 1  },
  { label: 'Last 6h',  hours: 6  },
  { label: 'Last 24h', hours: 24 },
] as const;

const activePreset = ref<string>('Last 1h');
const pickerRange  = ref<RangeValue>([dayjs().subtract(1, 'hour'), dayjs()]);

function applyPreset(preset: { label: string; hours: number }) {
  activePreset.value = preset.label;
  pickerRange.value  = [dayjs().subtract(preset.hours, 'hour'), dayjs()];
  loadAll();
}

function onRangeChange(val: [Dayjs, Dayjs] | [string, string] | null) {
  if (!val) return;
  const [start, end] = val as [Dayjs, Dayjs];
  if (!start?.isValid?.() || !end?.isValid?.()) return;
  activePreset.value = '';
  pickerRange.value  = [start, end];
  loadAll();
}

// ── Data Loading ──────────────────────────────────────────────────────────────
const anyLoading = computed(
  () => metricsStore.loading.requests || metricsStore.loading.errors || metricsStore.loading.latency,
);

function loadAll() {
  const [from, to] = pickerRange.value;
  metricsStore.fetchAll(from.toISOString(), to.toISOString());
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
function formatTs(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Chart data ────────────────────────────────────────────────────────────────
const requestsChartData = computed(() => ({
  labels: metricsStore.requests.map((p) => formatTs(p.timestamp)),
  datasets: [
    {
      label: 'Requests',
      data: metricsStore.requests.map((p) => p.value),
      borderColor: '#4f88ff',
      backgroundColor: hexToRgba('#4f88ff', 0.15),
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.4,
      fill: true,
    },
  ],
}));

const errorsChartData = computed(() => ({
  labels: metricsStore.errors.map((p) => formatTs(p.timestamp)),
  datasets: [
    {
      label: 'Errors',
      data: metricsStore.errors.map((p) => p.value),
      borderColor: '#ff4d4f',
      backgroundColor: hexToRgba('#ff4d4f', 0.12),
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.4,
      fill: true,
    },
  ],
}));

const latencyChartData = computed(() => ({
  labels: metricsStore.latency.map((p) => formatTs(p.timestamp)),
  datasets: [
    {
      label: 'Avg',
      data: metricsStore.latency.map((p) => p.avg ?? null),
      borderColor: '#52c41a',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.4,
      fill: false,
    },
    {
      label: 'p95',
      data: metricsStore.latency.map((p) => p.p95 ?? null),
      borderColor: '#fa8c16',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.4,
      fill: false,
    },
  ],
}));

// ── Chart options ─────────────────────────────────────────────────────────────
function areaOptions(_color: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#999', font: { size: 11 }, maxTicksLimit: 8 },
        grid: { color: '#f0f0f0' },
      },
      y: {
        ticks: { color: '#999', font: { size: 11 } },
        grid: { color: '#f0f0f0' },
        beginAtZero: true,
      },
    },
  } as const;
}

const latencyOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: { boxWidth: 12, font: { size: 12 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)} ms`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#999', font: { size: 11 }, maxTicksLimit: 8 },
      grid: { color: '#f0f0f0' },
    },
    y: {
      ticks: { color: '#999', font: { size: 11 }, callback: (v: any) => `${v} ms` },
      grid: { color: '#f0f0f0' },
      beginAtZero: true,
    },
  },
} as const;

// ── Summary Stats ─────────────────────────────────────────────────────────────
const summaryStats = computed(() => [
  {
    label: 'Total Requests',
    value: metricsStore.totalRequests.toLocaleString(),
    sub: 'in selected range',
    icon: Activity,
    color: '#4f88ff',
    bg: '#eff4ff',
  },
  {
    label: 'Total Errors',
    value: metricsStore.totalErrors.toLocaleString(),
    sub: `${metricsStore.errorRate}% error rate`,
    icon: AlertCircle,
    color: '#ff4d4f',
    bg: '#fff1f0',
  },
  {
    label: 'Avg Latency',
    value: metricsStore.avgLatency === '—' ? '—' : `${metricsStore.avgLatency} ms`,
    sub: 'mean across buckets',
    icon: Clock,
    color: '#52c41a',
    bg: '#f6ffed',
  },
  {
    label: 'p95 Latency',
    value: metricsStore.p95Latency === '—' ? '—' : `${metricsStore.p95Latency} ms`,
    sub: '95th percentile',
    icon: TrendingUp,
    color: '#fa8c16',
    bg: '#fff7e6',
  },
]);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
loadAll();
</script>

<style scoped>
.controls-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.preset-buttons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.range-picker {
  flex: 1;
  min-width: 240px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 768px) {
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
}

.stat-inner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-body { min-width: 0; }
.stat-label {
  font-size: 12px;
  color: #8c8c8c;
  margin: 0 0 2px;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 2px;
}
.stat-sub {
  font-size: 11px;
  color: #bfbfbf;
  margin: 0;
}

/* Force a fixed height so Chart.js can size itself */
.chart-canvas {
  height: 200px !important;
}

.chart-placeholder,
.chart-empty {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  font-size: 13px;
}
</style>