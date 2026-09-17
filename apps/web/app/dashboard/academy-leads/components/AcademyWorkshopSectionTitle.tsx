'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from '../../../../components/ui';

export interface AcademyWorkshopSectionTitleProps {
  icon: LucideIcon;
  title: React.ReactNode;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
}

/**
 * Standardized Section Title with rounded brand icon badge
 * used across all Workshop OS workspace tabs and data sections.
 */
export default function AcademyWorkshopSectionTitle({
  icon,
  title,
  badge,
  subtitle,
}: AcademyWorkshopSectionTitleProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--academy-workshop-primary-bg)] text-[var(--academy-workshop-primary)]">
          <AppIcon icon={icon} size="sm" />
        </span>
        <span className="truncate font-semibold leading-tight text-inherit">{title}</span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
      </div>
      {subtitle ? <span className="shrink-0 text-xs font-normal opacity-60 tabular-nums">{subtitle}</span> : null}
    </div>
  );
}
