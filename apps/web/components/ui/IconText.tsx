'use client';

import React from 'react';

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
    <span
      className={`inline-flex items-center justify-center leading-none ${className}`}
      style={{ columnGap: gap, ...style }}
    >
      {icon && (
        <span className="inline-flex shrink-0 items-center justify-center leading-none [&>svg]:block">{icon}</span>
      )}
      <span className={`inline-flex items-center leading-none ${tabular ? 'tabular-nums' : ''} ${textClassName}`}>
        {children}
      </span>
    </span>
  );
}

export default React.memo(IconText);
