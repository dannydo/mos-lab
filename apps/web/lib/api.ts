import axios from 'axios';
import { safeStorage } from './safe-storage';
import { recordApiFailure } from './bug-diagnostics';
import { recordBreadcrumb, reportFrontendIssue } from './telemetry/frontend-observer';

import { resolveApiBaseUrl } from './api-base-url';
export { resolveApiBaseUrl };

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto attach token if available in storage (client-side only)
api.interceptors.request.use(
  (config) => {
    (config as unknown as Record<string, unknown>)._requestStartTime = Date.now();
    recordBreadcrumb('network', 'api_request', `${(config.method || 'GET').toUpperCase()} ${config.url || ''}`);

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
  (response) => {
    const startTime = (response.config as unknown as Record<string, unknown>)?._requestStartTime as number | undefined;
    const durationMs = startTime ? Date.now() - startTime : undefined;
    recordBreadcrumb(
      'network',
      'api_response',
      `${(response.config.method || 'GET').toUpperCase()} ${response.config.url || ''}`,
      {
        status: response.status,
        durationMs,
      }
    );
    if (durationMs && durationMs > 3000) {
      reportFrontendIssue({
        issueType: 'SLOW_INTERACTION',
        target: `${(response.config.method || 'GET').toUpperCase()} ${response.config.url || ''}`,
        message: `API request took ${durationMs}ms (slow response)`,
        metadata: { status: response.status, durationMs },
      });
    }
    return response;
  },
  (error) => {
    recordApiFailure(error);
    const startTime = (error.config as unknown as Record<string, unknown>)?._requestStartTime as number | undefined;
    const durationMs = startTime ? Date.now() - startTime : undefined;
    const status = error.response?.status;
    const method = (error.config?.method || 'GET').toUpperCase();
    const url = error.config?.url || '';

    recordBreadcrumb('network', 'error', `${method} ${url}`, {
      status,
      durationMs,
      message: error.message,
    });

    // Automatically report severe API failures (5xx or Network/Timeout errors, ignore normal 401s and 404s)
    if (!status || status >= 500) {
      reportFrontendIssue({
        issueType: 'API_FAILURE',
        target: `${method} ${url}`,
        message: `Server returned status ${status || 'NETWORK_ERROR'}: ${error.message || 'Request failed'}`,
        error: {
          name: error.name || 'AxiosError',
          message: error.message || 'API request failed',
          stack: error.stack || null,
        },
        metadata: { status, durationMs, url },
      });
    }
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
