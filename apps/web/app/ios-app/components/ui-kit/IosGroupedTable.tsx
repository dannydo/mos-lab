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
        <h3 className="px-4 text-[12px] font-medium tracking-wider text-neutral-400 uppercase select-none">{title}</h3>
      )}
      <div className="rounded-2xl bg-[#1c1c1e] border border-neutral-800/90 divide-y divide-neutral-800/60 overflow-hidden shadow-sm">
        {children}
      </div>
      {footer && <p className="px-4 text-[11px] text-neutral-500 select-none">{footer}</p>}
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
        isClickable ? 'cursor-pointer active:bg-neutral-800/70 hover:bg-neutral-800/40 select-none' : ''
      } ${className}`}
    >
      <div className="flex items-center space-x-3 min-w-0 pr-2">
        {icon && <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">{icon}</div>}
        <div className="flex flex-col min-w-0">
          <span
            className={`font-normal truncate leading-tight ${destructive ? 'text-rose-500 font-medium' : 'text-white'}`}
          >
            {title}
          </span>
          {subtitle && <span className="text-xs text-neutral-400 truncate leading-tight mt-0.5">{subtitle}</span>}
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {detail && <span className="text-neutral-400 text-sm font-normal tabular-nums">{detail}</span>}
        {hasChevron && <ChevronRight className="w-4 h-4 text-neutral-500 stroke-[2.5]" />}
      </div>
    </div>
  );
}
