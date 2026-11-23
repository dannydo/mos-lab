'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { apiClient } from '~/lib/api-client';
import {
  CV_SENIORITY_POPOVER_WIDTH_STORAGE_KEY,
  DEFAULT_POPOVER_WIDTH,
  MIN_POPOVER_RESIZE_WIDTH,
  type CvSeniorityRule,
} from './cvThuNhapUtils';

interface UseCvSeniorityConfigParams {
  onConfigSaved: () => void | Promise<void>;
}

/** Manages CV seniority bonus configuration rules and resizable popover width persistence. */
export function useCvSeniorityConfig({ onConfigSaved }: UseCvSeniorityConfigParams) {
  const [seniorityRules, setSeniorityRules] = useState<CvSeniorityRule[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  const popoverWidthRef = useRef<number>(DEFAULT_POPOVER_WIDTH);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(CV_SENIORITY_POPOVER_WIDTH_STORAGE_KEY);
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed > MIN_POPOVER_RESIZE_WIDTH) {
          popoverWidthRef.current = parsed;
        }
      }
    }
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const popoverRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      node.style.width = `${popoverWidthRef.current}px`;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > MIN_POPOVER_RESIZE_WIDTH) {
            popoverWidthRef.current = width;
            localStorage.setItem(CV_SENIORITY_POPOVER_WIDTH_STORAGE_KEY, Math.round(width).toString());
          }
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const fetchSeniorityConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await apiClient.kpi.getCvSeniorityConfig();
      if (res) {
        setSeniorityRules([...res].sort((a, b) => a.minMonths - b.minMonths));
      }
    } catch (err) {
      console.error('Error fetching seniority config:', err);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSeniorityConfig();
  }, [fetchSeniorityConfig]);

  const addSeniorityRule = useCallback(() => {
    setSeniorityRules((prev) => [...prev, { minMonths: 6, bonusPercent: 5 }]);
  }, []);

  const updateSeniorityRule = useCallback((idx: number, field: keyof CvSeniorityRule, value: number) => {
    setSeniorityRules((prev) => prev.map((rule, i) => (i === idx ? { ...rule, [field]: value } : rule)));
  }, []);

  const removeSeniorityRule = useCallback((idx: number) => {
    setSeniorityRules((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSaveSeniorityConfig = useCallback(async () => {
    setConfigSaving(true);
    try {
      const invalid = seniorityRules.some((r) => r.minMonths <= 0 || r.bonusPercent < 0);
      if (invalid) {
        message.error('Vui lòng nhập các mốc thời gian và tỷ lệ hợp lệ (thời gian > 0, tỷ lệ >= 0)!');
        return;
      }
      const res = await apiClient.kpi.updateCvSeniorityConfig(seniorityRules);
      if (res && res.success) {
        message.success('Đã lưu cấu hình thưởng thâm niên thành công!');
        await onConfigSaved();
      }
    } catch {
      message.error('Không thể lưu cấu hình thưởng thâm niên.');
    } finally {
      setConfigSaving(false);
    }
  }, [onConfigSaved, seniorityRules]);

  return {
    seniorityRules,
    configLoading,
    configSaving,
    popoverRefCallback,
    addSeniorityRule,
    updateSeniorityRule,
    removeSeniorityRule,
    handleSaveSeniorityConfig,
  };
}
