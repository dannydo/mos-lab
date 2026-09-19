'use client';

import React, { forwardRef } from 'react';
import { Tooltip, theme } from 'antd';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

export type HeaderActionTone = 'quiet' | 'accent';

export interface HeaderIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
    onClick,
    disabled,
    type = 'button',
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
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-label={label}
      data-header-action={action}
      onClick={onClick}
      style={{ ...semanticStyle, ...baseStyle, ...buttonStyle }}
      className={[
        'mos-header-action',
        `mos-header-action--${tone}`,
        hasDesktopLabel ? 'mos-header-action--labeled' : '',
        'cursor-pointer select-none rounded-lg',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden className="mos-header-action__icon pointer-events-none">
        <AppIcon icon={Icon} size="action" className="pointer-events-none" />
      </span>
      {hasDesktopLabel ? <span className="mos-header-action__label pointer-events-none">{desktopLabel}</span> : null}
    </button>
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
      mouseLeaveDelay={0.2}
      overlayClassName="pointer-events-none select-none"
      overlayInnerStyle={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
      rootClassName="pointer-events-none select-none"
    >
      {button}
    </Tooltip>
  );
});

HeaderIconButton.displayName = 'HeaderIconButton';
