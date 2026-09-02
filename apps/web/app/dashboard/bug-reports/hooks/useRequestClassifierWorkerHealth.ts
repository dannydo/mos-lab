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

export function useRequestClassifierWorkerHealth() {
  const [health, setHealth] = useState<RequestClassifierWorkerHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async (showLoading = true) => {
    const version = ++requestVersion.current;
    if (showLoading) setLoading(true);
    try {
      const next = await apiClient.bugReports.workerHealth();
      if (version !== requestVersion.current) return;
      setHealth(next);
      setError(null);
    } catch (caught) {
      if (version !== requestVersion.current) return;
      setError(errorMessage(caught));
    } finally {
      if (showLoading && version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(false), 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return { health, loading, error, refresh };
}
