'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, Radio, Select, Space } from 'antd';
import { Calendar, Clock, List, RefreshCw } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import { IconButton, PageHeader, ReportPeriodNavigator, StatusTag, ToolbarToggle } from '~/components/ui';
import type { TodaySandboxMode } from '../context/SandboxModeContext';

const RealtimeClock = React.memo(() => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      setTime(dayjs().format('HH:mm:ss - DD/MM/YYYY'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  return <strong className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">{time}</strong>;
});
RealtimeClock.displayName = 'RealtimeClock';

const VISIBILITY_REFRESH_COOLDOWN_MS = 15_000;

function hasActiveOverlayOrDraftInput(): boolean {
  if (typeof document === 'undefined') return false;
  const activeTag = document.activeElement?.tagName;
  if (activeTag === 'TEXTAREA' || activeTag === 'INPUT') {
    return true;
  }
  const openDrawer = document.querySelector('.ant-drawer-open');
  if (openDrawer) return true;
  const openModals = document.querySelectorAll('.ant-modal-wrap');
  for (const modal of openModals) {
    if ((modal as HTMLElement).style.display !== 'none') {
      return true;
    }
  }
  return false;
}

const AutoRefreshCountdown = React.memo(
  ({
    autoRefresh,
    refreshInterval,
    resetSignal,
    pauseAutoRefresh = false,
    onExpire,
  }: {
    autoRefresh: boolean;
    refreshInterval: number;
    resetSignal: number;
    pauseAutoRefresh?: boolean;
    onExpire: () => void;
  }) => {
    const [secondsLeft, setSecondsLeft] = useState(refreshInterval);
    const secondsLeftRef = useRef(refreshInterval);
    const lastRefreshAtRef = useRef(Date.now());
    const onExpireRef = useRef(onExpire);

    useEffect(() => {
      onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
      secondsLeftRef.current = refreshInterval;
      setSecondsLeft(refreshInterval);
      lastRefreshAtRef.current = Date.now();
    }, [refreshInterval, resetSignal]);

    useEffect(() => {
      if (!autoRefresh) return;

      const isPaused = () => pauseAutoRefresh || hasActiveOverlayOrDraftInput();

      const triggerRefresh = () => {
        lastRefreshAtRef.current = Date.now();
        secondsLeftRef.current = refreshInterval;
        setSecondsLeft(refreshInterval);
        onExpireRef.current();
      };

      const tick = () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          return;
        }
        if (isPaused()) {
          return;
        }
        const next = secondsLeftRef.current - 1;
        if (next <= 0) {
          triggerRefresh();
        } else {
          secondsLeftRef.current = next;
          setSecondsLeft(next);
        }
      };

      const timer = setInterval(tick, 1000);

      const handleVisibilityChange = () => {
        if (document.visibilityState !== 'visible' || isPaused()) {
          return;
        }
        if (Date.now() - lastRefreshAtRef.current >= VISIBILITY_REFRESH_COOLDOWN_MS) {
          triggerRefresh();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [autoRefresh, pauseAutoRefresh, refreshInterval]);

    if (!autoRefresh) return null;
    return <span className="tabular-nums">({secondsLeft}s)</span>;
  }
);
AutoRefreshCountdown.displayName = 'AutoRefreshCountdown';

export interface TodayControlToolbarProps {
  selectedDate: Dayjs;
  dateRangeMode: 'day' | 'week' | 'month';
  periodLabel: string;
  loading: boolean;
  silentLoading: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  refreshResetSignal: number;
  pauseAutoRefresh?: boolean;
  mainViewMode: 'operations' | 'calendar';
  sandboxMode: TodaySandboxMode;
  isSandbox: boolean;
  onDateRangeModeChange: (mode: 'day' | 'week' | 'month') => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onSelectDate: (date: Dayjs) => void;
  onRefresh: () => void;
  onToggleAutoRefresh: (checked: boolean) => void;
  onChangeRefreshInterval: (val: number) => void;
  onTriggerSilentRefresh: () => void;
  onChangeMainViewMode: (mode: 'operations' | 'calendar') => void;
  onChangeSandboxMode: (mode: TodaySandboxMode) => void;
  onResetTrainingState: () => void;
  onResetSalesState: () => void;
}

export function TodayControlToolbar({
  selectedDate,
  dateRangeMode,
  periodLabel,
  loading,
  silentLoading,
  autoRefresh,
  refreshInterval,
  refreshResetSignal,
  pauseAutoRefresh = false,
  mainViewMode,
  sandboxMode,
  isSandbox,
  onDateRangeModeChange,
  onPrevDate,
  onNextDate,
  onSelectDate,
  onRefresh,
  onToggleAutoRefresh,
  onChangeRefreshInterval,
  onTriggerSilentRefresh,
  onChangeMainViewMode,
  onChangeSandboxMode,
  onResetTrainingState,
  onResetSalesState,
}: TodayControlToolbarProps) {
  return (
    <>
      {/* Title & Control Header */}
      <PageHeader
        className="today-page-header"
        title="Control Board Hôm Nay"
        tag={<StatusTag status="default" label="Today operations" className="today-page-header-context" />}
        subtitle="Giám sát thời gian thực lịch đặt mới, luồng khách đến và trạng thái phục vụ của CC & CV"
        icon={<Clock className="w-4 h-4" />}
        extra={
          <div className="today-header-toolbar">
            <div className="today-realtime-clock">
              <span>Thời gian thực tế</span>
              <RealtimeClock />
            </div>
            <ReportPeriodNavigator
              mode={dateRangeMode}
              value={selectedDate}
              label={periodLabel}
              onModeChange={onDateRangeModeChange}
              onPrevious={onPrevDate}
              onNext={onNextDate}
              onValueChange={onSelectDate}
            />

            <IconButton
              label="Làm mới dữ liệu"
              icon={RefreshCw}
              iconClassName={loading || silentLoading ? 'animate-spin' : ''}
              onClick={onRefresh}
              className="today-refresh-action"
            />

            {selectedDate.isSame(dayjs(), 'day') && (
              <>
                <ToolbarToggle
                  className="today-auto-refresh-control"
                  label={
                    <span>
                      F5{' '}
                      <AutoRefreshCountdown
                        autoRefresh={autoRefresh}
                        refreshInterval={refreshInterval}
                        resetSignal={refreshResetSignal}
                        pauseAutoRefresh={pauseAutoRefresh}
                        onExpire={onTriggerSilentRefresh}
                      />
                    </span>
                  }
                  aria-label="Bật hoặc tắt tự động làm mới"
                  checked={autoRefresh}
                  onChange={onToggleAutoRefresh}
                />
                {autoRefresh && (
                  <Select
                    aria-label="Chu kỳ tự động làm mới"
                    value={refreshInterval}
                    onChange={onChangeRefreshInterval}
                    options={[
                      { value: 15, label: '15s' },
                      { value: 30, label: '30s' },
                      { value: 60, label: '1m' },
                      { value: 180, label: '3m' },
                    ]}
                    className="w-[70px]"
                  />
                )}
              </>
            )}
          </div>
        }
      />

      {/* VIEW MODE TOGGLE BAR & SANDBOX MODE SELECTOR */}
      <div className="flex justify-between items-center mb-1 flex-wrap gap-3">
        <Radio.Group
          value={mainViewMode}
          onChange={(e) => onChangeMainViewMode(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="operations">
            <Space size="small">
              <List className="w-4 h-4" />
              <span className="font-semibold">Bảng Vận Hành</span>
            </Space>
          </Radio.Button>
          <Radio.Button value="calendar">
            <Space size="small">
              <Calendar className={`w-4 h-4 ${mainViewMode === 'calendar' ? 'text-amber-500' : ''}`} />
              <span className="font-semibold">Lịch Tổng Quan</span>
            </Space>
          </Radio.Button>
        </Radio.Group>

        {/* Sandbox Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chế độ Sandbox:</span>
          <Select
            aria-label="Chọn chế độ Sandbox giả lập"
            value={sandboxMode}
            onChange={onChangeSandboxMode}
            className="w-72"
            options={[
              {
                value: 'live',
                label: (
                  <Space size={6}>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Chế độ Thực tế (Live)</span>
                  </Space>
                ),
              },
              {
                value: 'training',
                label: (
                  <Space size={6}>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                    <span>Training Check-in / Bấm giờ</span>
                  </Space>
                ),
              },
              {
                value: 'sales',
                label: (
                  <Space size={6}>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    <span>Sales Simulation (Chốt Combo & Quà)</span>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Sandbox Mode Banner */}
      {isSandbox && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg p-3 flex justify-between items-center flex-wrap gap-3 border ${
            sandboxMode === 'training'
              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <StatusTag
              status={sandboxMode === 'training' ? 'processing' : 'warning'}
              label={
                sandboxMode === 'training' ? '🧪 SANDBOX: TRAINING CHECK-IN & BẤM GIỜ' : '💎 SANDBOX: SALES SIMULATION'
              }
            />
            <span className="text-xs text-slate-700 dark:text-slate-200">
              {sandboxMode === 'training'
                ? 'Đang ở chế độ giả lập chấm công ca, check-in, bấm giờ làm mi và check-out để training nhân sự. Dữ liệu độc lập, không ghi MySQL thật.'
                : 'Đang ở chế độ mô phỏng chốt combo 10 tặng 6, combo mi dưỡng và quà tặng để lập kế hoạch & training bán hàng.'}
            </span>
          </div>
          <Space>
            {sandboxMode === 'training' ? (
              <Button size="small" onClick={onResetTrainingState} aria-label="Đặt lại phòng tập training">
                Đặt lại phòng tập
              </Button>
            ) : (
              <Button size="small" onClick={onResetSalesState} aria-label="Đặt lại kịch bản bán">
                Đặt lại kịch bản
              </Button>
            )}
            <Button
              size="small"
              type="primary"
              onClick={() => onChangeSandboxMode('live')}
              aria-label="Trở về dữ liệu thực tế"
            >
              Trở về Live Data
            </Button>
          </Space>
        </div>
      )}
    </>
  );
}
