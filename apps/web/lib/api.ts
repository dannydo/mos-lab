import axios from 'axios';
import { safeStorage } from './safe-storage';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto attach token if available in storage (client-side only)
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = safeStorage.getItem('mos_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        safeStorage.removeItem('mos_token');
        safeStorage.removeItem('mos_user');
        safeStorage.removeItem('mos_omicall_auto_init');
        safeStorage.removeItem('mos_original_token');
        safeStorage.removeItem('mos_original_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
