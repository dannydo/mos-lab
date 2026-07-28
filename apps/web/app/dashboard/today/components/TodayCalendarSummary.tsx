'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Badge,
  Select,
  Space,
  Button,
  Modal,
  Tooltip,
  Progress,
  Avatar,
  Typography,
  Radio,
} from 'antd';
import {
  FileAddOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  EyeOutlined,
  ShopOutlined,
  UserOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  DollarOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { BookingData, ComingClientData } from '../hooks/useTodayData';
import { BookerTeamConfig, DEFAULT_BOOKER_TEAMS } from './BookerTeamConfigModal';
import { removeVietnameseTones, vietnameseSearchFilter } from '@mos-lab/shared';
import type { RevenueHourlyResponse } from '@mos-lab/shared';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { RevenueKpiCards } from './RevenueKpiCards';
import { RevenueHourlyChart } from './RevenueHourlyChart';
import { RevenueBranchHeatmap } from './RevenueBranchHeatmap';
import { RevenueDetailModal } from './RevenueDetailModal';

const { Text } = Typography;

const HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

const BRANCH_CONFIG: Record<string, { name: string; key: 'detham' | 'pxl' | 'estella'; color: string }> = {
  detham: { name: 'Đề Thám', key: 'detham', color: '#faad14' },
  pxl: { name: 'Phan Xích Long', key: 'pxl', color: '#1890ff' },
  estella: { name: 'Estella', key: 'estella', color: '#eb2f96' },
};

interface TodayCalendarSummaryProps {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  allBookings: BookingData[];
  allComingList: ComingClientData[];
  bookingBranch: 'all' | 'detham' | 'pxl' | 'estella';
  setBookingBranch: (branch: 'all' | 'detham' | 'pxl' | 'estella') => void;
  selectedBooker: string | null;
  setSelectedBooker: (booker: string | null) => void;
  teamConfig?: BookerTeamConfig;
  dateBounds?: { dateFrom: string; dateTo: string; label: string };
  setTeamModalVisible?: (visible: boolean) => void;
  openCustomerDrawer: (record: SafeAny) => void;
  selectedDate: dayjs.Dayjs;
  // Revenue props
  revenueData?: RevenueHourlyResponse | null;
  revenueLoading?: boolean;
  showRevenueView?: boolean;
  setShowRevenueView?: (val: boolean) => void;
}

export default function TodayCalendarSummary({
  themeMode,
  token,
  allBookings,
  allComingList,
  bookingBranch,
  setBookingBranch,
  selectedBooker,
  setSelectedBooker,
  teamConfig,
  dateBounds,
  setTeamModalVisible,
  openCustomerDrawer,
  selectedDate,
  revenueData,
  revenueLoading,
  showRevenueView,
  setShowRevenueView,
}: TodayCalendarSummaryProps) {
  const { makeCall } = useOmiCall();
  const [matrixStatusFilter, setMatrixStatusFilter] = useState<'all' | 'created' | 'scheduled' | 'missed' | 'done'>(
    'all'
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    hour: string;
    branchKey?: string;
    type: 'all' | 'created' | 'scheduled' | 'missed' | 'done';
  } | null>(null);
  const [revenueDetailContext, setRevenueDetailContext] = useState<{
    hour?: string;
    branchKey?: string;
    branchName?: string;
    type?: string;
  } | null>(null);
  const [revenueDetailOpen, setRevenueDetailOpen] = useState(false);

  const handleRevenueBarClick = (hour: string) => {
    setRevenueDetailContext({ hour });
    setRevenueDetailOpen(true);
  };

  const handleRevenueCellClick = (branchKey: string, hour: string) => {
    const branchNames: Record<string, string> = {
      detham: 'Đề Thám',
      pxl: 'Phan Xích Long',
      estella: 'Estella',
    };
    setRevenueDetailContext({ hour, branchKey, branchName: branchNames[branchKey] || branchKey });
    setRevenueDetailOpen(true);
  };

  const matchesBookerFilter = React.useCallback(
    (bookerName: string | undefined, filter: string | null) => {
      if (!filter || filter === 'all') return true;
      const name = (bookerName || '').trim().toLowerCase();
      if (!name) return false;

      const currentConfig = teamConfig && Object.keys(teamConfig).length > 0 ? teamConfig : DEFAULT_BOOKER_TEAMS;

      if (filter === 'team:telesales') {
        return (currentConfig.telesales || []).some((n) => n.trim().toLowerCase() === name);
      }
      if (filter === 'team:control_cs') {
        return (currentConfig.control_cs || []).some((n) => n.trim().toLowerCase() === name);
      }
      if (filter === 'team:other') {
        return (currentConfig.other || []).some((n) => n.trim().toLowerCase() === name);
      }

      return name === filter.trim().toLowerCase();
    },
    [teamConfig]
  );

  // Extract unique Booker options
  const bookerOptions = useMemo(() => {
    const set = new Set<string>();
    allBookings.forEach((b) => {
      if (b.booker) set.add(b.booker);
    });
    allComingList.forEach((c) => {
      if (c.booker) set.add(c.booker);
    });
    return Array.from(set).map((name) => ({ value: name, label: name }));
  }, [allBookings, allComingList]);

  const groupedBookerOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Tất cả Đội Nhóm & Booker' },
      {
        label: '🛡️ Lọc Theo Đội Nhóm',
        options: [
          { value: 'team:telesales', label: '🛡️ Đội Telesales' },
          { value: 'team:control_cs', label: '🎧 Control / CS' },
          { value: 'team:other', label: '🌐 Khác (Web/Direct)' },
        ],
      },
      {
        label: '👤 Lọc Theo Cá Nhân Booker',
        options: bookerOptions,
      },
    ];
  }, [bookerOptions]);

  // Compute filtered bookings and coming list based on branch & team/booker filter
  const filteredBookings = useMemo(() => {
    return (allBookings || []).filter((b) => {
      if (bookingBranch !== 'all') {
        if (bookingBranch === 'detham' && b.branchName !== 'Đề Thám') return false;
        if (bookingBranch === 'pxl' && b.branchName !== 'PXL' && b.branchName !== 'Phan Xích Long') return false;
        if (bookingBranch === 'estella' && b.branchName !== 'Estella') return false;
      }
      if (!matchesBookerFilter(b.booker, selectedBooker)) {
        return false;
      }
      return true;
    });
  }, [allBookings, bookingBranch, selectedBooker, matchesBookerFilter]);

  const filteredComingList = useMemo(() => {
    return (allComingList || []).filter((item) => {
      if (bookingBranch !== 'all' && item.branchKey !== bookingBranch) {
        return false;
      }
      if (!matchesBookerFilter(item.booker, selectedBooker)) {
        return false;
      }
      return true;
    });
  }, [allComingList, bookingBranch, selectedBooker, matchesBookerFilter]);

  // Compute Created, Scheduled, Missed, Done totals
  const totalCreated = filteredBookings.length;
  const totalScheduled = filteredComingList.length;
  const totalDone = useMemo(() => {
    return filteredComingList.filter((c) => ['completed', 'serving', 'arrived'].includes(c.status)).length;
  }, [filteredComingList]);

  const totalMissed = useMemo(() => {
    return filteredComingList.filter((c) => c.status === 'late').length;
  }, [filteredComingList]);

  const completionRate = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0;
  const missedRate = totalScheduled > 0 ? Math.round((totalMissed / totalScheduled) * 100) : 0;

  // Hourly Aggregation Data Matrix
  const hourlyData = useMemo(() => {
    return HOURS.map((hour) => {
      const hNum = parseInt(hour.split(':')[0], 10);

      // Created in this hour
      const createdItems = filteredBookings.filter((b) => {
        if (!b.createdTime) return false;
        const timePart = b.createdTime.split(' ')[0];
        const itemHour = parseInt(timePart.split(':')[0], 10);
        return itemHour === hNum;
      });

      // Scheduled in this hour
      const scheduledItems = filteredComingList.filter((c) => {
        if (!c.time) return false;
        const itemHour = parseInt(c.time.split(':')[0], 10);
        return itemHour === hNum;
      });

      const missedItems = scheduledItems.filter((c) => c.status === 'late');
      const doneItems = scheduledItems.filter((c) => ['completed', 'serving', 'arrived'].includes(c.status));

      // Branch breakdown for matrix
      const branchBreakdown: Record<string, { created: number; scheduled: number; missed: number; done: number }> = {
        detham: { created: 0, scheduled: 0, missed: 0, done: 0 },
        pxl: { created: 0, scheduled: 0, missed: 0, done: 0 },
        estella: { created: 0, scheduled: 0, missed: 0, done: 0 },
      };

      createdItems.forEach((b) => {
        let key = 'detham';
        if (b.branchName === 'PXL' || b.branchName === 'Phan Xích Long') key = 'pxl';
        else if (b.branchName === 'Estella') key = 'estella';
        if (branchBreakdown[key]) branchBreakdown[key].created++;
      });

      scheduledItems.forEach((c) => {
        const key = c.branchKey || 'detham';
        if (branchBreakdown[key]) {
          branchBreakdown[key].scheduled++;
          if (c.status === 'late') branchBreakdown[key].missed++;
          if (['completed', 'serving', 'arrived'].includes(c.status)) branchBreakdown[key].done++;
        }
      });

      return {
        hour,
        hNum,
        created: createdItems.length,
        scheduled: scheduledItems.length,
        missed: missedItems.length,
        done: doneItems.length,
        createdItems,
        scheduledItems,
        missedItems,
        doneItems,
        branchBreakdown,
      };
    });
  }, [filteredBookings, filteredComingList]);

  // Maximum hourly value for bar chart scaling
  const maxHourlyVal = useMemo(() => {
    let max = 1;
    hourlyData.forEach((d) => {
      const highest = Math.max(d.created, d.scheduled, d.missed, d.done);
      if (highest > max) max = highest;
    });
    return max;
  }, [hourlyData]);

  // Slot Detail Modal Content
  const modalSlotItems = useMemo(() => {
    if (!selectedSlot) return { created: [], scheduled: [], missed: [], done: [] };

    const targetHourData = hourlyData.find((d) => d.hour === selectedSlot.hour);
    if (!targetHourData) return { created: [], scheduled: [], missed: [], done: [] };

    let created = targetHourData.createdItems;
    let scheduled = targetHourData.scheduledItems;
    let missed = targetHourData.missedItems;
    let done = targetHourData.doneItems;

    if (selectedSlot.branchKey) {
      created = created.filter((b) => {
        if (selectedSlot.branchKey === 'detham') return b.branchName === 'Đề Thám';
        if (selectedSlot.branchKey === 'pxl') return b.branchName === 'PXL' || b.branchName === 'Phan Xích Long';
        if (selectedSlot.branchKey === 'estella') return b.branchName === 'Estella';
        return true;
      });
      scheduled = scheduled.filter((c) => c.branchKey === selectedSlot.branchKey);
      missed = missed.filter((c) => c.branchKey === selectedSlot.branchKey);
      done = done.filter((c) => c.branchKey === selectedSlot.branchKey);
    }

    return { created, scheduled, missed, done };
  }, [selectedSlot, hourlyData]);

  const cardBg = themeMode === 'dark' ? '#141a29' : '#ffffff';
  const borderCol = themeMode === 'dark' ? '#26334d' : '#e2e8f0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* FILTER CONTROL BAR */}
      <Card
        size="small"
        style={{ background: cardBg, borderColor: borderCol, borderRadius: '10px' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarOutlined style={{ color: '#D4A84B', fontSize: '18px' }} />
            <span style={{ fontWeight: 'bold', fontSize: '15px', color: token.colorText }}>
              Tổng Quan Lịch Phân Giờ ({dateBounds?.label || selectedDate.format('DD/MM/YYYY')})
            </span>
          </div>

          <Space size="middle" style={{ flexWrap: 'wrap' }}>
            <Space size="small">
              <span style={{ fontSize: '12px', color: token.colorTextDescription }}>Chi nhánh:</span>
              <Select
                size="small"
                value={bookingBranch}
                onChange={setBookingBranch}
                style={{ width: '170px' }}
                options={[
                  { value: 'all', label: 'Tất cả chi nhánh' },
                  { value: 'detham', label: 'Chi nhánh Đề Thám' },
                  { value: 'pxl', label: 'Phan Xích Long' },
                  { value: 'estella', label: 'Estella' },
                ]}
              />
            </Space>

            <Space size="small">
              <span style={{ fontSize: '12px', color: token.colorTextDescription }}>Đội / Booker:</span>
              <Select
                size="small"
                showSearch
                allowClear
                placeholder="Tất cả Đội Nhóm & Booker"
                value={selectedBooker || 'all'}
                onChange={(val) => setSelectedBooker(val === 'all' ? null : val)}
                filterOption={vietnameseSearchFilter}
                style={{ width: '210px' }}
                options={groupedBookerOptions}
              />
              {setTeamModalVisible && (
                <Button
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => setTeamModalVisible(true)}
                  title="Cấu hình Phân Đội Nhóm Booker"
                />
              )}
            </Space>

            {/* Revenue View Toggle */}
            {setShowRevenueView && (
              <Button
                size="small"
                type={showRevenueView ? 'primary' : 'default'}
                icon={<DollarOutlined />}
                onClick={() => setShowRevenueView(!showRevenueView)}
                style={{
                  background: showRevenueView ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
                  borderColor: showRevenueView ? '#10b981' : undefined,
                  fontWeight: 'bold',
                }}
              >
                {showRevenueView ? '💰 Ẩn Doanh Thu' : '💰 Xem Doanh Thu'}
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* REVENUE VIEW SECTION (toggled) */}
      {showRevenueView && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '2px',
            borderRadius: '12px',
            background:
              themeMode === 'dark'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(6,182,212,0.05))'
                : 'linear-gradient(135deg, rgba(16,185,129,0.03), rgba(6,182,212,0.03))',
          }}
        >
          {/* Revenue KPI Cards */}
          <RevenueKpiCards
            themeMode={themeMode}
            token={token}
            summary={revenueData?.summary || null}
            loading={revenueLoading}
            onCardClick={(type) => {
              if (type === 'revenue' || type === 'combo') {
                setRevenueDetailContext({ type });
                setRevenueDetailOpen(true);
              }
            }}
          />

          {/* Revenue Hourly Chart + Branch Heatmap */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <RevenueHourlyChart
                themeMode={themeMode}
                token={token}
                hourlyBreakdown={revenueData?.hourlyBreakdown || []}
                dailyTarget={revenueData?.summary?.dailyTarget || 0}
                onBarClick={handleRevenueBarClick}
              />
            </Col>
            <Col xs={24} lg={8}>
              <RevenueBranchHeatmap
                themeMode={themeMode}
                token={token}
                branchHourlyMatrix={revenueData?.branchHourlyMatrix || []}
                onCellClick={handleRevenueCellClick}
              />
            </Col>
          </Row>
        </div>
      )}

      {/* SECTION 1: 4 INTERACTIVE KPI CARDS */}
      <Row gutter={[16, 16]}>
        {/* KPI 1: CREATED */}
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: themeMode === 'dark' ? '#0f172a' : '#f0f9ff',
              border: `1px solid ${themeMode === 'dark' ? '#1e3a8a' : '#bae6fd'}`,
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', textTransform: 'uppercase' }}>
                📝 CREATED (ĐÃ TẠO)
              </span>
              <Avatar size={28} style={{ backgroundColor: '#0284c7' }}>
                <FileAddOutlined />
              </Avatar>
            </div>
            <div
              style={{ fontSize: '28px', fontWeight: '800', color: token.colorText }}
              className="tabular-nums font-mono"
            >
              {totalCreated}{' '}
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>đơn</span>
            </div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>
              Đơn hàng được Booker tạo mới trong ngày
            </div>
          </div>
        </Col>

        {/* KPI 2: SCHEDULED */}
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: themeMode === 'dark' ? '#1c1917' : '#fffbe6',
              border: `1px solid ${themeMode === 'dark' ? '#78350f' : '#ffe58f'}`,
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#D4A84B', textTransform: 'uppercase' }}>
                📅 SCHEDULED (ĐÃ HẸN)
              </span>
              <Avatar size={28} style={{ backgroundColor: '#D4A84B' }}>
                <CalendarOutlined />
              </Avatar>
            </div>
            <div
              style={{ fontSize: '28px', fontWeight: '800', color: token.colorText }}
              className="tabular-nums font-mono"
            >
              {totalScheduled}{' '}
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>lượt</span>
            </div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>
              Lịch hẹn dự kiến khách đến cửa hàng
            </div>
          </div>
        </Col>

        {/* KPI 3: MISSED */}
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: themeMode === 'dark' ? '#1e1b1b' : '#fff1f0',
              border: `1px solid ${themeMode === 'dark' ? '#7f1d1d' : '#ffccc7'}`,
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff4d4f', textTransform: 'uppercase' }}>
                ⚠️ MISSED (LỠ HẸN)
              </span>
              <Avatar size={28} style={{ backgroundColor: '#ff4d4f' }}>
                <CloseCircleOutlined />
              </Avatar>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div
                style={{ fontSize: '28px', fontWeight: '800', color: token.colorText }}
                className="tabular-nums font-mono"
              >
                {totalMissed}
              </div>
              <Tag color="error" style={{ fontWeight: 'bold' }}>
                {missedRate}% missed
              </Tag>
            </div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>Khách không đến hoặc hủy lịch hẹn</div>
          </div>
        </Col>

        {/* KPI 4: DONE */}
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: themeMode === 'dark' ? '#062016' : '#f6ffed',
              border: `1px solid ${themeMode === 'dark' ? '#14532d' : '#b7eb8f'}`,
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#52c41a', textTransform: 'uppercase' }}>
                ✅ DONE (HOÀN THÀNH)
              </span>
              <Avatar size={28} style={{ backgroundColor: '#52c41a' }}>
                <CheckCircleOutlined />
              </Avatar>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div
                style={{ fontSize: '28px', fontWeight: '800', color: token.colorText }}
                className="tabular-nums font-mono"
              >
                {totalDone}
              </div>
              <Tag color="success" style={{ fontWeight: 'bold' }}>
                {completionRate}% done
              </Tag>
            </div>
            <div style={{ fontSize: '12px', color: token.colorTextDescription }}>Khách đã check-in / xong dịch vụ</div>
          </div>
        </Col>
      </Row>

      {/* SECTION 2: CHARTS ROW (Hourly Distribution & Status Breakdown) */}
      <Row gutter={[16, 16]}>
        {/* CHART 1: HOURLY DISTRIBUTION BAR CHART */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChartOutlined style={{ color: '#D4A84B' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    Phân Bố 4 Chỉ Số Theo Khung Giờ (08:00 - 21:00)
                  </span>
                </div>
                <Space size="small">
                  <span style={{ fontSize: '11px', color: '#0284c7' }}>● Created</span>
                  <span style={{ fontSize: '11px', color: '#D4A84B' }}>● Scheduled</span>
                  <span style={{ fontSize: '11px', color: '#ff4d4f' }}>● Missed</span>
                  <span style={{ fontSize: '11px', color: '#52c41a' }}>● Done</span>
                </Space>
              </div>
            }
            style={{ background: cardBg, borderColor: borderCol, borderRadius: '10px', height: '100%' }}
            styles={{ body: { padding: '20px 16px 12px 16px' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Visual Bars Matrix */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${HOURS.length}, 1fr)`,
                  gap: '8px',
                  alignItems: 'end',
                  minHeight: '180px',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${borderCol}`,
                }}
              >
                {hourlyData.map((d) => {
                  const hCreatedPct = (d.created / maxHourlyVal) * 100;
                  const hScheduledPct = (d.scheduled / maxHourlyVal) * 100;
                  const hMissedPct = (d.missed / maxHourlyVal) * 100;
                  const hDonePct = (d.done / maxHourlyVal) * 100;

                  return (
                    <div
                      key={d.hour}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        height: '100%',
                        justifyContent: 'flex-end',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedSlot({ hour: d.hour, type: 'all' })}
                    >
                      {/* Bar Group Container */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          gap: '2px',
                          width: '100%',
                          height: '150px',
                          justifyContent: 'center',
                          padding: '0 2px',
                        }}
                      >
                        {/* Created Bar */}
                        <Tooltip title={`Tạo lúc ${d.hour}: ${d.created} đơn`}>
                          <div
                            style={{
                              width: '22%',
                              height: `${Math.max(d.created > 0 ? 8 : 0, hCreatedPct)}%`,
                              background: '#0284c7',
                              borderRadius: '3px 3px 0 0',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </Tooltip>

                        {/* Scheduled Bar */}
                        <Tooltip title={`Hẹn ${d.hour}: ${d.scheduled} lượt`}>
                          <div
                            style={{
                              width: '22%',
                              height: `${Math.max(d.scheduled > 0 ? 8 : 0, hScheduledPct)}%`,
                              background: '#D4A84B',
                              borderRadius: '3px 3px 0 0',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </Tooltip>

                        {/* Missed Bar */}
                        <Tooltip title={`Lỡ ${d.hour}: ${d.missed} lượt`}>
                          <div
                            style={{
                              width: '22%',
                              height: `${Math.max(d.missed > 0 ? 8 : 0, hMissedPct)}%`,
                              background: '#ff4d4f',
                              borderRadius: '3px 3px 0 0',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </Tooltip>

                        {/* Done Bar */}
                        <Tooltip title={`Xong ${d.hour}: ${d.done} lượt`}>
                          <div
                            style={{
                              width: '22%',
                              height: `${Math.max(d.done > 0 ? 8 : 0, hDonePct)}%`,
                              background: '#52c41a',
                              borderRadius: '3px 3px 0 0',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </Tooltip>
                      </div>

                      {/* Hour Label */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: token.colorTextDescription,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {d.hour.split(':')[0]}h
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total Hourly Summary Indicator */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: token.colorTextDescription,
                }}
              >
                <span>
                  Khung giờ hoạt động: <strong>08:00 - 21:00</strong>
                </span>
                <span>Nhấp vào cột giờ để xem chi tiết danh sách khách</span>
              </div>
            </div>
          </Card>
        </Col>

        {/* CHART 2: STATUS & BRANCH BREAKDOWN */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChartOutlined style={{ color: '#D4A84B' }} />
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Tỷ Lệ Vận Hành & Chi Nhánh</span>
              </div>
            }
            style={{ background: cardBg, borderColor: borderCol, borderRadius: '10px', height: '100%' }}
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Circular Progress Gauge */}
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={completionRate}
                    size={85}
                    strokeColor="#52c41a"
                    format={(percent) => `${percent}%`}
                  />
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px', color: '#52c41a' }}>
                    Tỷ lệ Hoàn Thành
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={missedRate}
                    size={85}
                    strokeColor="#ff4d4f"
                    format={(percent) => `${percent}%`}
                  />
                  <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px', color: '#ff4d4f' }}>
                    Tỷ lệ Lỡ Hẹn
                  </div>
                </div>
              </div>

              {/* Branch Breakdown Progress Bars */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingTop: '8px',
                  borderTop: `1px solid ${borderCol}`,
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: token.colorTextDescription }}>
                  Phân Bổ Đơn Theo Chi Nhánh:
                </div>

                {Object.entries(BRANCH_CONFIG).map(([bKey, conf]) => {
                  const bCount = filteredComingList.filter((c) => c.branchKey === bKey).length;
                  const bPct = totalScheduled > 0 ? Math.round((bCount / totalScheduled) * 100) : 0;

                  return (
                    <div key={bKey} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ fontWeight: '500', color: token.colorText }}>{conf.name}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: token.colorTextDescription }}>
                          <strong>{bCount}</strong> lượt ({bPct}%)
                        </span>
                      </div>
                      <Progress percent={bPct} showInfo={false} strokeColor={conf.color} size="small" />
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* SECTION 3: INTERACTIVE HOURLY GRID MATRIX */}
      <Card
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClockCircleOutlined style={{ color: '#D4A84B' }} />
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                Ma Trận Lịch Phân Giờ Theo Chi Nhánh (Hourly Calendar Matrix)
              </span>
            </div>

            <Radio.Group
              value={matrixStatusFilter}
              onChange={(e) => setMatrixStatusFilter(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="all">Tất cả ({totalCreated + totalScheduled})</Radio.Button>
              <Radio.Button value="created">
                <span style={{ color: matrixStatusFilter === 'created' ? '#ffffff' : '#0284c7', fontWeight: 'bold' }}>
                  📝 Created ({totalCreated})
                </span>
              </Radio.Button>
              <Radio.Button value="scheduled">
                <span style={{ color: matrixStatusFilter === 'scheduled' ? '#ffffff' : '#D4A84B', fontWeight: 'bold' }}>
                  📅 Scheduled ({totalScheduled})
                </span>
              </Radio.Button>
              <Radio.Button value="missed">
                <span style={{ color: matrixStatusFilter === 'missed' ? '#ffffff' : '#ff4d4f', fontWeight: 'bold' }}>
                  ⚠️ Missed ({totalMissed})
                </span>
              </Radio.Button>
              <Radio.Button value="done">
                <span style={{ color: matrixStatusFilter === 'done' ? '#ffffff' : '#52c41a', fontWeight: 'bold' }}>
                  ✅ Done ({totalDone})
                </span>
              </Radio.Button>
            </Radio.Group>
          </div>
        }
        style={{ background: cardBg, borderColor: borderCol, borderRadius: '10px' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              color: token.colorText,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: `2px solid ${borderCol}`,
                  background: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
                }}
              >
                <th style={{ padding: '10px', textAlign: 'left', minWidth: '120px' }}>Chi nhánh</th>
                {HOURS.map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 4px',
                      textAlign: 'center',
                      minWidth: '78px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(BRANCH_CONFIG).map(([bKey, conf]) => (
                <tr key={bKey} style={{ borderBottom: `1px solid ${borderCol}` }}>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold', color: conf.color }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShopOutlined />
                      <span>{conf.name}</span>
                    </div>
                  </td>

                  {hourlyData.map((d) => {
                    const breakdown = d.branchBreakdown[bKey] || { created: 0, scheduled: 0, missed: 0, done: 0 };
                    const { created: c, scheduled: s, missed: m, done: dCount } = breakdown;
                    const cellSum = c + s + m + dCount;
                    const hasData = cellSum > 0;

                    const isVisible =
                      matrixStatusFilter === 'all' ||
                      (matrixStatusFilter === 'created' && c > 0) ||
                      (matrixStatusFilter === 'scheduled' && s > 0) ||
                      (matrixStatusFilter === 'missed' && m > 0) ||
                      (matrixStatusFilter === 'done' && dCount > 0);

                    const cPct = cellSum > 0 ? (c / cellSum) * 100 : 0;
                    const sPct = cellSum > 0 ? (s / cellSum) * 100 : 0;
                    const mPct = cellSum > 0 ? (m / cellSum) * 100 : 0;
                    const dPct = cellSum > 0 ? (dCount / cellSum) * 100 : 0;

                    const tooltipTitle = (
                      <div style={{ fontSize: '11px', lineHeight: '1.4', padding: '2px' }}>
                        <div
                          style={{
                            fontWeight: 'bold',
                            borderBottom: '1px solid #444',
                            paddingBottom: '2px',
                            marginBottom: '4px',
                          }}
                        >
                          Khung giờ {d.hour} - {conf.name}
                        </div>
                        <div>
                          📝 Đã tạo (Created): <strong>{c}</strong>
                        </div>
                        <div>
                          📅 Đã hẹn (Scheduled): <strong>{s}</strong>
                        </div>
                        <div>
                          ⚠️ Lỡ hẹn (Missed): <strong>{m}</strong>
                        </div>
                        <div>
                          ✅ Hoàn thành (Done): <strong>{dCount}</strong>
                        </div>
                      </div>
                    );

                    return (
                      <td
                        key={d.hour}
                        onClick={() =>
                          isVisible && setSelectedSlot({ hour: d.hour, branchKey: bKey, type: matrixStatusFilter })
                        }
                        style={{
                          padding: '8px 4px',
                          textAlign: 'center',
                          cursor: isVisible ? 'pointer' : 'default',
                          background: isVisible ? (themeMode === 'dark' ? '#1e293b77' : '#f1f5f9aa') : 'transparent',
                          opacity: isVisible ? 1 : 0.2,
                          transition: 'all 0.2s ease',
                          minWidth: '78px',
                        }}
                        className={isVisible ? 'hover:bg-amber-500/20' : ''}
                      >
                        <Tooltip title={tooltipTitle}>
                          {hasData ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                                alignItems: 'center',
                                width: '100%',
                              }}
                            >
                              {/* MINI STACKED PROGRESS BAR */}
                              <div
                                style={{
                                  display: 'flex',
                                  height: '6px',
                                  width: '100%',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                  background: themeMode === 'dark' ? '#334155' : '#e2e8f0',
                                }}
                              >
                                {c > 0 && <div style={{ width: `${cPct}%`, background: '#0284c7', height: '100%' }} />}
                                {s > 0 && <div style={{ width: `${sPct}%`, background: '#D4A84B', height: '100%' }} />}
                                {m > 0 && <div style={{ width: `${mPct}%`, background: '#ff4d4f', height: '100%' }} />}
                                {dCount > 0 && (
                                  <div style={{ width: `${dPct}%`, background: '#52c41a', height: '100%' }} />
                                )}
                              </div>

                              {/* NUMERIC PILLS */}
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '3px',
                                  flexWrap: 'wrap',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                }}
                              >
                                {(matrixStatusFilter === 'all' || matrixStatusFilter === 'created') && c > 0 && (
                                  <span
                                    style={{
                                      background: '#0284c722',
                                      color: '#0284c7',
                                      border: '1px solid #0284c744',
                                      padding: '0 4px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                      fontVariantNumeric: 'tabular-nums',
                                    }}
                                  >
                                    {c}
                                  </span>
                                )}
                                {(matrixStatusFilter === 'all' || matrixStatusFilter === 'scheduled') && s > 0 && (
                                  <span
                                    style={{
                                      background: '#D4A84B22',
                                      color: '#D4A84B',
                                      border: '1px solid #D4A84B44',
                                      padding: '0 4px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                      fontVariantNumeric: 'tabular-nums',
                                    }}
                                  >
                                    {s}
                                  </span>
                                )}
                                {(matrixStatusFilter === 'all' || matrixStatusFilter === 'missed') && m > 0 && (
                                  <span
                                    style={{
                                      background: '#ff4d4f22',
                                      color: '#ff4d4f',
                                      border: '1px solid #ff4d4f44',
                                      padding: '0 4px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                      fontVariantNumeric: 'tabular-nums',
                                    }}
                                  >
                                    {m}
                                  </span>
                                )}
                                {(matrixStatusFilter === 'all' || matrixStatusFilter === 'done') && dCount > 0 && (
                                  <span
                                    style={{
                                      background: '#52c41a22',
                                      color: '#52c41a',
                                      border: '1px solid #52c41a44',
                                      padding: '0 4px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                      fontVariantNumeric: 'tabular-nums',
                                    }}
                                  >
                                    {dCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span style={{ opacity: 0.2, fontSize: '11px' }}>-</span>
                          )}
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SLOT DETAIL MODAL */}
      <Modal
        open={!!selectedSlot}
        onCancel={() => setSelectedSlot(null)}
        footer={null}
        width={750}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClockCircleOutlined style={{ color: '#D4A84B' }} />
            <span>
              Chi Tiết Lịch Hẹn Khung Giờ {selectedSlot?.hour}
              {selectedSlot?.branchKey && ` - ${BRANCH_CONFIG[selectedSlot.branchKey]?.name}`}
            </span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '12px' }}>
          {/* Scheduled / Coming list */}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#D4A84B', marginBottom: '8px' }}>
              📅 Lịch Hẹn Khách Đến ({modalSlotItems.scheduled.length} lượt)
            </div>
            {modalSlotItems.scheduled.length === 0 ? (
              <Text type="secondary">Không có lịch hẹn trong khung giờ này.</Text>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}
              >
                {modalSlotItems.scheduled.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${borderCol}`,
                    }}
                  >
                    <Space size="middle">
                      <Avatar style={{ backgroundColor: item.avatarColor || '#1890ff' }}>
                        {item.customer ? item.customer[0]?.toUpperCase() : 'K'}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{item.customer}</div>
                        <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                          {item.phone} | Booker: <strong>{item.booker}</strong> | CV: {item.cv || '-'}
                        </div>
                      </div>
                    </Space>

                    <Space size="small">
                      <Tag
                        color={item.status === 'completed' ? 'success' : item.status === 'late' ? 'error' : 'warning'}
                      >
                        {item.status.toUpperCase()}
                      </Tag>
                      <Button
                        size="small"
                        icon={<PhoneOutlined />}
                        onClick={() => makeCall(item.phone)}
                        title="Gọi OmiCall"
                      />
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          setSelectedSlot(null);
                          openCustomerDrawer(item);
                        }}
                        title="Xem chi tiết"
                      />
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Created List */}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0284c7', marginBottom: '8px' }}>
              📝 Đơn Hàng Được Tạo Trong Khung Giờ Này ({modalSlotItems.created.length} đơn)
            </div>
            {modalSlotItems.created.length === 0 ? (
              <Text type="secondary">Không có đơn tạo mới trong giờ này.</Text>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}
              >
                {modalSlotItems.created.map((b) => (
                  <div
                    key={b.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: themeMode === 'dark' ? '#0f172a' : '#f0f9ff',
                      border: `1px solid ${borderCol}`,
                    }}
                  >
                    <Space size="middle">
                      <Avatar style={{ backgroundColor: '#0284c7' }}>
                        {b.customer ? b.customer[0]?.toUpperCase() : 'K'}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{b.customer}</div>
                        <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                          Booker: <strong>{b.booker}</strong> | Kênh: {b.channel || 'FB'} | Tạo: {b.createdTime}
                        </div>
                      </div>
                    </Space>

                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        setSelectedSlot(null);
                        openCustomerDrawer(b);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* REVENUE DETAIL MODAL */}
      <RevenueDetailModal
        themeMode={themeMode}
        token={token}
        open={revenueDetailOpen}
        onClose={() => {
          setRevenueDetailOpen(false);
          setRevenueDetailContext(null);
        }}
        context={revenueDetailContext}
        dateFrom={dateBounds?.dateFrom || selectedDate.format('YYYY-MM-DD')}
        dateTo={dateBounds?.dateTo || selectedDate.format('YYYY-MM-DD')}
        openCustomerDrawer={openCustomerDrawer}
      />
    </div>
  );
}
