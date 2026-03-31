import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { BaseChartDirective } from "ng2-charts";
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDatePickerModule } from "ng-zorro-antd/date-picker";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzGridModule } from "ng-zorro-antd/grid";
import { MetricsService } from "../services/metrics.service";
import dayjs, { Dayjs } from "dayjs";
import { NzIconModule } from "ng-zorro-antd/icon";

@Component({
  selector: "app-admin-metrics-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    NzCardModule,
    NzButtonModule,
    NzDatePickerModule,
    NzSpinModule,
    NzGridModule,
    NzIconModule,
  ],
  template: `
    <div data-testid="metrics-layout" class="p-4 bg-gray-50 min-h-screen">
      <div data-testid="metrics-container" class="max-w-7xl mx-auto space-y-6">
        <nz-card
          data-testid="metrics-time-range-card"
          [nzBodyStyle]="{ padding: '12px 16px' }"
          class="shadow-sm border-gray-200"
        >
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex gap-1 shrink-0" data-testid="metrics-preset-group">
              <button
                nz-button
                *ngFor="let preset of PRESETS"
                (click)="applyPreset(preset)"
                [nzType]="
                  activePreset() === preset.label ? 'primary' : 'default'
                "
                nzSize="small"
                [attr.data-testid]="'preset-' + slugify(preset.label)"
                class="rounded"
              >
                {{ preset.label }}
              </button>
            </div>

            <nz-range-picker
              [(ngModel)]="pickerRange"
              [nzShowTime]="true"
              nzFormat="yyyy-MM-dd HH:mm"
              nzSize="small"
              class="flex-1 min-w-[280px]"
              (ngModelChange)="onRangeChange()"
              data-testid="metrics-range-picker"
            >
            </nz-range-picker>

            <button
              nz-button
              nzType="primary"
              nzSize="small"
              data-testid="metrics-refresh-button"
              (click)="loadAll()"
              [nzLoading]="anyLoading()"
              class="flex items-center gap-1"
            >
              <i nz-icon nzType="sync"></i> Refresh
            </button>
          </div>
        </nz-card>

        <div
          class="grid grid-cols-2 md:grid-cols-4 gap-4"
          data-testid="metrics-stats-grid"
        >
          <nz-card
            *ngFor="let stat of summaryStats()"
            [attr.data-testid]="'stat-card-' + slugify(stat.label)"
            [nzBodyStyle]="{ padding: '16px' }"
            class="shadow-sm border-gray-100"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                [style.background]="stat.bg"
              >
                <i
                  nz-icon
                  [nzType]="stat.icon"
                  nzTheme="outline"
                  [style.color]="stat.color"
                  class="text-xl"
                ></i>
              </div>
              <div class="min-w-0">
                <p
                  class="text-xs text-gray-500 mb-0.5"
                  [attr.data-testid]="'stat-label-' + slugify(stat.label)"
                >
                  {{ stat.label }}
                </p>
                <p
                  class="text-2xl font-bold leading-tight mb-0.5"
                  [style.color]="stat.color"
                  [attr.data-testid]="'stat-value-' + slugify(stat.label)"
                >
                  {{ stat.value }}
                </p>
                <p class="text-[11px] text-gray-400 truncate" *ngIf="stat.sub">
                  {{ stat.sub }}
                </p>
              </div>
            </div>
          </nz-card>
        </div>

        <div class="grid grid-cols-1 gap-6">
          <nz-card
            data-testid="chart-card-requests"
            title="Requests / min"
            class="shadow-sm"
          >
            <div
              *ngIf="metricsService.loading().requests"
              class="h-[200px] flex items-center justify-center"
            >
              <nz-spin></nz-spin>
            </div>
            <div
              *ngIf="
                !metricsService.loading().requests &&
                metricsService.requests().length === 0
              "
              class="h-[200px] flex items-center justify-center text-gray-400"
            >
              No data for this period
            </div>
            <div
              class="h-[200px] w-full"
              *ngIf="metricsService.requests().length > 0"
            >
              <canvas
                baseChart
                [data]="requestsChartData()"
                [options]="areaOptions('#4f88ff')"
                [type]="'line'"
              ></canvas>
            </div>
          </nz-card>

          <nz-card
            data-testid="chart-card-errors"
            title="Errors / min"
            class="shadow-sm"
          >
            <div
              *ngIf="metricsService.loading().errors"
              class="h-[200px] flex items-center justify-center"
            >
              <nz-spin></nz-spin>
            </div>
            <div
              *ngIf="
                !metricsService.loading().errors &&
                metricsService.errors().length === 0
              "
              class="h-[200px] flex items-center justify-center text-gray-400"
            >
              No data for this period
            </div>
            <div
              class="h-[200px] w-full"
              *ngIf="metricsService.errors().length > 0"
            >
              <canvas
                baseChart
                [data]="errorsChartData()"
                [options]="areaOptions('#ff4d4f')"
                [type]="'line'"
              ></canvas>
            </div>
          </nz-card>

          <nz-card
            data-testid="chart-card-latency"
            title="Latency (ms)"
            class="shadow-sm"
          >
            <div
              *ngIf="metricsService.loading().latency"
              class="h-[200px] flex items-center justify-center"
            >
              <nz-spin></nz-spin>
            </div>
            <div
              *ngIf="
                !metricsService.loading().latency &&
                metricsService.latency().length === 0
              "
              class="h-[200px] flex items-center justify-center text-gray-400"
            >
              No data for this period
            </div>
            <div
              class="h-[200px] w-full"
              *ngIf="metricsService.latency().length > 0"
            >
              <canvas
                baseChart
                [data]="latencyChartData()"
                [options]="latencyOptions"
                [type]="'line'"
              ></canvas>
            </div>
          </nz-card>
        </div>
      </div>
    </div>
  `,
  styles: [], // CSS removed in favor of Tailwind
})
export class AdminMetricsPageComponent implements OnInit {
  metricsService = inject(MetricsService);

