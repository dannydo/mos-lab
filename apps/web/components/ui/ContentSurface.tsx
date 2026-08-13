'use client';

import React from 'react';
import { Card, theme } from 'antd';

export interface ContentSurfaceProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: number | string;
  elevated?: boolean;
}

/** A shared themed surface for feature toolbars, tables, and content blocks. */
export function ContentSurface({
  children,
  className = '',
  style,
  padding = 16,
  elevated = false,
}: ContentSurfaceProps) {
  const { token } = theme.useToken();

  return (
    <Card
      variant="outlined"
      className={`rounded-xl ${className}`}
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorderSecondary,
        boxShadow: elevated ? token.boxShadowTertiary : undefined,
        ...style,
      }}
      styles={{ body: { padding } }}
    >
      {children}
    </Card>
  );
}

export default React.memo(ContentSurface);
