'use client';

import React from 'react';
import { CheckCircle2, Clock, Lock, Phone, RefreshCw, Undo2, Unlock, XCircle } from 'lucide-react';
import { StatusTag, type StatusType } from '~/components/ui';

interface ActionBadgeConfig {
  status: StatusType;
  icon: React.ReactNode;
  fallbackLabel: string;
}

const ACTION_BADGE_MAP: Record<string, ActionBadgeConfig> = {
  CLAIM: {
    status: 'orange',
    icon: <Lock size={11} />,
    fallbackLabel: 'Lock / Giữ data',
  },
  RELEASE_MANUAL: {
    status: 'cyan',
    icon: <Unlock size={11} />,
    fallbackLabel: 'Nhả Claim',
  },
  RELEASE_MANAGER: {
    status: 'error',
    icon: <Unlock size={11} />,
    fallbackLabel: 'QL nhả Claim',
  },
  RELEASE_EXPIRED: {
    status: 'orange',
    icon: <Clock size={11} />,
    fallbackLabel: 'Hết hạn TTL',
  },
  CALL: {
    status: 'purple',
    icon: <Phone size={11} />,
    fallbackLabel: 'Báo cáo gọi',
  },
  STATUS_UPDATE: {
    status: 'purple',
    icon: <Phone size={11} />,
    fallbackLabel: 'Báo cáo gọi',
  },
  BOOK: {
    status: 'success',
    icon: <CheckCircle2 size={11} />,
    fallbackLabel: 'Chốt Booking',
  },
  BOOKING: {
    status: 'success',
    icon: <CheckCircle2 size={11} />,
    fallbackLabel: 'Chốt Booking',
  },
  RECYCLE: {
    status: 'processing',
    icon: <RefreshCw size={11} />,
    fallbackLabel: 'Recycle',
  },
  RECYCLE_RETURN: {
    status: 'processing',
    icon: <RefreshCw size={11} />,
    fallbackLabel: 'Recycle',
  },
  EXCLUDE: {
    status: 'default',
    icon: <XCircle size={11} />,
    fallbackLabel: 'Loại khỏi Pool',
  },
  RETURN_TO_POOL: {
    status: 'success',
    icon: <RefreshCw size={11} />,
    fallbackLabel: 'Về lại Pool',
  },
  RECOVERY_OVERRIDE: {
    status: 'purple',
    icon: <Undo2 size={11} />,
    fallbackLabel: 'Khôi phục',
  },
};

interface StatusBadgeConfig {
  status: StatusType;
  label: string;
}

const POOL_STATUS_BADGE_MAP: Record<string, StatusBadgeConfig> = {
  AVAILABLE: { status: 'success', label: '🟢 SẴN SÀNG' },
  CLAIMED: { status: 'warning', label: '🟠 ĐANG GIỮ' },
  RECYCLING: { status: 'purple', label: '🟣 CHỜ LẠI' },
  EXPLOITED: { status: 'default', label: '⚪ ĐÃ GỌI' },
  BOOKED: { status: 'processing', label: '🔵 ĐÃ BOOK' },
  EXCLUDED: { status: 'error', label: '🔴 ĐÃ LOẠI' },
};

export interface SharedPoolActionBadgeProps {
  action: string;
  actionLabel?: string | null;
}

export const SharedPoolActionBadge: React.FC<SharedPoolActionBadgeProps> = ({ action, actionLabel }) => {
  const config = ACTION_BADGE_MAP[action];
  if (!config) {
    return <StatusTag status="default" label={actionLabel || action} className="m-0 font-semibold" />;
  }

  return (
    <StatusTag
      status={config.status}
      icon={config.icon}
      label={actionLabel || config.fallbackLabel}
      className="m-0 font-semibold"
    />
  );
};

export interface SharedPoolStatusBadgeProps {
  status: string | null | undefined;
}

export const SharedPoolStatusBadge: React.FC<SharedPoolStatusBadgeProps> = ({ status }) => {
  if (!status) {
    return <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>;
  }

  const config = POOL_STATUS_BADGE_MAP[status];
  if (!config) {
    return <StatusTag status="default" label={status} className="m-0 text-[11px]" />;
  }

  return <StatusTag status={config.status} label={config.label} className="m-0 text-[11px] font-semibold" />;
};
