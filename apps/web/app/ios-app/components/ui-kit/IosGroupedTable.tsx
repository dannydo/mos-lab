'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface IosGroupedTableProps {
  children: React.ReactNode;
  className?: string;
}

export function IosGroupedTable({ children, className = '' }: IosGroupedTableProps) {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
}

interface IosTableSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}

export function IosTableSection({ title, footer, children, className = '' }: IosTableSectionProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {title && (
        <h3
          className="px-4 text-[12px] font-medium tracking-wider uppercase select-none"
          style={{ color: 'var(--mos-text-muted)' }}
        >
          {title}
        </h3>
      )}
      <div
        className="rounded-2xl border divide-y overflow-hidden shadow-sm transition-colors"
        style={{
          backgroundColor: 'var(--mos-surface)',
          borderColor: 'var(--mos-surface-border)',
        }}
      >
        {children}
      </div>
      {footer && (
        <p className="px-4 text-[11px] select-none" style={{ color: 'var(--mos-text-muted)' }}>
          {footer}
        </p>
      )}
    </div>
  );
}

interface IosTableCellProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  detail?: React.ReactNode;
  onClick?: () => void;
  hasChevron?: boolean;
  destructive?: boolean;
  className?: string;
}

export function IosTableCell({
  icon,
  title,
  subtitle,
  detail,
  onClick,
  hasChevron = false,
  destructive = false,
  className = '',
}: IosTableCellProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3.5 flex items-center justify-between text-sm transition-colors ${
        isClickable ? 'cursor-pointer active:opacity-80 select-none' : ''
      } ${className}`}
      style={{ borderColor: 'var(--mos-surface-border)' }}
    >
      <div className="flex items-center space-x-3 min-w-0 pr-2">
        {icon && <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">{icon}</div>}
        <div className="flex flex-col min-w-0">
          <span
            className={`font-normal truncate leading-tight ${destructive ? 'text-rose-500 font-medium' : ''}`}
            style={destructive ? undefined : { color: 'var(--mos-text)' }}
          >
            {title}
          </span>
          {subtitle && (
            <span className="text-xs truncate leading-tight mt-0.5" style={{ color: 'var(--mos-text-muted)' }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {detail && (
          <span className="text-sm font-normal tabular-nums" style={{ color: 'var(--mos-text-muted)' }}>
            {detail}
          </span>
        )}
        {hasChevron && <ChevronRight className="w-4 h-4 stroke-[2.5]" style={{ color: 'var(--mos-text-muted)' }} />}
      </div>
    </div>
  );
}
