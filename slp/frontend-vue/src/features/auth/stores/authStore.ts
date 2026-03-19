import { defineStore } from "pinia";
import apiClient from "@/lib/api/client";

interface LoginResponse {
  token: string;
  userId: string;
  email: string;
}

interface UserApiResponse {
  id: number;
  username: string;
  email: string;
  emailConfirmed: boolean;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  avatarFilename: string | null;
}

interface User {
  id: number;
  username: string;
  email: string;
  emailConfirmed: boolean;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  avatarFilename: string | null;
  avatarUrl: string | undefined; // computed from avatarFilename, never from API
}

function buildAvatarUrl(
  filename: string | null | undefined,
): string | undefined {
  if (!filename) return undefined;
  const base = import.meta.env.VITE_FILESTORAGE_URL as string;
  return `${base}/files/${filename}`;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as User | null,
    sessionToken: localStorage.getItem("session_token"),
    loading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.sessionToken,
    isAdmin: (state) => {
      const output = state.user?.role === "admin";
      console.log(output);
      return output;
    },
    isEmailVerified: (state) => state.user?.emailConfirmed || false,
  },

  actions: {
    async login(username: string, password: string) {
      this.loading = true;
      this.error = null;

      try {
        const response = await apiClient.post<LoginResponse>("/auth/login", {
          username,
          password,
        });

        const { token, userId } = response.data;
        this.sessionToken = token;
        localStorage.setItem("session_token", token);
        localStorage.setItem("user_id", userId);

        await this.fetchCurrentUser();
        return { success: true };
      } catch (error: any) {
        const errorData = error.response?.data;
        this.error = errorData?.message || "Login failed";
        return {
          success: false,
          code: errorData?.code,
          message: this.error,
        };
      } finally {
        this.loading = false;
      }
    },

    async register(username: string, email: string, password: string) {
      this.loading = true;
      this.error = null;

      try {
        await apiClient.post("/auth/register", {
          username,
          email,
          password,
        });
        return true;
      } catch (error: any) {
        this.error = error.response?.data?.message || "Registration failed";
        return false;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        await apiClient.post("/auth/logout");
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        this.sessionToken = null;
        this.user = null;
        localStorage.removeItem("session_token");
        localStorage.removeItem("user_id");
      }
    },

    async fetchCurrentUser() {
      try {
        const response = await apiClient.get<UserApiResponse>("/users/me");
        const raw = response.data;
        // avatarFilename comes from the API; avatarUrl is constructed here
        this.user = {
          ...raw,
          avatarUrl: buildAvatarUrl(raw.avatarFilename),
        };
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    },

    async updateProfile(name: string, avatarUrl: string) {
      this.loading = true;
      this.error = null;

      try {
        const response = await apiClient.put<UserApiResponse>("/users/me", {
          name,
          avatarUrl,
        });
        const raw = response.data;
        this.user = {
          ...raw,
          avatarUrl: buildAvatarUrl(raw.avatarFilename),
        };
        return true;
      } catch (error: any) {
        this.error = error.response?.data?.message || "Update failed";
        return false;
      } finally {
        this.loading = false;
      }
    },

    async requestPasswordReset(email: string) {
      try {
        await apiClient.post("/auth/forgot-password", { email }); // changed
        return true;
      } catch (error) {
        return false;
      }
    },

    async confirmPasswordReset(token: string, newPassword: string) {
      try {
        await apiClient.post("/auth/reset-password", {
          // changed
          token,
          newPassword,
        });
        return true;
      } catch (error) {
        return false;
      }
    },

    async verifyEmail(token: string) {
      try {
        await apiClient.post("/auth/verify-email", { token });
        if (this.user) {
          this.user.emailConfirmed = true;
        }
        return true;
      } catch (error) {
        return false;
      }
    },

    async sendVerificationEmail() {
      try {
        await apiClient.post("/auth/resend-verification"); // changed from /users/me/verify-email/send
        return true;
      } catch (error) {
        return false;
      }
    },

    clearError() {
      this.error = null;
    },

    async fetchUserIfNeeded() {
      if (this.user) return this.user;
      if (!this.sessionToken) return null;
      try {
        await this.fetchCurrentUser();
        return this.user;
      } catch {
        return null;
      }
    },
  },
});