  PRESETS = [
    { label: "Last 1h", hours: 1 },
    { label: "Last 6h", hours: 6 },
    { label: "Last 24h", hours: 24 },
  ];

  activePreset = signal("Last 1h");
  pickerRange: [Date, Date] = [
    dayjs().subtract(1, "hour").toDate(),
    dayjs().toDate(),
  ];

  ngOnInit() {
    this.loadAll();
  }

  // Fixes the NG5002 parser error
  slugify(text: string): string {
    return text ? text.toLowerCase().split(" ").join("-") : "";
  }

  applyPreset(preset: { label: string; hours: number }) {
    this.activePreset.set(preset.label);
    this.pickerRange = [
      dayjs().subtract(preset.hours, "hour").toDate(),
      dayjs().toDate(),
    ];
    this.loadAll();
  }

  onRangeChange() {
    if (this.pickerRange[0] && this.pickerRange[1]) {
      this.activePreset.set("");
      this.loadAll();
    }
  }

  anyLoading = computed(
    () =>
      this.metricsService.loading().requests ||
      this.metricsService.loading().errors ||
      this.metricsService.loading().latency,
  );

  loadAll() {
    const [from, to] = this.pickerRange;
    if (!from || !to) return;

    this.metricsService.fetchAll(
      dayjs(from).toISOString(),
      dayjs(to).toISOString(),
    );
  }

  private formatTs(ts: string): string {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  requestsChartData = computed(() => ({
    labels: this.metricsService
      .requests()
      .map((p) => this.formatTs(p.timestamp)),
    datasets: [
      {
        label: "Requests",
        data: this.metricsService.requests().map((p) => p.value),
        borderColor: "#4f88ff",
        backgroundColor: this.hexToRgba("#4f88ff", 0.15),
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  }));

  errorsChartData = computed(() => ({
    labels: this.metricsService.errors().map((p) => this.formatTs(p.timestamp)),
    datasets: [
      {
        label: "Errors",
        data: this.metricsService.errors().map((p) => p.value),
        borderColor: "#ff4d4f",
        backgroundColor: this.hexToRgba("#ff4d4f", 0.12),
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  }));

  latencyChartData = computed(() => ({
    labels: this.metricsService
      .latency()
      .map((p) => this.formatTs(p.timestamp)),
    datasets: [
      {
        label: "Avg",
        data: this.metricsService.latency().map((p) => p.avg),
        borderColor: "#52c41a",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        fill: false,
      },
      {
        label: "p95",
        data: this.metricsService.latency().map((p) => p.p95),
        borderColor: "#fa8c16",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        fill: false,
      },
    ],
  }));

  areaOptions(color: string): ChartOptions<"line"> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw}` } },
      },
      scales: {
        x: {
          ticks: { color: "#999", maxTicksLimit: 8 },
          grid: { color: "#f0f0f0" },
        },
        y: {
          ticks: { color: "#999" },
          grid: { color: "#f0f0f0" },
          beginAtZero: true,
        },
      },
    };
  }

  latencyOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { boxWidth: 12, font: { size: 12 } },
      },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} ms` },
      },
    },
    scales: {
      x: {
        ticks: { color: "#999", maxTicksLimit: 8 },
        grid: { color: "#f0f0f0" },
      },
      y: {
        ticks: { color: "#999", callback: (v) => `${v} ms` },
        grid: { color: "#f0f0f0" },
        beginAtZero: true,
      },
    },
  };

  summaryStats = computed(() => [
    {
      label: "Total Requests",
      value: this.metricsService.totalRequests().toLocaleString(),
      sub: "in selected range",
      icon: "dashboard",
      color: "#4f88ff",
      bg: "#eff4ff",
    },
    {
      label: "Total Errors",
      value: this.metricsService.totalErrors().toLocaleString(),
      sub: `${this.metricsService.errorRate()}% error rate`,
      icon: "close-circle",
      color: "#ff4d4f",
      bg: "#fff1f0",
    },
    {
      label: "Avg Latency",
      value:
        this.metricsService.avgLatency() === "—"
          ? "—"
          : `${this.metricsService.avgLatency()} ms`,
      sub: "mean across buckets",
      icon: "clock-circle",
      color: "#52c41a",
      bg: "#f6ffed",
    },
    {
      label: "p95 Latency",
      value:
        this.metricsService.p95Latency() === "—"
          ? "—"
          : `${this.metricsService.p95Latency()} ms`,
      sub: "95th percentile",
      icon: "rise",
      color: "#fa8c16",
      bg: "#fff7e6",
    },
  ]);
}
