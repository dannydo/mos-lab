import axios from 'axios';
import { safeStorage } from './safe-storage';
import { recordApiFailure } from './bug-diagnostics';

function isPrivateLanHostname(hostname: string): boolean {
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl;

  if (typeof window !== 'undefined' && isPrivateLanHostname(window.location.hostname)) {
    return '/api';
  }

  return 'http://localhost:4001/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto attach token if available in storage (client-side only)
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = safeStorage.getItem('mos_token');
      if (token && !config.headers.Authorization) {
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
    recordApiFailure(error);
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        const originalToken = safeStorage.getItem('mos_original_token');
        const originalUser = safeStorage.getItem('mos_original_user');
        if (originalToken && originalUser) {
          const originalOmicallAutoInit = safeStorage.getItem('mos_original_omicall_auto_init');
          safeStorage.setItem('mos_token', originalToken);
          safeStorage.setItem('mos_user', originalUser);
          if (originalOmicallAutoInit !== null) {
            safeStorage.setItem('mos_omicall_auto_init', originalOmicallAutoInit);
          } else {
            safeStorage.removeItem('mos_omicall_auto_init');
          }
          safeStorage.removeItem('mos_original_token');
          safeStorage.removeItem('mos_original_user');
          safeStorage.removeItem('mos_original_omicall_auto_init');
          safeStorage.removeItem('mos_impersonation_audit_id');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/dashboard/staff';
          }
          return Promise.reject(error);
        }
        safeStorage.removeItem('mos_token');
        safeStorage.removeItem('mos_user');
        safeStorage.removeItem('mos_omicall_auto_init');
        safeStorage.removeItem('mos_original_token');
        safeStorage.removeItem('mos_original_user');
        safeStorage.removeItem('mos_original_omicall_auto_init');
        safeStorage.removeItem('mos_impersonation_audit_id');
        if (
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/academy/workshops/')
        ) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
