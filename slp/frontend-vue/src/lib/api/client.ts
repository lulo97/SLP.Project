import axios from 'axios';
import router from '@/router'; // import the router instance

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add session token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers['X-Session-Token'] = token;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // List of public endpoints that may return 401 but should not trigger logout
      const publicEndpoints = [
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/verify-email',
      ];
      
      // If the request was to a public endpoint, let the component handle the error
      if (publicEndpoints.some(endpoint => url.includes(endpoint))) {
        return Promise.reject(error);
      }

      // Otherwise, token is invalid/expired – clear storage and redirect to login
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_id');
      
      // Use Vue Router for a smooth client‑side navigation (no full reload)
      router.push('/login');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;