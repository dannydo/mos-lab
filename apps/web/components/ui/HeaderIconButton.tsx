'use client';

import React, { forwardRef } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

export type HeaderActionTone = 'quiet' | 'accent';

export interface HeaderIconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'shape' | 'size' | 'type'> {
  /** Stable hook for browser QA and analytics. */
  action: string;
  /** Required accessible name. Tooltips must never be the only label. */
  label: string;
  icon: LucideIcon;
  /** Optional desktop-only label for the one intentionally labelled header action. */
  desktopLabel?: React.ReactNode;
  tone?: HeaderActionTone;
}

/**
 * The shared dashboard-header action contract. It owns the physical target and
 * Lucide optical box; callers keep their Badge, Dropdown and application state.
 */
export const HeaderIconButton = forwardRef<HTMLButtonElement, HeaderIconButtonProps>(function HeaderIconButton(
  { action, label, icon: Icon, desktopLabel, tone = 'quiet', className = '', ...buttonProps },
  ref
) {
  const hasDesktopLabel = Boolean(desktopLabel);

  return (
    <Button
      {...buttonProps}
      ref={ref}
      type="text"
      aria-label={label}
      title={label}
      data-header-action={action}
      className={[
        'mos-header-action',
        `mos-header-action--${tone}`,
        hasDesktopLabel ? 'mos-header-action--labeled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      icon={
        <span aria-hidden className="mos-header-action__icon">
          <AppIcon icon={Icon} size="action" />
        </span>
      }
    >
      {hasDesktopLabel ? <span className="mos-header-action__label">{desktopLabel}</span> : null}
    </Button>
  );
});

HeaderIconButton.displayName = 'HeaderIconButton';
