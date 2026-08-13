'use client';

import React from 'react';
import { Space } from 'antd';
import { ContentSurface } from './ContentSurface';

export interface PageToolbarProps {
  primary: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Standard responsive toolbar used above data-heavy screens. */
export function PageToolbar({ primary, actions, className = '' }: PageToolbarProps) {
  return (
    <ContentSurface padding="12px 16px" className={`mb-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">{primary}</div>
        {actions && (
          <Space wrap size={8}>
            {actions}
          </Space>
        )}
      </div>
    </ContentSurface>
  );
}

export default React.memo(PageToolbar);
