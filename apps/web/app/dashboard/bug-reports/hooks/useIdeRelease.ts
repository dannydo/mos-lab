'use client';

import { useEffect, useRef, useState } from 'react';
import type { BugReportDetail, InboxIdeReleasePreview } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

export function useIdeRelease(reportId: number, onRecorded: (detail: BugReportDetail) => void) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<InboxIdeReleasePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const pendingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  const inspect = async () => {
    const version = ++generation.current;
    setOpen(true);
    setLoading(true);
    setPreview(null);
    setError(null);
    try {
      const result = await apiClient.bugReports.previewIdeRelease(reportId);
      if (version === generation.current) setPreview(result);
    } catch {
      if (version === generation.current) setError('Không kiểm tra được bằng chứng release. Hãy thử lại.');
    } finally {
      if (version === generation.current) setLoading(false);
    }
  };
  const close = () => {
    if (!pendingRef.current) {
      generation.current++;
      setOpen(false);
    }
  };
  const confirm = async () => {
    if (!preview?.eligible || !preview.token || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await apiClient.bugReports.recordIdeRelease(reportId, {
        acknowledged: true,
        token: preview.token,
      });
      if (!response.data) throw new Error('Máy chủ chưa trả về checkpoint.');
      if (mounted.current) onRecorded(response.data);
      window.dispatchEvent(new Event('mos-bug-inbox-updated'));
      setOpen(false);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Không ghi nhận được release. Kiểm tra lại bằng chứng trước khi thử lại.');
      // Retain the exact token: a timeout retry can recover the durable receipt.
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  return { open, loading, pending, preview, error, inspect, close, confirm };
}
