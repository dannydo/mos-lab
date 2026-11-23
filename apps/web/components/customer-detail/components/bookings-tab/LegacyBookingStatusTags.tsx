'use client';

import React from 'react';
import { Tooltip } from 'antd';
import {
  Calendar,
  Coffee,
  DollarSign,
  Filter,
  Frown,
  Heart,
  History,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { StatusTag, type StatusType } from '~/components/ui';

interface LegacyStatusMeta {
  label: string;
  status?: StatusType;
  customTheme?: 'magenta' | 'geekblue';
  icon: React.ReactNode;
}

const LEGACY_BOOKING_STATUS_META: Record<string, LegacyStatusMeta> = {
  lead: { label: 'Lead', status: 'gold', icon: <Filter className="h-3 w-3" /> },
  lead_book: { label: 'Lead Book', status: 'gold', icon: <Filter className="h-3 w-3" /> },
  new: { label: 'New', status: 'processing', icon: <Sun className="h-3 w-3" /> },
  combo: { label: 'Combo', status: 'orange', icon: <RefreshCw className="h-3 w-3" /> },
  combo_last: { label: 'Combo Last', status: 'gold', icon: <DollarSign className="h-3 w-3" /> },
  combo_expired: { label: 'Combo Expired', status: 'error', icon: <RefreshCw className="h-3 w-3" /> },
  combo_over: { label: 'Combo Over', status: 'purple', icon: <Search className="h-3 w-3" /> },
  long_time: { label: 'Long Time', status: 'cyan', icon: <Calendar className="h-3 w-3" /> },
  lapser: { label: 'Lapser', customTheme: 'magenta', icon: <Heart className="h-3 w-3" /> },
  occasion: { label: 'Occasion', customTheme: 'geekblue', icon: <Coffee className="h-3 w-3" /> },
  lost: { label: 'Lost', status: 'default', icon: <Frown className="h-3 w-3" /> },
  game: { label: 'Game', status: 'success', icon: <SlidersHorizontal className="h-3 w-3" /> },
};

const COMBO_LEGACY_STATUSES = new Set(['combo', 'combo_last', 'combo_expired', 'combo_over']);

export interface LegacyBookingStatusTagsProps {
  statuses?: SafeAny[];
  hasLiveComboAtBooking?: boolean;
  themeMode?: 'light' | 'dark';
}

export const LegacyBookingStatusTags: React.FC<LegacyBookingStatusTagsProps> = ({
  statuses,
  hasLiveComboAtBooking = false,
  themeMode = 'light',
}) => {
  const isDark = themeMode === 'dark';

  const uniqueStatuses = Array.from(
    new Map(
      (statuses || [])
        .filter((status) => status?.userServiceType)
        .filter((status) => !hasLiveComboAtBooking || !COMBO_LEGACY_STATUSES.has(String(status.userServiceType)))
        .map((status) => [`${status.serviceName}:${status.userServiceType}`, status])
    ).values()
  );

  if (!hasLiveComboAtBooking && uniqueStatuses.length === 0) return null;

  return (
    <>
      {hasLiveComboAtBooking && (
        <Tooltip title="Combo đang chạy tại thời điểm tạo booking (đối soát số dư và lượt dùng)">
          <span className="inline-flex">
            <StatusTag status="success" icon={<RefreshCw className="h-3 w-3" />} label="Combo Live" />
          </span>
        </Tooltip>
      )}
      {uniqueStatuses.map((status) => {
        const metadata: LegacyStatusMeta = LEGACY_BOOKING_STATUS_META[status.userServiceType] || {
          label: String(status.userServiceType).replaceAll('_', ' '),
          status: 'default',
          icon: <History className="h-3 w-3" />,
        };
        const key = `${status.serviceName}:${status.userServiceType}`;
        const tooltipTitle = `Tệp khách tại thời điểm đặt lịch (legacy): ${metadata.label} — ${status.serviceName}`;

        if (metadata.customTheme === 'magenta') {
          return (
            <Tooltip key={key} title={tooltipTitle}>
              <span
                className={`inline-flex items-center justify-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold leading-none ${
                  isDark
                    ? 'border-pink-500/35 bg-pink-500/15 text-pink-300'
                    : 'border-pink-300 bg-pink-50 text-pink-700'
                }`}
              >
                <span className="inline-flex shrink-0 items-center justify-center leading-none">{metadata.icon}</span>
                <span className="leading-none">{metadata.label}</span>
              </span>
            </Tooltip>
          );
        }

        if (metadata.customTheme === 'geekblue') {
          return (
            <Tooltip key={key} title={tooltipTitle}>
              <span
                className={`inline-flex items-center justify-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold leading-none ${
                  isDark
                    ? 'border-indigo-500/35 bg-indigo-500/15 text-indigo-300'
                    : 'border-indigo-300 bg-indigo-50 text-indigo-700'
                }`}
              >
                <span className="inline-flex shrink-0 items-center justify-center leading-none">{metadata.icon}</span>
                <span className="leading-none">{metadata.label}</span>
              </span>
            </Tooltip>
          );
        }

        return (
          <Tooltip key={key} title={tooltipTitle}>
            <span className="inline-flex">
              <StatusTag status={metadata.status ?? 'default'} icon={metadata.icon} label={metadata.label} />
            </span>
          </Tooltip>
        );
      })}
    </>
  );
};
