'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RequestClassifierWorkerHealth } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || 'Không thể tải trạng thái worker.';
  }
  return error instanceof Error ? error.message : 'Không thể tải trạng thái worker.';
}

let cachedWorkerHealth: RequestClassifierWorkerHealth | null = null;

export function useRequestClassifierWorkerHealth() {
  const [health, setHealth] = useState<RequestClassifierWorkerHealth | null>(() => cachedWorkerHealth);
  const [loading, setLoading] = useState(() => !cachedWorkerHealth);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const lastFetchTimeRef = useRef(0);

  const refresh = useCallback(async (showLoading = true) => {
    const version = ++requestVersion.current;
    lastFetchTimeRef.current = Date.now();
    if (showLoading && !cachedWorkerHealth) setLoading(true);
    try {
      const next = await apiClient.bugReports.workerHealth();
      if (version !== requestVersion.current) return;
      cachedWorkerHealth = next;
      setHealth(next);
      setError(null);
    } catch (caught) {
      if (version !== requestVersion.current) return;
      setError(errorMessage(caught));
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refresh(false);
    }, 45_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastFetchTimeRef.current < 5000) return;
        void refresh(false);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh]);

  return { health, loading, error, refresh };
}
