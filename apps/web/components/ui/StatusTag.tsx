'use client';

import React from 'react';
import { Tag } from 'antd';

export type StatusType =
  'success' | 'processing' | 'error' | 'warning' | 'default' | 'gold' | 'cyan' | 'purple' | 'orange';

export interface StatusTagProps {
  status?: StatusType;
  label: React.ReactNode;
  icon?: React.ReactNode;
  bordered?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_MAP: Record<StatusType, { color: string; borderClass: string }> = {
  success: { color: 'green', borderClass: 'border-emerald-500/30' },
  processing: { color: 'processing', borderClass: 'border-blue-500/30' },
  error: { color: 'red', borderClass: 'border-rose-500/30' },
  warning: { color: 'gold', borderClass: 'border-amber-500/30' },
  default: { color: 'default', borderClass: 'border-slate-500/30' },
  gold: { color: 'gold', borderClass: 'border-amber-500/40' },
  cyan: { color: 'cyan', borderClass: 'border-cyan-500/30' },
  purple: { color: 'purple', borderClass: 'border-purple-500/30' },
  orange: { color: 'orange', borderClass: 'border-orange-500/30' },
};

export function StatusTag({ status = 'default', label, icon, bordered = true, className = '', style }: StatusTagProps) {
  const conf = COLOR_MAP[status] || COLOR_MAP.default;

  return (
    <Tag
      color={conf.color}
      bordered={bordered}
      className={`m-0 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold leading-none ${conf.borderClass} ${className}`}
      style={style}
    >
      {icon ? (
        <span className="inline-flex shrink-0 items-center justify-center leading-none [&>svg]:block">{icon}</span>
      ) : null}
      <span className="leading-none">{label}</span>
    </Tag>
  );
}

export default React.memo(StatusTag);
