'use client';

import '../../suppress-warnings';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, theme, Tabs, Button, DatePicker, Space, Segmented, Tooltip, Tag, Spin } from 'antd';
import {
  DashboardOutlined,
  PhoneOutlined,
  AlertOutlined,
  NotificationOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  FilterOutlined,
  BookOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { PageHeader } from '../../../components/ui';

dayjs.extend(isoWeek);

const { RangePicker } = DatePicker;

// Lazy load tabs
const CsDashboardTab = dynamic(() => import('./components/CsDashboardTab'), { ssr: false });
const HappyCallTab = dynamic(() => import('./components/HappyCallTab'), { ssr: false });
const TicketTab = dynamic(() => import('./components/TicketTab'), { ssr: false });
const CampaignTab = dynamic(() => import('./components/CampaignTab'), { ssr: false });
const WorkflowTrainingTab = dynamic(() => import('./components/WorkflowTrainingTab'), { ssr: false });

type DateMode = 'day' | 'week' | 'month' | 'custom';
type PresetType =
  'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'stepper' | 'custom';

function CsContent() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = searchParams?.get('tab');
      const savedTab = localStorage.getItem('cs-active-tab');
      const initialTab = tabParam || savedTab;
      if (initialTab && ['dashboard', 'happy-call', 'tickets', 'campaigns', 'workflow-training'].includes(initialTab)) {
        return initialTab;
      }
    }
    return 'dashboard';
  });

  // Date filter states with F5 persistence
  const [preset, setPreset] = useState<PresetType>(() => {
    if (typeof window !== 'undefined') {
      const param = searchParams?.get('preset') as PresetType;
      const saved = localStorage.getItem('cs-date-preset') as PresetType;
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
    return 'today';
  });

  const [dateMode, setDateMode] = useState<DateMode>(() => {
    if (typeof window !== 'undefined') {
      const param = searchParams?.get('dateMode') as DateMode;
      const saved = localStorage.getItem('cs-date-mode') as DateMode;
      const initial = param || saved;
      if (initial && ['day', 'week', 'month', 'custom'].includes(initial)) {
        return initial;
      }
    }
    return 'day';
  });

  const [anchorDate, setAnchorDate] = useState<dayjs.Dayjs>(() => {
    if (typeof window !== 'undefined') {
      const param = searchParams?.get('anchorDate');
      const saved = localStorage.getItem('cs-anchor-date');
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
      const fromSaved = localStorage.getItem('cs-custom-from');
      const toSaved = localStorage.getItem('cs-custom-to');
      const from = fromParam || fromSaved;
      const to = toParam || toSaved;
      if (from && to && dayjs(from).isValid() && dayjs(to).isValid()) {
        return [dayjs(from), dayjs(to)];
      }
    }
    return null;
  });

  // Derived dateFrom & dateTo strings (YYYY-MM-DD)
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Recalculate dateFrom & dateTo based on mode, preset, anchorDate, or customRange
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
      from = dayjs().startOf('isoWeek'); // Monday
      to = dayjs().endOf('isoWeek'); // Sunday
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
      // Stepper navigation based on dateMode & anchorDate
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

  // Persist all date filter states & activeTab on F5 / searchParams sync
  useEffect(() => {
    if (typeof window !== 'undefined' && dateFrom && dateTo) {
      localStorage.setItem('cs-active-tab', activeTab);
      localStorage.setItem('cs-date-preset', preset);
      localStorage.setItem('cs-date-mode', dateMode);
      localStorage.setItem('cs-anchor-date', anchorDate.format('YYYY-MM-DD'));
      if (customRange) {
        localStorage.setItem('cs-custom-from', customRange[0].format('YYYY-MM-DD'));
        localStorage.setItem('cs-custom-to', customRange[1].format('YYYY-MM-DD'));
      }

      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      url.searchParams.set('preset', preset);
      url.searchParams.set('dateMode', dateMode);
      url.searchParams.set('anchorDate', anchorDate.format('YYYY-MM-DD'));
      url.searchParams.set('from', dateFrom);
      url.searchParams.set('to', dateTo);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [activeTab, preset, dateMode, anchorDate, customRange, dateFrom, dateTo]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleModeChange = (mode: DateMode) => {
    setDateMode(mode);
    setPreset('stepper');
    setCustomRange(null);
  };

  // Step backward/forward
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
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Tổng Quan',
      children: activeTab === 'dashboard' ? <CsDashboardTab dateFrom={dateFrom} dateTo={dateTo} /> : null,
    },
    {
      key: 'happy-call',
      icon: <PhoneOutlined />,
      label: 'Happy Call',
      children: activeTab === 'happy-call' ? <HappyCallTab dateFrom={dateFrom} dateTo={dateTo} /> : null,
    },
    {
      key: 'tickets',
      icon: <AlertOutlined />,
      label: 'Tickets',
      children: activeTab === 'tickets' ? <TicketTab dateFrom={dateFrom} dateTo={dateTo} /> : null,
    },
    {
      key: 'campaigns',
      icon: <NotificationOutlined />,
      label: 'Chiến Dịch',
      children: activeTab === 'campaigns' ? <CampaignTab dateFrom={dateFrom} dateTo={dateTo} /> : null,
    },
    {
      key: 'workflow-training',
      icon: <BookOutlined />,
      label: '📘 Quy Trình & Đào Tạo',
      children: activeTab === 'workflow-training' ? <WorkflowTrainingTab /> : null,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Trung Tâm CSKH" subtitle="🎧 Chăm sóc khách hàng sau dịch vụ & Giám sát hiệu suất" />

      {/* Global Date Filter Header Bar */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: '12px 16px' } }}
        className="shadow-xs rounded-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mode Switcher + Stepper Controls */}
          <div className="flex items-center gap-2">
            <Segmented
              value={dateMode === 'custom' ? 'day' : dateMode}
              onChange={(val) => handleModeChange(val as DateMode)}
              options={[
                { label: 'Ngày', value: 'day' },
                { label: 'Tuần', value: 'week' },
                { label: 'Tháng', value: 'month' },
              ]}
            />

            <Space.Compact>
              <Tooltip title="Kỳ trước">
                <Button icon={<LeftOutlined />} onClick={() => handleStep('prev')} />
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
                  style={{ width: 140 }}
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
                  style={{ width: 170 }}
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
                  style={{ width: 150 }}
                />
              ) : (
                <Button className="font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                  <CalendarOutlined className="mr-1" />
                  {formatDateDisplay()}
                </Button>
              )}
              <Tooltip title="Kỳ sau">
                <Button icon={<RightOutlined />} onClick={() => handleStep('next')} />
              </Tooltip>
            </Space.Compact>
          </div>
        </div>
      </Card>

      {/* Main Tabs Card */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: '12px 16px 16px 16px' } }}
        className="shadow-sm rounded-xl dashboard-main-tabs-card"
      >
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} size="large" destroyOnHidden />
      </Card>
    </div>
  );
}

export default function CsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center">
          <Spin size="large" />
        </div>
      }
    >
      <CsContent />
    </Suspense>
  );
}
