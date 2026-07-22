'use client';

import React from 'react';
import { Space } from 'antd';

export interface IconTextProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  gap?: number;
  tabular?: boolean;
  className?: string;
  style?: React.CSSProperties;
  textClassName?: string;
}

export function IconText({
  icon,
  children,
  gap = 6,
  tabular = false,
  className = '',
  style,
  textClassName = '',
}: IconTextProps) {
  return (
    <Space
      size={gap}
      align="center"
      className={`inline-flex items-center ${className}`}
      style={style}
    >
      {icon && <span className="inline-flex items-center shrink-0">{icon}</span>}
      <span className={`${tabular ? 'tabular-nums' : ''} ${textClassName}`}>
        {children}
      </span>
    </Space>
  );
}

export default React.memo(IconText);
