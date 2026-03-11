import { defineStore } from 'pinia';
import apiClient from '../api/client';
import { useAuthStore } from './auth';

interface User {
  id: number;
  username: string;
  email: string;
  emailConfirmed: boolean;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [] as User[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async deleteUser(userId: number) {
      const authStore = useAuthStore();
      if (!authStore.isAdmin) {
        this.error = 'Admin access required';
        return false;
      }

      this.loading = true;
      this.error = null;

      try {
        await apiClient.delete(`/users/${userId}`);
        this.users = this.users.filter(u => u.id !== userId);
        return true;
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Delete failed';
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Note: This is a placeholder since your API doesn't have a GET /users endpoint
    // You might need to add this endpoint to your backend
    async fetchAllUsers() {
      const authStore = useAuthStore();
      if (!authStore.isAdmin) return;

      this.loading = true;
      try {
        // This endpoint doesn't exist in your current API
        // You'll need to add it or modify this code
        const response = await apiClient.get<User[]>('/users');
        this.users = response.data;
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});