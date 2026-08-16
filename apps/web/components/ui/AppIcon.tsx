'use client';

import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

/** Semantic icon sizes keep the optical box tied to the active density profile. */
export type AppIconSize = 'action' | 'disclosure' | 'sm' | 'md' | 'lg' | number;

export interface AppIconProps extends Omit<LucideProps, 'aria-label' | 'size' | 'title'> {
  icon: LucideIcon;
  size?: AppIconSize;
  /** Supply a label only when the icon itself conveys information. */
  label?: string;
}

const iconSizeByRole: Record<Exclude<AppIconSize, number>, string | number> = {
  action: 'var(--mos-action-icon-size)',
  disclosure: 'var(--mos-disclosure-icon-size)',
  sm: 16,
  md: 20,
  lg: 24,
};

/**
 * Product-icon adapter. New product UI imports Lucide symbols through this
 * component so size, stroke weight, and accessible semantics stay uniform.
 */
export function AppIcon({
  icon: Icon,
  size = 'action',
  label,
  className = '',
  strokeWidth = 2,
  ...props
}: AppIconProps) {
  const resolvedSize = typeof size === 'number' ? size : iconSizeByRole[size];

  return (
    <Icon
      {...props}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      focusable="false"
      role={label ? 'img' : undefined}
      size={resolvedSize}
      strokeWidth={strokeWidth}
      className={`mos-app-icon ${className}`.trim()}
    />
  );
}

export default React.memo(AppIcon);
