'use client';

import React from 'react';
import { PageToolbar } from './PageToolbar';
import { ToolbarFilterDisclosure } from './ToolbarFilterDisclosure';

export interface FeatureToolbarProps {
  /** The control that defines the current working context, such as search or reporting period. */
  primary?: React.ReactNode;
  /** Filter controls stay inline on larger screens and move into one drawer on phones. */
  filters?: React.ReactNode;
  /** Secondary actions such as export, refresh, and table settings. */
  actions?: React.ReactNode;
  secondary?: React.ReactNode;
  filterTitle?: string;
  filterTriggerLabel?: string;
  activeFilterCount?: number;
  className?: string;
}

/**
 * The ready-to-use toolbar composition for list and report screens.
 * It keeps desktop controls scannable while handling the mobile filter drawer
 * consistently, so features only supply their own controls and callbacks.
 */
export function FeatureToolbar({
  primary,
  filters,
  actions,
  secondary,
  filterTitle,
  filterTriggerLabel,
  activeFilterCount = 0,
  className,
}: FeatureToolbarProps) {
  const composedActions =
    filters || actions ? (
      <>
        {filters && (
          <ToolbarFilterDisclosure
            title={filterTitle}
            triggerLabel={filterTriggerLabel}
            activeCount={activeFilterCount}
          >
            {filters}
          </ToolbarFilterDisclosure>
        )}
        {actions}
      </>
    ) : undefined;

  return (
    <PageToolbar primary={primary ?? null} actions={composedActions} secondary={secondary} className={className} />
  );
}

export default React.memo(FeatureToolbar);
