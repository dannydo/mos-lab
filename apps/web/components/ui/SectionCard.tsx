'use client';

import React from 'react';
import { Card, theme } from 'antd';

export interface SectionCardProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyPadding?: number | string;
  style?: React.CSSProperties;
}

export function SectionCard({
  title,
  extra,
  children,
  className = '',
  bodyPadding = '16px',
  style,
}: SectionCardProps) {
  const { token } = theme.useToken();

  return (
    <Card
      title={title}
      extra={extra}
      variant="outlined"
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorderSecondary,
        ...style,
      }}
      styles={{ body: { padding: bodyPadding } }}
      className={`shadow-sm rounded-xl ${className}`}
    >
      {children}
    </Card>
  );
}

export default React.memo(SectionCard);
