'use client';

import { TableIndexHeader } from '~/components/ui';

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Segmented,
  DatePicker,
  Input,
  Table,
  Tag,
  Button,
  Tooltip,
  Typography,
  Progress,
  Space,
  Empty,
  Spin,
  Badge,
  Avatar,
} from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  CustomerServiceOutlined,
  FilterOutlined,
  UserOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  AimOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTheme } from '../../../../context/ThemeContext';
import { Staff, LocaStaffActivityStats, LocaStaffActivityLogItem } from '@mos-lab/shared';

dayjs.extend(isoWeek);

const { Text, Title } = Typography;

export interface LocaStaffActivityTabProps {
  staffList: Staff[];
  selectedStaffId: string;
  onSelectStaff: (staffId: string) => void;
  viewMode: 'month' | 'week' | 'day';
  onViewModeChange: (mode: 'month' | 'week' | 'day') => void;
  referenceDate: dayjs.Dayjs;
  onNavigateDate: (direction: number) => void;
  onReferenceDateChange: (date: dayjs.Dayjs) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  actionTypeFilter: string;
  onActionTypeChange: (val: string) => void;
  selectedTouchpointKey?: string;
  onTouchpointKeyChange?: (key: string) => void;
  stats: LocaStaffActivityStats | null;
  logs: LocaStaffActivityLogItem[];
  loading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenCustomerDetail: (customerId: number) => void;
}

