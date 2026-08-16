'use client';

import React from 'react';

export type ResponsiveFormColumns = 1 | 2 | 3 | 4;

export interface ResponsiveFormGridProps {
  children: React.ReactNode;
  columns?: ResponsiveFormColumns;
  className?: string;
  style?: React.CSSProperties;
}

export function ResponsiveFormGrid({ children, columns = 2, className = '', style }: ResponsiveFormGridProps) {
  return (
    <div className={`responsive-form-grid ${className}`} data-columns={columns} style={style}>
      {children}
    </div>
  );
}

export interface ResponsiveFormFieldProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function ResponsiveFormField({ children, fullWidth = false, className = '' }: ResponsiveFormFieldProps) {
  return <div className={`${fullWidth ? 'responsive-form-field-full' : ''} ${className}`}>{children}</div>;
}
