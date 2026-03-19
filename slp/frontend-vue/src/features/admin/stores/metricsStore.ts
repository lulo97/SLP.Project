import { defineStore } from 'pinia';
import apiClient from '@/lib/api/client';
import { message } from 'ant-design-vue';
import type { MetricPoint, LatencyPoint, MetricsState } from '../types/metrics.types.ts';

export const useMetricsStore = defineStore('metrics', {
  state: (): MetricsState => ({
    requests: [],
    errors: [],
    latency: [],
    loading: {
      requests: false,
      errors: false,
      latency: false,
    },
    error: null,
  }),

  getters: {
    totalRequests: (state): number =>
      state.requests.reduce((sum, p) => sum + p.value, 0),

    totalErrors: (state): number =>
      state.errors.reduce((sum, p) => sum + p.value, 0),

    errorRate: (state): string => {
      const reqs = state.requests.reduce((sum, p) => sum + p.value, 0);
      const errs = state.errors.reduce((sum, p) => sum + p.value, 0);
      if (reqs === 0) return '0.00';
      return ((errs / reqs) * 100).toFixed(2);
    },

    avgLatency: (state): string => {
      const valid = state.latency.filter((p) => p.avg !== null);
      if (valid.length === 0) return '—';
      const sum = valid.reduce((s, p) => s + (p.avg ?? 0), 0);
      return (sum / valid.length).toFixed(1);
    },

    p95Latency: (state): string => {
      const valid = state.latency.filter((p) => p.p95 !== null);
      if (valid.length === 0) return '—';
      const sum = valid.reduce((s, p) => s + (p.p95 ?? 0), 0);
      return (sum / valid.length).toFixed(1);
    },
  },

  actions: {
    async fetchAll(from: string, to: string) {
      await Promise.all([
        this.fetchRequests(from, to),
        this.fetchErrors(from, to),
        this.fetchLatency(from, to),
      ]);
    },

    async fetchRequests(from: string, to: string) {
      this.loading.requests = true;
      try {
        const { data } = await apiClient.get<MetricPoint[]>('/admin/metrics/requests', {
          params: { from, to },
        });
        this.requests = data;
      } catch {
        message.error('Failed to load request metrics');
      } finally {
        this.loading.requests = false;
      }
    },

    async fetchErrors(from: string, to: string) {
      this.loading.errors = true;
      try {
        const { data } = await apiClient.get<MetricPoint[]>('/admin/metrics/errors', {
          params: { from, to },
        });
        this.errors = data;
      } catch {
        message.error('Failed to load error metrics');
      } finally {
        this.loading.errors = false;
      }
    },

    async fetchLatency(from: string, to: string) {
      this.loading.latency = true;
      try {
        const { data } = await apiClient.get<LatencyPoint[]>('/admin/metrics/latency', {
          params: { from, to },
        });
        this.latency = data;
      } catch {
        message.error('Failed to load latency metrics');
      } finally {
        this.loading.latency = false;
      }
    },
  },
});