export const LocaStaffActivityTab: React.FC<LocaStaffActivityTabProps> = ({
  staffList,
  selectedStaffId,
  onSelectStaff,
  viewMode,
  onViewModeChange,
  referenceDate,
  onNavigateDate,
  onReferenceDateChange,
  searchQuery,
  onSearchChange,
  actionTypeFilter,
  onActionTypeChange,
  selectedTouchpointKey = 'ALL',
  onTouchpointKeyChange,
  stats,
  logs,
  loading,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onOpenCustomerDetail,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const toggleAudio = (id: string, url?: string | null) => {
    if (!url) return;
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      window.open(url, '_blank');
    }
  };

  const cardStyle = {
    background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
    borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : '#e2e8f0',
    borderRadius: '12px',
  };

  // Stepper Label Generator matching Hình 1
  const getPeriodLabel = () => {
    if (viewMode === 'month') {
      return `Tháng ${referenceDate.format('MM/YYYY')}`;
    }
    if (viewMode === 'week') {
      const start = referenceDate.startOf('isoWeek').format('DD/MM');
      const end = referenceDate.endOf('isoWeek').format('DD/MM/YYYY');
      return `${start} - ${end}`;
    }
    return referenceDate.format('DD/MM/YYYY');
  };

  const getActionTag = (actionType: string) => {
    switch (actionType) {
      case 'CALL':
        return (
          <Tag icon={<PhoneOutlined />} color="emerald" className="inline-flex items-center gap-1 font-medium">
            Cuộc gọi
          </Tag>
        );
      case 'TOUCHPOINT':
        return (
          <Tag icon={<CheckCircleOutlined />} color="blue" className="inline-flex items-center gap-1 font-medium">
            Điểm chạm
          </Tag>
        );
      case 'BOOKED':
        return (
          <Tag icon={<CalendarOutlined />} color="purple" className="inline-flex items-center gap-1 font-medium">
            Đặt lịch
          </Tag>
        );
      default:
        return (
          <Tag
            icon={<CustomerServiceOutlined />}
            color="default"
            className="inline-flex items-center gap-1 font-medium"
          >
            Tương tác
          </Tag>
        );
    }
  };

  const columns = [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" className="tabular-nums font-mono">
          {(currentPage - 1) * pageSize + index + 1}
        </Text>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 140,
      sorter: (a: LocaStaffActivityLogItem, b: LocaStaffActivityLogItem) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (val: string) => (
        <Text className="tabular-nums font-mono text-xs">{dayjs(val).format('DD/MM/YYYY HH:mm')}</Text>
      ),
    },
    {
      title: 'Nhân viên',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 140,
      sorter: (a: LocaStaffActivityLogItem, b: LocaStaffActivityLogItem) =>
        a.staffName.localeCompare(b.staffName, 'vi'),
      render: (val: string) => (
        <Space size={4}>
          <UserOutlined className="text-slate-400" />
          <Text strong>{val}</Text>
        </Space>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 230,
      align: 'left' as const,
      sorter: (a: LocaStaffActivityLogItem, b: LocaStaffActivityLogItem) =>
        a.customerName.localeCompare(b.customerName, 'vi'),
      render: (record: LocaStaffActivityLogItem) => {
        const rawName = (record.customerName || 'Khách hàng').trim();
        const firstLetter = rawName.charAt(0).toUpperCase();

        const avatarColors = [
          '#10B981',
          '#3B82F6',
          '#6366F1',
          '#8B5CF6',
          '#EC4899',
          '#F59E0B',
          '#14B8A6',
          '#06B6D4',
          '#64748B',
          '#D97706',
        ];
        const colorIndex = firstLetter.charCodeAt(0) % avatarColors.length;
        const bgGradient = avatarColors[colorIndex];

        return (
          <div className="flex items-center gap-2 py-0.5 text-left">
            <Avatar
              src={record.customerAvatar || undefined}
              size={28}
              className="flex-shrink-0 font-bold shadow-sm border border-slate-700/40 text-xs"
              style={{
                backgroundColor: record.customerAvatar ? undefined : bgGradient,
                color: '#ffffff',
                verticalAlign: 'middle',
              }}
            >
              {!record.customerAvatar ? firstLetter : null}
            </Avatar>

            <div className="flex flex-col items-start min-w-0 text-left leading-tight">
              <Button
                type="link"
                size="small"
                className="p-0 h-auto text-left justify-start font-semibold text-xs hover:underline truncate max-w-[140px] inline-flex items-center"
                style={{ color: isDark ? '#38bdf8' : '#0284c7', textAlign: 'left', justifyContent: 'flex-start' }}
                onClick={() => onOpenCustomerDetail(record.legacyUserId)}
              >
                {record.customerName}
              </Button>
              <Text
                type="secondary"
                className="text-[11px] tabular-nums font-mono flex items-center justify-start gap-1 text-slate-400 text-left"
              >
                <PhoneOutlined className="text-[9px] text-slate-500" />
                {record.customerPhone}
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Hành động',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 130,
      sorter: (a: LocaStaffActivityLogItem, b: LocaStaffActivityLogItem) => a.actionType.localeCompare(b.actionType),
      render: (val: string) => getActionTag(val),
    },
    {
      title: 'Chi tiết tương tác',
      key: 'actionDetail',
      render: (record: LocaStaffActivityLogItem) => (
        <div className="flex flex-col gap-1">
          <Text className="text-sm">{record.actionDetail}</Text>
          {record.durationSec && record.durationSec > 0 ? (
            <Text type="secondary" className="text-xs tabular-nums font-mono flex items-center gap-1">
              <ClockCircleOutlined /> Thời lượng thoại: {Math.floor(record.durationSec / 60)}m {record.durationSec % 60}
              s
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (record: LocaStaffActivityLogItem) => (
        <Space size="small">
          {record.recordingUrl ? (
            <Tooltip title="Nghe ghi âm cuộc gọi">
              <Button
                type="text"
                size="small"
                icon={<PlayCircleOutlined className="text-emerald-500 text-lg" />}
                onClick={() => toggleAudio(record.id, record.recordingUrl)}
              />
            </Tooltip>
          ) : null}
          <Tooltip title="Xem chi tiết khách hàng">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined className="text-blue-500 text-base" />}
              onClick={() => onOpenCustomerDetail(record.legacyUserId)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Filters Bar - Navigation hình 1 */}
      <Card style={cardStyle} bodyStyle={{ padding: '14px 20px' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} lg={15}>
            <Space wrap size="middle">
              {/* Select Nhân sự */}
              <div className="flex items-center gap-2">
                <Text type="secondary" className="font-medium text-xs uppercase tracking-wider">
                  Nhân sự:
                </Text>
                <Select
                  value={selectedStaffId}
                  onChange={onSelectStaff}
                  style={{ width: 170 }}
                  placeholder="Chọn nhân viên"
                  options={[
                    { value: 'ALL', label: 'Tất cả Nhân sự CS' },
                    ...staffList
                      .filter(
                        (s) =>
                          !['security-guard', 'office-cleaner', 'teacher', 'ktv'].includes((s.role || '').toLowerCase())
                      )
                      .map((s) => ({
                        value: String(s.id),
                        label: s.displayName || s.username,
                      })),
                  ]}
                />
              </div>

              {/* Navigation Controls Matching Hình 1 */}
              <div className="flex items-center gap-3">
                {/* Left Segmented: [Tháng | Tuần | Ngày] với Nền Gold/Amber */}
                <div className="custom-gold-segmented">
                  <Segmented
                    value={viewMode}
                    onChange={(val) => onViewModeChange(val as any)}
                    options={[
                      { label: 'Tháng', value: 'month' },
                      { label: 'Tuần', value: 'week' },
                      { label: 'Ngày', value: 'day' },
                    ]}
                    style={{
                      background: isDark ? '#141a29' : '#f1f5f9',
                      border: `1px solid ${isDark ? '#262c3d' : '#cbd5e1'}`,
                      borderRadius: '8px',
                      padding: '3px',
                    }}
                  />
                </div>

                {/* Right Stepper Box: [< | Tháng 07/2026 📅 | >] */}
                <div
                  className="inline-flex items-center rounded-lg overflow-hidden border transition-all"
                  style={{
                    background: isDark ? '#141a29' : '#ffffff',
                    borderColor: isDark ? '#262c3d' : '#cbd5e1',
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<LeftOutlined style={{ fontSize: '11px' }} />}
                    onClick={() => onNavigateDate(-1)}
                    className="px-2.5 h-8 text-slate-300 hover:text-amber-400 border-r border-slate-700/50 rounded-none"
                    aria-label="Kỳ trước"
                  />

                  <Button
                    type="text"
                    size="small"
                    onClick={() => setPickerOpen(true)}
                    className="px-3.5 h-8 font-semibold text-xs tabular-nums text-slate-200 hover:text-amber-400 flex items-center gap-2 rounded-none"
                    aria-label="Chọn thời gian"
                  >
                    <span>{getPeriodLabel()}</span>
                    <CalendarOutlined style={{ color: '#D4A84B', fontSize: '13px' }} />
                  </Button>

                  <Button
                    type="text"
                    size="small"
                    icon={<RightOutlined style={{ fontSize: '11px' }} />}
                    onClick={() => onNavigateDate(1)}
                    className="px-2.5 h-8 text-slate-300 hover:text-amber-400 border-l border-slate-700/50 rounded-none"
                    aria-label="Kỳ sau"
                  />
                </div>

                {/* Hidden DatePicker Popover */}
                {pickerOpen && (
                  <DatePicker
                    open={true}
                    picker={viewMode === 'month' ? 'month' : viewMode === 'week' ? 'week' : 'date'}
                    value={referenceDate}
                    onChange={(date) => {
                      if (date) onReferenceDateChange(date);
                      setPickerOpen(false);
                    }}
                    onOpenChange={(open) => {
                      if (!open) setPickerOpen(false);
                    }}
                    style={{ display: 'none' }}
                  />
                )}
              </div>
            </Space>
          </Col>

          <Col xs={24} lg={9} className="flex justify-end gap-3">
            <Input
              placeholder="Tìm theo tên/SĐT khách hàng hoặc NV..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />

            <Select
              value={actionTypeFilter}
              onChange={onActionTypeChange}
              style={{ width: 140 }}
              options={[
                { value: 'ALL', label: 'Tất cả Hành động' },
                { value: 'CALL', label: '📞 Cuộc gọi' },
                { value: 'TOUCHPOINT', label: '✅ Điểm chạm' },
                { value: 'BOOKED', label: '📅 Đặt lịch' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* SEAMLESS MINIMALIST DASHBOARD HEADER (COMPACT HIGH-DENSITY BAR) */}
      <div
        className={`rounded-2xl p-3 space-y-2.5 mb-4 border transition-all ${
          isDark
            ? 'bg-slate-900/60 border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* ROW 1: 5 STAT METRIC PILLS */}
        <div className="grid grid-cols-5 gap-2">
          {/* Card 1: Tổng Cuộc Gọi */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onActionTypeChange(actionTypeFilter === 'CALL' ? 'ALL' : 'CALL')}
            title="Nhấn để lọc các hành động Cuộc Gọi"
            className={`rounded-xl border px-3 py-2 cursor-pointer select-none transition-all duration-200 hover:scale-[1.01] ${
              actionTypeFilter === 'CALL'
                ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold'
                : isDark
                  ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <Text
                  type="secondary"
                  className={`text-[10px] uppercase font-semibold tracking-wider block truncate ${
                    actionTypeFilter === 'CALL' ? 'text-emerald-400 font-bold' : ''
                  }`}
                >
                  ∑ Cuộc Gọi
                </Text>
                <div className="text-base font-bold mt-0.5 tabular-nums flex items-baseline gap-1">
                  <span>{stats?.totalCalls || 0}</span>
                  <span className="text-[10px] font-normal text-slate-400">cuộc</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex-shrink-0 flex items-center justify-center text-emerald-500 text-[11px]">
                <PhoneOutlined />
              </div>
            </div>
          </div>

          {/* Card 2: Tỷ Lệ Bắt Máy */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onActionTypeChange(actionTypeFilter === 'CALL' ? 'ALL' : 'CALL')}
            title="Nhấn để lọc các cuộc gọi"
            className={`rounded-xl border px-3 py-2 cursor-pointer select-none transition-all duration-200 hover:scale-[1.01] flex flex-col justify-between ${
              actionTypeFilter === 'CALL'
                ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold'
                : isDark
                  ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <Text
                  type="secondary"
                  className={`text-[10px] uppercase font-semibold tracking-wider block truncate ${
                    actionTypeFilter === 'CALL' ? 'text-emerald-400 font-bold' : ''
                  }`}
                >
                  Tỷ Lệ Bắt Máy
                </Text>
                <div className="text-base font-bold mt-0.5 tabular-nums text-emerald-500">
                  {stats?.answerRate || 0}%
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex-shrink-0 flex items-center justify-center text-blue-500 text-[11px]">
                <CustomerServiceOutlined />
              </div>
            </div>
            <Progress
              percent={stats?.answerRate || 0}
              showInfo={false}
              strokeColor="#10B981"
              size="small"
              className="mt-0.5 mb-0"
            />
          </div>

          {/* Card 3: Điểm Chạm Đã Xử Lý */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onActionTypeChange(actionTypeFilter === 'TOUCHPOINT' ? 'ALL' : 'TOUCHPOINT')}
            title="Nhấn để lọc các hành động Điểm Chạm"
            className={`rounded-xl border px-3 py-2 cursor-pointer select-none transition-all duration-200 hover:scale-[1.01] ${
              actionTypeFilter === 'TOUCHPOINT'
                ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.2)] font-bold'
                : isDark
                  ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <Text
                  type="secondary"
                  className={`text-[10px] uppercase font-semibold tracking-wider block truncate ${
                    actionTypeFilter === 'TOUCHPOINT' ? 'text-indigo-400 font-bold' : ''
                  }`}
                >
                  Điểm Chạm Đã Xử Lý
                </Text>
                <div className="text-base font-bold mt-0.5 tabular-nums text-blue-500 flex items-baseline gap-1">
                  <span>{stats?.totalTouchpointsChecked || 0}</span>
                  <span className="text-[10px] font-normal text-slate-400">chạm</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex-shrink-0 flex items-center justify-center text-indigo-500 text-[11px]">
                <CheckCircleOutlined />
              </div>
            </div>
          </div>

          {/* Card 4: Chốt Booked Thành Công */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onActionTypeChange(actionTypeFilter === 'BOOKED' ? 'ALL' : 'BOOKED')}
            title="Nhấn để lọc các đơn Đặt Lịch Hẹn"
            className={`rounded-xl border px-3 py-2 cursor-pointer select-none transition-all duration-200 hover:scale-[1.01] ${
              actionTypeFilter === 'BOOKED'
                ? 'border-purple-400 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.2)] font-bold'
                : isDark
                  ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <Text
                  type="secondary"
                  className={`text-[10px] uppercase font-semibold tracking-wider block truncate ${
                    actionTypeFilter === 'BOOKED' ? 'text-purple-400 font-bold' : ''
                  }`}
                >
                  Chốt Booked Thành Công
                </Text>
                <div className="text-base font-bold mt-0.5 tabular-nums text-purple-500 flex items-baseline gap-1">
                  <span>{stats?.totalBooked || 0}</span>
                  <span className="text-[10px] font-normal text-slate-400">đơn</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-purple-500/10 flex-shrink-0 flex items-center justify-center text-purple-500 text-[11px]">
                <CalendarOutlined />
              </div>
            </div>
          </div>

          {/* Card 5: Tổng Thời Lượng Thoại */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onActionTypeChange(actionTypeFilter === 'CALL' ? 'ALL' : 'CALL')}
            title="Nhấn để lọc các cuộc gọi thoại"
            className={`rounded-xl border px-3 py-2 cursor-pointer select-none transition-all duration-200 hover:scale-[1.01] ${
              actionTypeFilter === 'CALL'
                ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-bold'
                : isDark
                  ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <Text
                  type="secondary"
                  className={`text-[10px] uppercase font-semibold tracking-wider block truncate ${
                    actionTypeFilter === 'CALL' ? 'text-amber-400 font-bold' : ''
                  }`}
                >
                  Thời Lượng Thoại
                </Text>
                <div className="text-sm font-bold mt-0.5 tabular-nums text-amber-500 truncate">
                  {stats?.formattedDuration || '0m 00s'}
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex-shrink-0 flex items-center justify-center text-amber-500 text-[11px]">
                <ClockCircleOutlined />
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: TOUCHPOINT SEGMENTED CHIPS (LEFT) & MINI FUNNEL (RIGHT) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          {/* TOUCHPOINTS SEGMENTED CHIPS */}
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] py-0.5">
            <Text
              type="secondary"
              className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0"
            >
              Mốc Chạm:
            </Text>
            {[
              { key: '24h', label: '24h', color: '#10B981' },
              { key: '17', label: 'Chạm 17', color: '#3B82F6' },
              { key: '19', label: 'Chạm 19', color: '#6366F1' },
              { key: '21', label: 'Chạm 21', color: '#8B5CF6' },
              { key: '23', label: 'Chạm 23', color: '#EC4899' },
              { key: '25', label: 'Chạm 25', color: '#F43F5E' },
              { key: '30', label: 'Chạm 30', color: '#EF4444' },
              { key: '30plus', label: 'Chạm 30+', color: '#D97706' },
            ].map((item) => {
              const count = stats?.touchpointBreakdown?.[item.key] || 0;
              const isSelected = selectedTouchpointKey === item.key;
              const isZero = count === 0;

              return (
                <div
                  key={item.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => onTouchpointKeyChange?.(isSelected ? 'ALL' : item.key)}
                  title={`Nhấn để lọc mốc ${item.label}`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all duration-200 flex-shrink-0 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400/15 text-amber-300 font-bold shadow-[0_0_10px_rgba(251,191,36,0.25)] scale-[1.03]'
                      : isZero
                        ? 'border-transparent bg-slate-800/30 text-slate-500 opacity-50 hover:opacity-100 hover:border-slate-700'
                        : isDark
                          ? 'border-slate-700/50 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="font-medium text-[10px]">{item.label}</span>
                  <span
                    className={`font-bold tabular-nums text-[11px] rounded px-1 ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-300'
                        : isZero
                          ? 'bg-slate-700/30 text-slate-500'
                          : 'bg-slate-900/40'
                    }`}
                    style={{ color: isSelected ? '#F59E0B' : isZero ? undefined : item.color }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* MINI CONVERSION FUNNEL BARS */}
          <div className="flex items-center gap-1.5 flex-shrink-0 xl:border-l border-slate-800/60 xl:pl-2.5">
            <Text type="secondary" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-0.5">
              Phễu:
            </Text>

            {/* Funnel 1 */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onActionTypeChange(actionTypeFilter === 'CALL' ? 'ALL' : 'CALL')}
              title="Nhấn để lọc Cuộc gọi"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                actionTypeFilter === 'CALL'
                  ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400 font-bold'
                  : 'border-transparent text-slate-400 hover:bg-slate-800/40'
              }`}
            >
              <span className="text-[10px]">Gọi→Bắt:</span>
              <span className="font-bold tabular-nums text-emerald-400 text-[11px]">
                {stats?.conversionRates?.callToAnswer || 0}%
              </span>
            </div>

            {/* Funnel 2 */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onActionTypeChange(actionTypeFilter === 'TOUCHPOINT' ? 'ALL' : 'TOUCHPOINT')}
              title="Nhấn để lọc Điểm chạm"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                actionTypeFilter === 'TOUCHPOINT'
                  ? 'border-blue-400 bg-blue-500/10 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:bg-slate-800/40'
              }`}
            >
              <span className="text-[10px]">Bắt→Chạm:</span>
              <span className="font-bold tabular-nums text-blue-400 text-[11px]">
                {stats?.conversionRates?.answerToTouchpoint || 0}%
              </span>
            </div>

            {/* Funnel 3 */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onActionTypeChange(actionTypeFilter === 'BOOKED' ? 'ALL' : 'BOOKED')}
              title="Nhấn để lọc Chốt Booked"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                actionTypeFilter === 'BOOKED'
                  ? 'border-purple-400 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-transparent text-slate-400 hover:bg-slate-800/40'
              }`}
            >
              <span className="text-[10px]">Chạm→Booked:</span>
              <span className="font-bold tabular-nums text-purple-400 text-[11px]">
                {stats?.conversionRates?.touchpointToBooked || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Block 4: Activity Log Table */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <Space className="text-base font-semibold">
              <ClockCircleOutlined className="text-amber-500" />
              <span>Nhật ký Hành động Chi tiết Nhân viên</span>
            </Space>
            <div className="flex items-center gap-2">
              {(actionTypeFilter !== 'ALL' || (selectedTouchpointKey && selectedTouchpointKey !== 'ALL')) && (
                <Tag
                  closable
                  onClose={() => {
                    onActionTypeChange('ALL');
                    onTouchpointKeyChange?.('ALL');
                  }}
                  color="blue"
                  className="font-semibold text-xs cursor-pointer m-0"
                >
                  Đang lọc:{' '}
                  {actionTypeFilter !== 'ALL'
                    ? actionTypeFilter === 'CALL'
                      ? '📞 Cuộc gọi'
                      : actionTypeFilter === 'TOUCHPOINT'
                        ? '✅ Điểm chạm'
                        : '📅 Đặt lịch'
                    : ''}
                  {actionTypeFilter !== 'ALL' && selectedTouchpointKey && selectedTouchpointKey !== 'ALL' ? ' + ' : ''}
                  {selectedTouchpointKey && selectedTouchpointKey !== 'ALL'
                    ? selectedTouchpointKey === '30plus'
                      ? 'Chạm 30+'
                      : selectedTouchpointKey === '24h'
                        ? '24h'
                        : `Chạm ${selectedTouchpointKey}`
                    : ''}{' '}
                  (Bấm ✖ để xóa lọc)
                </Tag>
              )}
              <Text type="secondary" className="text-xs font-normal tabular-nums">
                Tổng số tương tác: <strong className="text-blue-500">{total}</strong>
              </Text>
            </div>
          </div>
        }
        style={cardStyle}
      >
        <Table
          size="small"
          columns={columns}
          dataSource={logs}
          rowKey={(record, index) => (record.id ? `${record.id}_${index}` : String(index))}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t, range) => `${range[0]}-${range[1]} của ${t} mục`,
            onChange: onPageChange,
          }}
          scroll={{ x: 900 }}
          className="custom-activity-table"
        />
      </Card>
    </div>
  );
};
