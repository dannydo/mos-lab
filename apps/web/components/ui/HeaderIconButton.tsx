'use client';

import React, { forwardRef } from 'react';
import { Button, Tooltip, theme } from 'antd';
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
  /** Set to false if action is wrapped by another popup/dropdown. Defaults to true. */
  showTooltip?: boolean;
}

/**
 * The shared dashboard-header action contract. It owns the physical target and
 * Lucide optical box; callers keep their Badge, Dropdown and application state.
 */
export const HeaderIconButton = forwardRef<HTMLButtonElement, HeaderIconButtonProps>(function HeaderIconButton(
  {
    action,
    label,
    icon: Icon,
    desktopLabel,
    tone = 'quiet',
    showTooltip = true,
    className = '',
    style: buttonStyle,
    ...buttonProps
  },
  ref
) {
  const { token } = theme.useToken();
  const hasDesktopLabel = Boolean(desktopLabel);
  const semanticStyle = {
    '--mos-header-action-bg': tone === 'accent' ? token.colorPrimaryBg : 'transparent',
    '--mos-header-action-border': tone === 'accent' ? token.colorPrimaryBorder : 'transparent',
    '--mos-header-action-color': tone === 'accent' ? token.colorPrimary : token.colorTextSecondary,
    '--mos-header-action-hover-bg': tone === 'accent' ? token.colorPrimaryBgHover : token.colorFillSecondary,
    '--mos-header-action-hover-border': tone === 'accent' ? token.colorPrimaryHover : 'transparent',
    '--mos-header-action-hover-color': tone === 'accent' ? token.colorPrimaryHover : token.colorText,
  } as React.CSSProperties;
  const baseStyle: React.CSSProperties = {
    background: tone === 'accent' ? token.colorPrimaryBg : 'transparent',
    borderColor: tone === 'accent' ? token.colorPrimaryBorder : 'transparent',
    color: tone === 'accent' ? token.colorPrimary : token.colorTextSecondary,
  };

  const button = (
    <Button
      {...buttonProps}
      ref={ref}
      type="text"
      aria-label={label}
      data-header-action={action}
      style={{ ...semanticStyle, ...baseStyle, ...buttonStyle }}
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

  if (!showTooltip) {
    return button;
  }

  return (
    <Tooltip
      title={label}
      placement="bottom"
      arrow={false}
      mouseEnterDelay={0.15}
      overlayInnerStyle={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
      rootClassName="pointer-events-none"
    >
      {button}
    </Tooltip>
  );
});

HeaderIconButton.displayName = 'HeaderIconButton';
