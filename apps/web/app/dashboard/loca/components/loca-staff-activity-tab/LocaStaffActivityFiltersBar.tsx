'use client';

import React, { useMemo, useState } from 'react';
import { Button, Col, DatePicker, Input, Row, Segmented, Select, Space, Typography } from 'antd';
import type dayjs from 'dayjs';
import { Calendar, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Staff } from '@mos-lab/shared';
import { AppIcon, SectionCard } from '~/components/ui';
import { ACTIVITY_ACTION_TYPE_OPTIONS, ACTIVITY_VIEW_MODE_OPTIONS } from './activityTabConstants';
import { buildActivityStaffSelectOptions, formatActivityPeriodLabel } from './activityTabHelpers';
import type { LocaActivityViewMode } from './types';

const { Text } = Typography;

export interface LocaStaffActivityFiltersBarProps {
  isDark: boolean;
  staffList: Staff[];
  selectedStaffId: string;
  onSelectStaff: (staffId: string) => void;
  viewMode: LocaActivityViewMode;
  onViewModeChange: (mode: LocaActivityViewMode) => void;
  referenceDate: dayjs.Dayjs;
  onNavigateDate: (direction: number) => void;
  onReferenceDateChange: (date: dayjs.Dayjs) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  actionTypeFilter: string;
  onActionTypeChange: (val: string) => void;
}

export const LocaStaffActivityFiltersBar: React.FC<LocaStaffActivityFiltersBarProps> = ({
  isDark,
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
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const staffOptions = useMemo(() => buildActivityStaffSelectOptions(staffList), [staffList]);
  const periodLabel = formatActivityPeriodLabel(viewMode, referenceDate);

  return (
    <SectionCard bodyPadding="14px 20px">
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col xs={24} lg={15}>
          <Space wrap size="middle">
            <div className="flex items-center gap-2">
              <Text type="secondary" className="font-medium text-xs uppercase tracking-wider">
                Nhân sự:
              </Text>
              <Select
                value={selectedStaffId}
                onChange={onSelectStaff}
                className="w-[170px]"
                placeholder="Chọn nhân viên"
                options={staffOptions}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="custom-gold-segmented">
                <Segmented
                  value={viewMode}
                  onChange={(val) => onViewModeChange(val as LocaActivityViewMode)}
                  options={[...ACTIVITY_VIEW_MODE_OPTIONS]}
                  className={`rounded-lg border p-[3px] ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div
                className={`inline-flex items-center rounded-lg overflow-hidden border transition-all ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                }`}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<AppIcon icon={ChevronLeft} size={12} />}
                  onClick={() => onNavigateDate(-1)}
                  className={`px-2.5 h-8 hover:text-amber-500 border-r rounded-none ${
                    isDark ? 'text-slate-300 border-slate-700/50' : 'text-slate-700 border-slate-300'
                  }`}
                  aria-label="Kỳ trước"
                />

                <div className="relative inline-flex items-center">
                  <Button
                    type="text"
                    size="small"
                    onClick={() => setPickerOpen(true)}
                    className={`px-3.5 h-8 font-semibold text-xs tabular-nums hover:text-amber-500 flex items-center gap-2 rounded-none ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                    aria-label="Chọn thời gian"
                  >
                    <span>{periodLabel}</span>
                    <AppIcon icon={Calendar} size={13} className="text-amber-500" />
                  </Button>

                  {pickerOpen && (
                    <DatePicker
                      open
                      picker={viewMode === 'month' ? 'month' : viewMode === 'week' ? 'week' : 'date'}
                      value={referenceDate}
                      onChange={(date) => {
                        if (date) onReferenceDateChange(date);
                        setPickerOpen(false);
                      }}
                      onOpenChange={(open) => {
                        if (!open) setPickerOpen(false);
                      }}
                      className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                    />
                  )}
                </div>

                <Button
                  type="text"
                  size="small"
                  icon={<AppIcon icon={ChevronRight} size={12} />}
                  onClick={() => onNavigateDate(1)}
                  className={`px-2.5 h-8 hover:text-amber-500 border-l rounded-none ${
                    isDark ? 'text-slate-300 border-slate-700/50' : 'text-slate-700 border-slate-300'
                  }`}
                  aria-label="Kỳ sau"
                />
              </div>
            </div>
          </Space>
        </Col>

        <Col xs={24} lg={9} className="flex flex-wrap justify-end gap-3">
          <Input
            placeholder="Tìm theo tên/SĐT khách hàng hoặc NV..."
            prefix={<AppIcon icon={Search} size={14} className="text-slate-400" />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[220px]"
            allowClear
          />

          <Select
            value={actionTypeFilter}
            onChange={onActionTypeChange}
            className="w-[140px]"
            options={ACTIVITY_ACTION_TYPE_OPTIONS}
          />
        </Col>
      </Row>
    </SectionCard>
  );
};
