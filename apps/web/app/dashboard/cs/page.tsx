'use client';

import '../../suppress-warnings';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Tabs, Button, DatePicker, Space, Segmented, Tooltip, Select } from 'antd';
import { ChevronLeft, ChevronRight, Calendar, Store, DollarSign } from 'lucide-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { AppIcon, PageHeader } from '../../../components/ui';

dayjs.extend(isoWeek);

// Lazy load Tab components
const CsTipTab = dynamic(() => import('./components/CsTipTab'), {
  ssr: false,
  loading: () => <div className="p-12 text-center text-slate-500">Đang tải dữ liệu Báo Cáo CS...</div>,
});

type DateMode = 'day' | 'week' | 'month' | 'custom';
type PresetType =
  'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'stepper' | 'custom';

function CsSalaryReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab active key
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = searchParams?.get('tab');
      const savedTab = localStorage.getItem('cs-salary-active-tab');
      const initialTab = tabParam || savedTab;
      if (initialTab && ['tip'].includes(initialTab)) {
        return initialTab;
      }
    }
    return 'tip';
  });

  // Store filter
  const [selectedStore, setSelectedStore] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return searchParams?.get('store') || localStorage.getItem('cs-salary-store') || 'ALL';
    }
    return 'ALL';
  });

  // Date filter states with F5 persistence
  const [preset, setPreset] = useState<PresetType>(() => {
    if (typeof window !== 'undefined') {
      const param = searchParams?.get('preset') as PresetType;
      const saved = localStorage.getItem('cs-salary-preset') as PresetType;
      const initial = param || saved;
      if (
        initial &&
        ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'stepper', 'custom'].includes(
          initial
        )
      ) {
        return initial;
      }
    }
    return 'this_month';
  });

  const [dateMode, setDateMode] = useState<DateMode>(() => {
    if (typeof window !== 'undefined') {
      const param = searchParams?.get('dateMode') as DateMode;
      const saved = localStorage.getItem('cs-salary-date-mode') as DateMode;
      const initial = param || saved;
      if (initial && ['day', 'week', 'month', 'custom'].includes(initial)) {
        return initial;
      }
    }
    return 'month';
  });

  const [anchorDate, setAnchorDate] = useState<dayjs.Dayjs>(() => {
    if (typeof window !== 'undefined') {
      const param = searchParams?.get('anchorDate');
      const saved = localStorage.getItem('cs-salary-anchor-date');
      const initial = param || saved;
      if (initial && dayjs(initial).isValid()) {
        return dayjs(initial);
      }
    }
    return dayjs();
  });

  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(() => {
    if (typeof window !== 'undefined') {
      const fromParam = searchParams?.get('from');
      const toParam = searchParams?.get('to');
      const fromSaved = localStorage.getItem('cs-salary-from');
      const toSaved = localStorage.getItem('cs-salary-to');
      const from = fromParam || fromSaved;
      const to = toParam || toSaved;
      if (from && to && dayjs(from).isValid() && dayjs(to).isValid()) {
        return [dayjs(from), dayjs(to)];
      }
    }
    return null;
  });

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    let from = dayjs();
    let to = dayjs();

    if (preset === 'custom' && customRange) {
      from = customRange[0];
      to = customRange[1];
    } else if (preset === 'today') {
      from = dayjs();
      to = dayjs();
    } else if (preset === 'yesterday') {
      from = dayjs().subtract(1, 'day');
      to = dayjs().subtract(1, 'day');
    } else if (preset === 'this_week') {
      from = dayjs().startOf('isoWeek');
      to = dayjs().endOf('isoWeek');
    } else if (preset === 'last_week') {
      from = dayjs().subtract(1, 'week').startOf('isoWeek');
      to = dayjs().subtract(1, 'week').endOf('isoWeek');
    } else if (preset === 'this_month') {
      from = dayjs().startOf('month');
      to = dayjs().endOf('month');
    } else if (preset === 'last_month') {
      from = dayjs().subtract(1, 'month').startOf('month');
      to = dayjs().subtract(1, 'month').endOf('month');
    } else {
      if (dateMode === 'day') {
        from = anchorDate;
        to = anchorDate;
      } else if (dateMode === 'week') {
        from = anchorDate.startOf('isoWeek');
        to = anchorDate.endOf('isoWeek');
      } else if (dateMode === 'month') {
        from = anchorDate.startOf('month');
        to = anchorDate.endOf('month');
      }
    }

    const fromStr = from.format('YYYY-MM-DD');
    const toStr = to.format('YYYY-MM-DD');
    setDateFrom(fromStr);
    setDateTo(toStr);
  }, [preset, dateMode, anchorDate, customRange]);

  // Persist states to localStorage and searchParams
  useEffect(() => {
    if (typeof window !== 'undefined' && dateFrom && dateTo) {
      localStorage.setItem('cs-salary-active-tab', activeTab);
      localStorage.setItem('cs-salary-store', selectedStore);
      localStorage.setItem('cs-salary-preset', preset);
      localStorage.setItem('cs-salary-date-mode', dateMode);
      localStorage.setItem('cs-salary-anchor-date', anchorDate.format('YYYY-MM-DD'));
      if (customRange) {
        localStorage.setItem('cs-salary-from', customRange[0].format('YYYY-MM-DD'));
        localStorage.setItem('cs-salary-to', customRange[1].format('YYYY-MM-DD'));
      }

      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      url.searchParams.set('store', selectedStore);
      url.searchParams.set('preset', preset);
      url.searchParams.set('dateMode', dateMode);
      url.searchParams.set('anchorDate', anchorDate.format('YYYY-MM-DD'));
      url.searchParams.set('from', dateFrom);
      url.searchParams.set('to', dateTo);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [activeTab, selectedStore, preset, dateMode, anchorDate, customRange, dateFrom, dateTo]);

  const handleModeChange = (mode: DateMode) => {
    setDateMode(mode);
    setPreset('stepper');
    setCustomRange(null);
  };

  const handleStep = (direction: 'prev' | 'next') => {
    setPreset('stepper');
    setCustomRange(null);
    const amount = direction === 'prev' ? -1 : 1;

    let base = anchorDate;
    if (dateFrom && dayjs(dateFrom).isValid()) base = dayjs(dateFrom);

    if (dateMode === 'day') {
      setAnchorDate(base.add(amount, 'day'));
    } else if (dateMode === 'week') {
      setAnchorDate(base.add(amount, 'week'));
    } else if (dateMode === 'month') {
      setAnchorDate(base.add(amount, 'month'));
    }
  };

  const handleApplyPreset = (p: PresetType) => {
    setPreset(p);
    setCustomRange(null);
    if (p === 'today' || p === 'yesterday') {
      setDateMode('day');
      setAnchorDate(p === 'today' ? dayjs() : dayjs().subtract(1, 'day'));
    } else if (p === 'this_week' || p === 'last_week') {
      setDateMode('week');
      setAnchorDate(p === 'this_week' ? dayjs() : dayjs().subtract(1, 'week'));
    } else if (p === 'this_month' || p === 'last_month') {
      setDateMode('month');
      setAnchorDate(p === 'this_month' ? dayjs() : dayjs().subtract(1, 'month'));
    }
  };

  const formatDateDisplay = () => {
    if (!dateFrom || !dateTo) return 'Đang chọn ngày...';
    if (dateFrom === dateTo) {
      return dayjs(dateFrom).format('DD/MM/YYYY');
    }
    return `${dayjs(dateFrom).format('DD/MM')} - ${dayjs(dateTo).format('DD/MM/YYYY')}`;
  };

  const tabItems = [
    {
      key: 'tip',
      label: (
        <span className="cs-dashboard-tab-label inline-flex items-center gap-1.5 font-semibold text-sm">
          <AppIcon icon={DollarSign} size="sm" />
          <span>Tip Khách Hàng (Quỹ 3%)</span>
        </span>
      ),
      children: <CsTipTab dateFrom={dateFrom} dateTo={dateTo} selectedStore={selectedStore} />,
    },
  ];

  return (
    <div className="responsive-page responsive-workspace cs-salary-page space-y-4">
      <PageHeader
        title="Báo Cáo CS"
        subtitle="💰 Bảng tính lương thưởng & Quỹ hoa hồng cho nhân sự CS (Customer Service)"
      />

      {/* Global Filter Bar */}
      <Card
        variant="outlined"
        styles={{ body: { padding: '12px 16px' } }}
        className="shadow-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mode Switcher + Stepper Controls */}
          <div className="flex items-center gap-2">
            <Segmented
              value={dateMode === 'custom' ? 'month' : dateMode}
              onChange={(val) => handleModeChange(val as DateMode)}
              options={[
                { label: 'Ngày', value: 'day' },
                { label: 'Tuần', value: 'week' },
                { label: 'Tháng', value: 'month' },
              ]}
            />

            <Space.Compact className="cs-salary-period-compact">
              <Tooltip title="Kỳ trước">
                <Button icon={<AppIcon icon={ChevronLeft} size="sm" />} onClick={() => handleStep('prev')} />
              </Tooltip>
              {dateMode === 'day' ? (
                <DatePicker
                  allowClear={false}
                  value={dayjs(dateFrom || undefined)}
                  onChange={(d) => {
                    if (d) {
                      setPreset('stepper');
                      setDateMode('day');
                      setAnchorDate(d);
                      setCustomRange(null);
                    }
                  }}
                  format="DD/MM/YYYY"
                  className="w-36"
                />
              ) : dateMode === 'week' ? (
                <DatePicker
                  picker="week"
                  allowClear={false}
                  value={dayjs(dateFrom || undefined)}
                  onChange={(d) => {
                    if (d) {
                      setPreset('stepper');
                      setDateMode('week');
                      setAnchorDate(d);
                      setCustomRange(null);
                    }
                  }}
                  format="[Tuần] ww (DD/MM)"
                  className="w-44"
                />
              ) : dateMode === 'month' ? (
                <DatePicker
                  picker="month"
                  allowClear={false}
                  value={dayjs(dateFrom || undefined)}
                  onChange={(d) => {
                    if (d) {
                      setPreset('stepper');
                      setDateMode('month');
                      setAnchorDate(d);
                      setCustomRange(null);
                    }
                  }}
                  format="[Tháng] MM/YYYY"
                  className="w-36"
                />
              ) : (
                <Button className="font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                  <AppIcon icon={Calendar} size="sm" className="mr-1" />
                  {formatDateDisplay()}
                </Button>
              )}
              <Tooltip title="Kỳ sau">
                <Button icon={<AppIcon icon={ChevronRight} size="sm" />} onClick={() => handleStep('next')} />
              </Tooltip>
            </Space.Compact>
          </div>

          {/* Preset Buttons + Store Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <Button
                size="small"
                type={preset === 'today' ? 'primary' : 'default'}
                onClick={() => handleApplyPreset('today')}
              >
                Hôm nay
              </Button>
              <Button
                size="small"
                type={preset === 'yesterday' ? 'primary' : 'default'}
                onClick={() => handleApplyPreset('yesterday')}
              >
                Hôm qua
              </Button>
              <Button
                size="small"
                type={preset === 'this_week' ? 'primary' : 'default'}
                onClick={() => handleApplyPreset('this_week')}
              >
                Tuần này
              </Button>
              <Button
                size="small"
                type={preset === 'this_month' ? 'primary' : 'default'}
                onClick={() => handleApplyPreset('this_month')}
              >
                Tháng này
              </Button>
              <Button
                size="small"
                type={preset === 'last_month' ? 'primary' : 'default'}
                onClick={() => handleApplyPreset('last_month')}
              >
                Tháng trước
              </Button>
            </div>

            <Select
              value={selectedStore}
              onChange={setSelectedStore}
              className="w-44"
              suffixIcon={<AppIcon icon={Store} size="sm" />}
              options={[
                { label: 'Tất cả cơ sở', value: 'ALL' },
                { label: 'Đề Thám (DT)', value: 'de-tham' },
                { label: 'Estella Place (EP)', value: 'estella-place' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Main Tabs Card */}
      <Card
        variant="outlined"
        styles={{ body: { padding: '16px 20px' } }}
        className="shadow-sm rounded-xl dashboard-main-tabs-card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" destroyOnHidden />
      </Card>
    </div>
  );
}

export default function CsSalaryReportPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Đang tải Báo Cáo CS...</div>}>
      <CsSalaryReportContent />
    </Suspense>
  );
}
