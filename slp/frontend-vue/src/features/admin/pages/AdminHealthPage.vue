<template>
  <MobileLayout title="Service Health">
    <div class="space-y-4">
      <a-card data-testid="health-card">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">System Services</h2>
          <a-button
            type="primary"
            @click="refresh"
            :loading="loading"
            data-testid="refresh-button"
          >
            Refresh
          </a-button>
        </div>
        <a-table
          :columns="columns"
          :data-source="services"
          :pagination="false"
          :loading="loading"
          row-key="name"
          data-testid="services-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">
                {{ record.status }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'responseTimeMs'">
              {{ record.responseTimeMs }} ms
            </template>
          </template>
        </a-table>
        <div class="mt-4 text-xs text-gray-500" data-testid="last-updated">
          Last updated:
          {{ timestamp ? new Date(timestamp).toLocaleString() : "—" }}
        </div>
      </a-card>
    </div>
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "ant-design-vue";
import MobileLayout from "@/layouts/MobileLayout.vue";
import apiClient from "@/lib/api/client";

interface ServiceHealth {
  name: string;
  status: string;
  details?: string;
  responseTimeMs: number;
}

const loading = ref(false);
const services = ref<ServiceHealth[]>([]);
const timestamp = ref<string | null>(null);

const columns = [
  { title: "Service", dataIndex: "name", key: "name" },
  { title: "Status", dataIndex: "status", key: "status" },
  { title: "Details", dataIndex: "details", key: "details", ellipsis: true },
  {
    title: "Response Time",
    dataIndex: "responseTimeMs",
    key: "responseTimeMs",
  },
];

const statusColor = (status: string) => {
  switch (status) {
    case "Healthy":
      return "green";
    case "Degraded":
      return "orange";
    default:
      return "red";
  }
};

const fetchHealth = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get("/HealthDashboard/services");
    services.value = response.data.services;
    timestamp.value = response.data.timestamp;
  } catch (error) {
    message.error("Failed to load health status");
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const refresh = () => {
  fetchHealth();
};

onMounted(() => {
  fetchHealth();
});
</script>
