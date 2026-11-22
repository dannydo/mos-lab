'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import type { CbDrilldownItem, CbLiveTelemetryResponse, CbTargetConfig } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { CbDailyViewMode, CbDrilldownCategory, CbStoreScope } from './cb-live-telemetry-types';
import { buildCumulativeChartData, computeDailyTotals, getDisplayedDailyRecords } from './cb-live-telemetry-utils';

export function useCbLiveTelemetry(autoRefreshIntervalSec: number) {
  const [data, setData] = useState<CbLiveTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [storeScope, setStoreScope] = useState<CbStoreScope>('DE_THAM_ESTELLA');
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Drawer Cấu hình Mục tiêu
  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false);
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetForm] = Form.useForm<Partial<CbTargetConfig>>();

  // Drawer / Modal Drilldown
  const [drilldownDrawerOpen, setDrilldownDrawerOpen] = useState(false);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownItems, setDrilldownItems] = useState<CbDrilldownItem[]>([]);
  const [drilldownTitle, setDrilldownTitle] = useState('');

  // Chế độ xem bảng ngày: 7 ngày gần nhất hoặc Cả tháng
  const [dailyViewMode, setDailyViewMode] = useState<CbDailyViewMode>('ALL_MONTH');

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await apiClient.kpi.getCbLiveTelemetry({
        month: selectedMonth,
        storeScope,
      });
      setData(res);
      setError(null);
      setSecondsAgo(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối đường truyền Live Streaming.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, storeScope]);

  // Initial load and manual fetch
  useEffect(() => {
    setLoading(true);
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Auto-polling when live streaming is enabled
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchTelemetry();
    }, autoRefreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [isLive, fetchTelemetry, autoRefreshIntervalSec]);

  // Seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenTargetConfig = useCallback(() => {
    if (data?.targets) {
      targetForm.setFieldsValue({
        comboSalesTarget: data.targets.comboSalesTarget,
        productSalesTarget: data.targets.productSalesTarget,
        greenFunnelDoneTarget: data.targets.greenFunnelDoneTarget,
        greenFunnelBookTarget: data.targets.greenFunnelBookTarget,
        greenFunnelConversionTarget: data.targets.greenFunnelConversionTarget,
        packageUsageDoneTarget: data.targets.packageUsageDoneTarget,
        repeatComboSalesTarget: data.targets.repeatComboSalesTarget,
        aovPackageUsageTarget: data.targets.aovPackageUsageTarget,
      });
    }
    setTargetDrawerOpen(true);
  }, [data, targetForm]);

  const handleSaveTargetConfig = useCallback(
    async (values: Partial<CbTargetConfig>) => {
      setTargetSaving(true);
      try {
        await apiClient.kpi.saveCbTargetConfig({
          ...values,
          month: selectedMonth,
          storeScope,
        });
        message.success(`Đã cập nhật mục tiêu tháng ${selectedMonth}!`);
        setTargetDrawerOpen(false);
        fetchTelemetry();
      } catch {
        message.error('Không thể lưu cấu hình mục tiêu.');
      } finally {
        setTargetSaving(false);
      }
    },
    [selectedMonth, storeScope, fetchTelemetry]
  );

  const handleOpenDrilldown = useCallback(
    async (category: CbDrilldownCategory, title: string) => {
      setDrilldownTitle(title);
      setDrilldownDrawerOpen(true);
      setDrilldownLoading(true);
      try {
        const items = await apiClient.kpi.getCbDrilldown({
          category,
          month: selectedMonth,
          storeScope,
          limit: 100,
        });
        setDrilldownItems(items);
      } catch {
        message.error('Không thể tải danh sách chi tiết.');
      } finally {
        setDrilldownLoading(false);
      }
    },
    [selectedMonth, storeScope]
  );

  const displayedDailyRecords = useMemo(
    () => getDisplayedDailyRecords(data?.daily, dailyViewMode),
    [data?.daily, dailyViewMode]
  );

  const dailyTotals = useMemo(() => computeDailyTotals(displayedDailyRecords), [displayedDailyRecords]);

  const chartPoints = useMemo(
    () => buildCumulativeChartData(data?.daily, data?.targets?.totalSalesTarget, data?.revenue?.totalSalesNet),
    [data?.daily, data?.targets?.totalSalesTarget, data?.revenue?.totalSalesNet]
  );

  return {
    data,
    loading,
    error,
    isLive,
    setIsLive,
    selectedMonth,
    setSelectedMonth,
    storeScope,
    setStoreScope,
    secondsAgo,
    targetDrawerOpen,
    setTargetDrawerOpen,
    targetSaving,
    targetForm,
    drilldownDrawerOpen,
    setDrilldownDrawerOpen,
    drilldownLoading,
    drilldownItems,
    drilldownTitle,
    dailyViewMode,
    setDailyViewMode,
    displayedDailyRecords,
    dailyTotals,
    chartPoints,
    fetchTelemetry,
    handleOpenTargetConfig,
    handleSaveTargetConfig,
    handleOpenDrilldown,
  };
}
