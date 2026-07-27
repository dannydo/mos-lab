'use client';

import React from 'react';
import { Card, Radio, Button, DatePicker, Segmented, Input, theme } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useTheme } from '../../../../context/ThemeContext';

dayjs.extend(isoWeek);

const { RangePicker } = DatePicker;

export type CatalogViewMode = 'day' | 'week' | 'month' | 'custom';
export type CatalogFilterItemType = 'all' | 'service' | 'combo' | 'product';

interface CatalogDateToolbarProps {
  viewMode: CatalogViewMode;
  onViewModeChange: (mode: CatalogViewMode) => void;
  referenceDate: Dayjs;
  onNavigateDate: (direction: number) => void;
  onToday: () => void;
  customDates: [Dayjs | null, Dayjs | null];
  onCustomDatesChange: (dates: [Dayjs | null, Dayjs | null]) => void;
  itemType: CatalogFilterItemType;
  onItemTypeChange: (type: CatalogFilterItemType) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export default function CatalogDateToolbar({
  viewMode,
  onViewModeChange,
  referenceDate,
  onNavigateDate,
  onToday,
  customDates,
  onCustomDatesChange,
  itemType,
  onItemTypeChange,
  search,
  onSearchChange,
}: CatalogDateToolbarProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  // Period label generator matching CC Dashboard style
  const getPeriodLabel = () => {
    if (viewMode === 'month') {
      return `Tháng ${referenceDate.format('MM/YYYY')}`;
    }
    if (viewMode === 'week') {
      const weekNum = referenceDate.isoWeek();
      return `Tuần ${weekNum} (${referenceDate.startOf('isoWeek').format('DD/MM')} - ${referenceDate.endOf('isoWeek').format('DD/MM/YYYY')})`;
    }
    if (viewMode === 'day') {
      return referenceDate.format('DD/MM/YYYY');
    }
    return 'Khoảng ngày chọn';
  };

  return (
    <Card
      size="small"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
      className="rounded-xl shadow-sm mb-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-1">
        {/* Left Side: Date Navigation Controls (CC Dashboard Style) */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode !== 'custom' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <Button
                type="text"
                size="small"
                icon={<LeftOutlined />}
                onClick={() => onNavigateDate(-1)}
                className="hover:bg-slate-200 dark:hover:bg-slate-700"
              />
              <span className="font-bold text-xs px-2 tabular-nums min-w-[120px] text-center text-slate-700 dark:text-slate-200">
                {getPeriodLabel()}
              </span>
              <Button
                type="text"
                size="small"
                icon={<RightOutlined />}
                onClick={() => onNavigateDate(1)}
                className="hover:bg-slate-200 dark:hover:bg-slate-700"
              />
            </div>
          )}

          <Button
            size="small"
            type="default"
            onClick={onToday}
            className="font-semibold text-xs text-amber-500 border-amber-500/30 hover:border-amber-500"
          >
            Hôm nay
          </Button>

          <Radio.Group
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="day">Ngày</Radio.Button>
            <Radio.Button value="week">Tuần</Radio.Button>
            <Radio.Button value="month">Tháng</Radio.Button>
            <Radio.Button value="custom">Tùy chọn</Radio.Button>
          </Radio.Group>

          {viewMode === 'custom' && (
            <RangePicker
              size="small"
              format="DD/MM/YYYY"
              value={customDates as any}
              onChange={(dates) => onCustomDatesChange(dates as any)}
              className="w-60"
            />
          )}
        </div>

        {/* Right Side: Catalog Type Toggle & Search Input */}
        <div className="flex flex-wrap items-center gap-3 ms-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <FilterOutlined className="text-blue-500" />
              Loại Catalog:
            </span>
            <Segmented<CatalogFilterItemType>
              options={[
                { label: 'Tất cả', value: 'all' },
                { label: 'Dịch vụ', value: 'service' },
                { label: 'Combo', value: 'combo' },
                { label: 'Sản phẩm', value: 'product' },
              ]}
              value={itemType}
              onChange={(val) => onItemTypeChange(val as CatalogFilterItemType)}
              size="small"
            />
          </div>

          <Input
            placeholder="Tìm kiếm Dịch vụ / Combo / Sản phẩm..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            size="small"
            className="w-60"
          />
        </div>
      </div>
    </Card>
  );
}
