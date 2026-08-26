'use client';

import React from 'react';
import { Button, Tooltip, theme } from 'antd';
import type { ButtonProps } from 'antd/es/button';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

export type IconButtonTone = 'default' | 'primary' | 'danger' | 'text';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'shape' | 'size' | 'type'> {
  /** Required accessible name and tooltip text for an icon-only action. */
  label: string;
  icon: LucideIcon;
  tone?: IconButtonTone;
  /** Keeps activity feedback without exposing a second icon family. */
  iconClassName?: string;
  tooltip?: boolean;
}

/**
 * The canonical icon-only action for application toolbars and surfaces.
 * It owns Ant's intermediate icon wrapper so the Lucide optical box remains
 * physically centered at every display-density profile.
 */
export function IconButton({
  label,
  icon: Icon,
  tone = 'default',
  iconClassName,
  tooltip = true,
  className = '',
  ...buttonProps
}: IconButtonProps) {
  const { token } = theme.useToken();
  const { danger: dangerProp, style: buttonStyle, ...restButtonProps } = buttonProps;
  const isInactive = Boolean(restButtonProps.disabled || restButtonProps.loading);
  const buttonType = tone === 'primary' ? 'primary' : tone === 'text' ? 'text' : 'default';
  const semanticStyle = {
    '--mos-icon-button-bg':
      tone === 'primary'
        ? token.colorPrimary
        : tone === 'danger'
          ? token.colorErrorBg
          : tone === 'text'
            ? 'transparent'
            : token.colorBgContainer,
    '--mos-icon-button-border':
      tone === 'primary'
        ? token.colorPrimary
        : tone === 'danger'
          ? token.colorErrorBorder
          : tone === 'text'
            ? 'transparent'
            : token.colorBorderSecondary,
    '--mos-icon-button-color':
      tone === 'primary' ? token.colorTextLightSolid : tone === 'danger' ? token.colorError : token.colorTextSecondary,
    '--mos-icon-button-hover-bg':
      tone === 'primary'
        ? token.colorPrimaryHover
        : tone === 'danger'
          ? token.colorErrorBgHover
          : tone === 'text'
            ? token.colorFillSecondary
            : token.colorPrimaryBg,
    '--mos-icon-button-hover-border':
      tone === 'primary'
        ? token.colorPrimaryHover
        : tone === 'danger'
          ? token.colorErrorHover
          : tone === 'text'
            ? 'transparent'
            : token.colorPrimaryBorder,
    '--mos-icon-button-hover-color':
      tone === 'primary'
        ? token.colorTextLightSolid
        : tone === 'danger'
          ? token.colorErrorHover
          : tone === 'text'
            ? token.colorText
            : token.colorPrimary,
    '--mos-icon-button-disabled-bg': token.colorFillTertiary,
    '--mos-icon-button-disabled-border': token.colorBorderSecondary,
    '--mos-icon-button-disabled-color': token.colorTextQuaternary,
  } as React.CSSProperties;
  const baseStyle: React.CSSProperties = isInactive
    ? {
        background: token.colorFillTertiary,
        borderColor: token.colorBorderSecondary,
        color: token.colorTextQuaternary,
      }
    : {
        background:
          tone === 'primary'
            ? token.colorPrimary
            : tone === 'danger'
              ? token.colorErrorBg
              : tone === 'text'
                ? 'transparent'
                : token.colorBgContainer,
        borderColor:
          tone === 'primary'
            ? token.colorPrimary
            : tone === 'danger'
              ? token.colorErrorBorder
              : tone === 'text'
                ? 'transparent'
                : token.colorBorderSecondary,
        color:
          tone === 'primary'
            ? token.colorTextLightSolid
            : tone === 'danger'
              ? token.colorError
              : token.colorTextSecondary,
      };
  const button = (
    <Button
      {...restButtonProps}
      type={buttonType}
      danger={tone === 'danger' || dangerProp}
      style={{ ...semanticStyle, ...baseStyle, ...buttonStyle }}
      aria-label={label}
      title={label}
      className={['mos-icon-button', `mos-icon-button--${tone}`, className].filter(Boolean).join(' ')}
      icon={
        <span aria-hidden className="mos-icon-button__icon">
          <AppIcon icon={Icon} size="action" className={iconClassName} />
        </span>
      }
    />
  );

  return tooltip ? <Tooltip title={label}>{button}</Tooltip> : button;
}

export default React.memo(IconButton);
