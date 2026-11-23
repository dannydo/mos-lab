'use client';

import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Customer, TouchpointStatus } from '@mos-lab/shared';
import { LocaTouchpointCell } from '../LocaTouchpointCell';
import { resolveActiveTouchpoints } from './locaColumnHelpers';
import type { LocaTouchpointConfigItem } from './types';

interface BuildTouchpointGroupOptions {
  themeMode: 'light' | 'dark';
  touchpointConfigs?: LocaTouchpointConfigItem[];
  handleToggleTouchpoint?: (
    customerId: number,
    touchpointKey: string,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null,
    hasReferredDiamond?: boolean,
    callbackDate?: string
  ) => Promise<void>;
  handleOpenBookingWizard?: (customer: Customer) => void;
}

const DEFAULT_NOOP_TOGGLE = async () => {};

export function buildTouchpointGroupColumn({
  themeMode,
  touchpointConfigs = [],
  handleToggleTouchpoint,
  handleOpenBookingWizard,
}: BuildTouchpointGroupOptions): ColumnsType<Customer>[number] {
  const activeTouchpoints = resolveActiveTouchpoints(touchpointConfigs);
  const headerToneClass = themeMode === 'dark' ? 'text-amber-400' : 'text-amber-600';

  const touchpointChildren: ColumnsType<Customer> = activeTouchpoints.map((tp) => {
    const displayLabel = tp.label || (tp.key === 'now' ? 'Chạm 24h' : tp.key === '30plus' ? '30+' : `Chạm ${tp.key}`);
    const headerText = displayLabel.replace(/^Chạm\s*/i, '');
    const tooltipText = `${displayLabel}: Mốc ${
      tp.key === 'now' ? '24 giờ' : tp.key === '30plus' ? 'trên 30 ngày' : `${tp.daysMin} ngày`
    } sau khi làm mi`;

    return {
      title: (
        <Tooltip title={tooltipText}>
          <div
            className={`flex items-center justify-center whitespace-nowrap px-px text-xs font-bold ${headerToneClass} dark:text-amber-400`}
          >
            {headerText}
          </div>
        </Tooltip>
      ),
      key: `tp_${tp.key}`,
      width: 46,
      align: 'center' as const,
      render: (_: SafeAny, record: Customer) => (
        <LocaTouchpointCell
          customer={record}
          touchpointKey={tp.key}
          label={displayLabel}
          targetDays={tp.daysMin}
          themeMode={themeMode}
          onToggle={handleToggleTouchpoint || DEFAULT_NOOP_TOGGLE}
          onOpenBooking={handleOpenBookingWizard}
        />
      ),
    };
  });

  return {
    key: 'touchpointGroup',
    title: (
      <div
        className={`rounded px-2 py-0.5 text-center text-[13px] font-bold ${
          themeMode === 'dark' ? 'bg-amber-500/12 text-amber-400' : 'bg-amber-500/10 text-amber-600'
        } dark:bg-amber-500/12 dark:text-amber-400`}
      >
        ✨ Tiến Trình Chạm CSKH
      </div>
    ),
    children: touchpointChildren,
  };
}
