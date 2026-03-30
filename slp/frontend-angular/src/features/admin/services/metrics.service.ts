import { Injectable, signal, inject, computed } from '@angular/core';
import { ApiClientService } from '../../../services/api-client.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { MetricPoint, LatencyPoint } from '../types/metrics.types';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private api = inject(ApiClientService);
  private message = inject(NzMessageService);

  // State signals
  requests = signal<MetricPoint[]>([]);
  errors = signal<MetricPoint[]>([]);
  latency = signal<LatencyPoint[]>([]);

  loading = signal({
    requests: false,
    errors: false,
    latency: false,
  });

  // Computed getters
  totalRequests = computed(() => this.requests().reduce((sum, p) => sum + p.value, 0));
  totalErrors = computed(() => this.errors().reduce((sum, p) => sum + p.value, 0));
  errorRate = computed(() => {
    const reqs = this.totalRequests();
    const errs = this.totalErrors();
    if (reqs === 0) return '0.00';
    return ((errs / reqs) * 100).toFixed(2);
  });
  avgLatency = computed(() => {
    const valid = this.latency().filter(p => p.avg !== null);
    if (valid.length === 0) return '—';
    const sum = valid.reduce((s, p) => s + (p.avg ?? 0), 0);
    return (sum / valid.length).toFixed(1);
  });
  p95Latency = computed(() => {
    const valid = this.latency().filter(p => p.p95 !== null);
    if (valid.length === 0) return '—';
    const sum = valid.reduce((s, p) => s + (p.p95 ?? 0), 0);
    return (sum / valid.length).toFixed(1);
  });

  async fetchAll(from: string, to: string) {
    await Promise.all([
      this.fetchRequests(from, to),
      this.fetchErrors(from, to),
      this.fetchLatency(from, to),
    ]);
  }

  async fetchRequests(from: string, to: string) {
    this.loading.update(l => ({ ...l, requests: true }));
    try {
      const data = await this.api.get<MetricPoint[]>('/admin/metrics/requests', { params: { from, to } }).toPromise();
      this.requests.set(data || []);
    } catch {
      this.message.error('Failed to load request metrics');
    } finally {
      this.loading.update(l => ({ ...l, requests: false }));
    }
  }

  async fetchErrors(from: string, to: string) {
    this.loading.update(l => ({ ...l, errors: true }));
    try {
      const data = await this.api.get<MetricPoint[]>('/admin/metrics/errors', { params: { from, to } }).toPromise();
      this.errors.set(data || []);
    } catch {
      this.message.error('Failed to load error metrics');
    } finally {
      this.loading.update(l => ({ ...l, errors: false }));
    }
  }

  async fetchLatency(from: string, to: string) {
    this.loading.update(l => ({ ...l, latency: true }));
    try {
      const data = await this.api.get<LatencyPoint[]>('/admin/metrics/latency', { params: { from, to } }).toPromise();
      this.latency.set(data || []);
    } catch {
      this.message.error('Failed to load latency metrics');
    } finally {
      this.loading.update(l => ({ ...l, latency: false }));
    }
  }
}