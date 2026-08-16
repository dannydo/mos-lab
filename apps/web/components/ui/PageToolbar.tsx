'use client';

import React from 'react';
import { Space } from 'antd';
import { ContentSurface } from './ContentSurface';

export interface PageToolbarProps {
  primary: React.ReactNode;
  actions?: React.ReactNode;
  /** Secondary controls intentionally follow actions on compact screens. */
  secondary?: React.ReactNode;
  className?: string;
}

/** Standard responsive toolbar used above data-heavy screens. */
export function PageToolbar({ primary, actions, secondary, className = '' }: PageToolbarProps) {
  return (
    <ContentSurface
      padding="var(--mos-density-padding, var(--mos-toolbar-padding))"
      className={`responsive-toolbar mb-4 ${className}`}
    >
      <div className="responsive-toolbar-layout">
        <div className="responsive-toolbar-primary">{primary}</div>
        {actions && (
          <div className="responsive-toolbar-actions">
            <Space wrap size={8}>
              {actions}
            </Space>
          </div>
        )}
        {secondary && <div className="responsive-toolbar-secondary">{secondary}</div>}
      </div>
    </ContentSurface>
  );
}

export default React.memo(PageToolbar);
