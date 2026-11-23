'use client';

import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { RefreshCw } from 'lucide-react';
import type { AnnualHolidayCalendarResponse, HolidayPeriod } from '@mos-lab/shared';
import { AppIcon, StatusTag, type FeatureToolbarProps } from '~/components/ui';
import { PERIOD_STATUS_TYPE_MAP } from './holidayWorkPageHelpers';

export function HolidayWorkHeaderTag({
  canAccessWorkspace,
  activePeriod,
  calendar,
}: {
  canAccessWorkspace: boolean;
  activePeriod?: HolidayPeriod | null;
  calendar: AnnualHolidayCalendarResponse | null;
}) {
  if (canAccessWorkspace && activePeriod) {
    return <StatusTag status={PERIOD_STATUS_TYPE_MAP[activePeriod.status]} label={activePeriod.status} />;
  }
  if (calendar) {
    return <StatusTag status="processing" label={`Năm ${calendar.year}`} />;
  }
  return null;
}

export function buildHolidayWorkToolbar({
  activePeriodId,
  periods,
  search,
  workspaceLoading,
  onSelectPeriod,
  onSearchChange,
  onRefresh,
}: {
  activePeriodId: number | null;
  periods: HolidayPeriod[];
  search: string;
  workspaceLoading: boolean;
  onSelectPeriod: (periodId: number) => void;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
}): FeatureToolbarProps {
  return {
    primary: (
      <Select
        value={activePeriodId || undefined}
        placeholder="Chọn kỳ lễ"
        className="min-w-[260px]"
        options={periods.map((period) => ({
          value: period.id,
          label: `${period.name} · ${dayjs(period.startDate).format('DD/MM/YYYY')}`,
        }))}
        onChange={onSelectPeriod}
      />
    ),
    filters: (
      <Input.Search
        allowClear
        value={search}
        placeholder="Tìm nhân sự, đội, chi nhánh…"
        onChange={(event) => onSearchChange(event.target.value)}
        className="w-[280px]"
      />
    ),
    actions: (
      <Button icon={<AppIcon icon={RefreshCw} size="sm" />} loading={workspaceLoading} onClick={onRefresh}>
        Làm mới
      </Button>
    ),
    activeFilterCount: search ? 1 : 0,
    filterTitle: 'Tìm trong workspace',
  };
}
