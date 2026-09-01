'use client';

import React, { useState } from 'react';
import { Badge, Button, Tooltip } from 'antd';
import { Filter } from 'lucide-react';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { AdaptiveDrawer } from './AdaptiveOverlay';

export interface ToolbarFilterDisclosureProps {
  children: React.ReactNode;
  title?: string;
  triggerLabel?: string;
  /** Number of non-default filters currently applied while the controls are hidden on mobile. */
  activeCount?: number;
}

/**
 * Keeps dense report filters visible on desktop, but moves them behind one
 * predictable filter action on phones so the primary period control stays in
 * view. The same disclosure can be used by every reporting toolbar.
 */
export function ToolbarFilterDisclosure({
  children,
  title = 'Bộ lọc báo cáo',
  triggerLabel = 'Mở bộ lọc',
  activeCount = 0,
}: ToolbarFilterDisclosureProps) {
  const tier = useResponsiveTier();
  const [open, setOpen] = useState(false);
  const hasActiveFilters = activeCount > 0;

  if (tier !== 'mobile') return <>{children}</>;

  return (
    <>
      <Tooltip title={hasActiveFilters ? `${activeCount} bộ lọc đang áp dụng` : 'Bộ lọc'}>
        <Badge count={activeCount} size="small" offset={[-2, 4]} showZero={false}>
          <Button
            data-ui="toolbar-filter-disclosure-trigger"
            aria-label={hasActiveFilters ? `${triggerLabel}, ${activeCount} bộ lọc đang áp dụng` : triggerLabel}
            icon={
              <span aria-hidden className="toolbar-filter-disclosure-icon">
                <Filter />
              </span>
            }
            onClick={() => setOpen(true)}
            className={`toolbar-filter-disclosure-trigger${hasActiveFilters ? ' is-active' : ''}`}
          />
        </Badge>
      </Tooltip>

      <AdaptiveDrawer
        intent="form"
        title={title}
        open={open}
        onClose={() => setOpen(false)}
        destroyOnHidden
        className="toolbar-filter-disclosure-drawer"
      >
        <div className="toolbar-filter-disclosure-content">{children}</div>
      </AdaptiveDrawer>
    </>
  );
}

export default React.memo(ToolbarFilterDisclosure);
