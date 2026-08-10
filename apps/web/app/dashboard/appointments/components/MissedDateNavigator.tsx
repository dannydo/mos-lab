'use client';

import React from 'react';
import { Radio, Button, DatePicker, Select, Space, Typography, theme } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTheme } from '../../../../context/ThemeContext';

dayjs.extend(isoWeek);

const { Text } = Typography;

export interface MissedDateNavigatorProps {
  viewMode: 'month' | 'week' | 'day';
  onViewModeChange: (mode: 'month' | 'week' | 'day') => void;
  referenceDate: Dayjs;
  onNavigate: (direction: number) => void;
  onResetToday: () => void;
  selectedStore: string;
  onStoreChange: (storeId: string) => void;
  stores?: Array<{ id: string; name: string }>;
}

export default function MissedDateNavigator({
  viewMode,
  onViewModeChange,
  referenceDate,
  onNavigate,
  onResetToday,
  selectedStore,
  onStoreChange,
  stores = [
    { id: 'ALL', name: 'Tất cả chi nhánh' },
    { id: '6', name: 'Đề Thám' },
    { id: '16', name: 'Estella Place' },
  ],
}: MissedDateNavigatorProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const getPeriodLabel = () => {
    if (viewMode === 'month') {
      return `Tháng ${referenceDate.format('MM/YYYY')}`;
    }
    if (viewMode === 'week') {
      const weekNum = referenceDate.isoWeek();
      const startStr = referenceDate.startOf('isoWeek').format('DD/MM');
      const endStr = referenceDate.endOf('isoWeek').format('DD/MM/YYYY');
      return `Tuần ${weekNum} (${startStr} - ${endStr})`;
    }
    return referenceDate.format('DD/MM/YYYY');
  };

  return (
    <div
      className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition-all duration-200 ${
        themeMode === 'dark' ? 'bg-[#141414] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Left: View Mode Segmented + Nav Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Radio.Group
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="day">Ngày</Radio.Button>
          <Radio.Button value="week">Tuần</Radio.Button>
          <Radio.Button value="month">Tháng</Radio.Button>
        </Radio.Group>

        <Space size={6}>
          <Button icon={<LeftOutlined />} onClick={() => onNavigate(-1)} size="middle" title="Kỳ trước" />
          <Button onClick={onResetToday} size="middle" icon={<CalendarOutlined />}>
            Hôm nay
          </Button>
          <Button icon={<RightOutlined />} onClick={() => onNavigate(1)} size="middle" title="Kỳ sau" />
        </Space>

        <div
          className="px-3 py-1.5 rounded-lg border font-semibold text-sm flex items-center gap-2 tabular-nums"
          style={{
            borderColor: themeMode === 'dark' ? '#303030' : '#e5e7eb',
            background: themeMode === 'dark' ? '#1f1f1f' : '#f9fafb',
            color: token.colorText,
          }}
        >
          <CalendarOutlined className="text-amber-500" />
          <span>{getPeriodLabel()}</span>
        </div>
      </div>

      {/* Right: Store Filter */}
      <div className="flex items-center gap-2">
        <Text type="secondary" className="text-xs flex items-center gap-1">
          <FilterOutlined /> Chi nhánh:
        </Text>
        <Select
          value={selectedStore}
          onChange={onStoreChange}
          style={{ width: 180 }}
          size="middle"
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>
    </div>
  );
}
