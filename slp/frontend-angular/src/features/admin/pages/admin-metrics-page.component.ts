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
    <div>
      <div class="space-y-4">
        <nz-card [nzBodyStyle]="{ padding: '12px 16px' }">
          <div class="controls-row">
            <div class="preset-buttons">
              <button
                nz-button
                *ngFor="let preset of PRESETS"
                (click)="applyPreset(preset)"
                [nzType]="
                  activePreset() === preset.label ? 'primary' : 'default'
                "
                nzSize="small"
              >
                {{ preset.label }}
              </button>
            </div>
            <nz-range-picker
              [(ngModel)]="pickerRange"
              [nzShowTime]="true"
              nzFormat="yyyy-MM-dd HH:mm"
              nzSize="small"
              class="range-picker"
              (ngModelChange)="onRangeChange()"
            >
            </nz-range-picker>
            <button
              nz-button
              nzType="primary"
              nzSize="small"
              (click)="loadAll()"
              [nzLoading]="anyLoading()"
            >
              <i nz-icon nzType="sync"></i> Refresh
            </button>
          </div>
        </nz-card>

        <div class="stats-grid">
          <nz-card
            *ngFor="let stat of summaryStats()"
            [nzBodyStyle]="{ padding: '16px' }"
          >
            <div class="stat-inner">
              <div class="stat-icon" [style.background]="stat.bg">
                <i
                  nz-icon
                  [nzType]="stat.icon"
                  nzTheme="outline"
                  [style.color]="stat.color"
                  style="font-size:20px"
                ></i>
              </div>
              <div class="stat-body">
                <p class="stat-label">{{ stat.label }}</p>
                <p class="stat-value" [style.color]="stat.color">
                  {{ stat.value }}
                </p>
                <p class="stat-sub" *ngIf="stat.sub">{{ stat.sub }}</p>
              </div>
            </div>
          </nz-card>
        </div>

        <nz-card title="Requests / min">
          <div
            *ngIf="metricsService.loading().requests"
            class="chart-placeholder"
          >
            <nz-spin></nz-spin>
          </div>
          <div
            *ngIf="
              !metricsService.loading().requests &&
              metricsService.requests().length === 0
            "
            class="chart-empty"
          >
            No data for this period
          </div>
          <canvas
            baseChart
            *ngIf="metricsService.requests().length > 0"
            [data]="requestsChartData()"
            [options]="areaOptions('#4f88ff')"
            [type]="'line'"
          >
          </canvas>
        </nz-card>

        <nz-card title="Errors / min">
          <div
            *ngIf="metricsService.loading().errors"
            class="chart-placeholder"
          >
            <nz-spin></nz-spin>
          </div>
          <div
            *ngIf="
              !metricsService.loading().errors &&
              metricsService.errors().length === 0
            "
            class="chart-empty"
          >
            No data for this period
          </div>
          <canvas
            baseChart
            *ngIf="metricsService.errors().length > 0"
            [data]="errorsChartData()"
            [options]="areaOptions('#ff4d4f')"
            [type]="'line'"
          >
          </canvas>
        </nz-card>

        <nz-card title="Latency (ms)">
          <div
            *ngIf="metricsService.loading().latency"
            class="chart-placeholder"
          >
            <nz-spin></nz-spin>
          </div>
          <div
            *ngIf="
              !metricsService.loading().latency &&
              metricsService.latency().length === 0
            "
            class="chart-empty"
          >
            No data for this period
          </div>
          <canvas
            baseChart
            *ngIf="metricsService.latency().length > 0"
            [data]="latencyChartData()"
            [options]="latencyOptions"
            [type]="'line'"
          >
          </canvas>
        </nz-card>
      </div>
    </div>
  `,
  styles: [
    `
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
        .stats-grid {
          grid-template-columns: repeat(4, 1fr);
        }
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
      .stat-body {
        min-width: 0;
      }
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
      .chart-placeholder,
      .chart-empty {
        height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #bfbfbf;
      }
      canvas {
        display: block;
        height: 200px !important;
        width: 100%;
      }
    `,
  ],
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

  applyPreset(preset: { label: string; hours: number }) {
    this.activePreset.set(preset.label);
    // Use .toDate() here
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

    // Wrap back in dayjs to get ISO strings
    this.metricsService.fetchAll(
      dayjs(from).toISOString(),
      dayjs(to).toISOString(),
    );
  }

  // Chart data helpers
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
