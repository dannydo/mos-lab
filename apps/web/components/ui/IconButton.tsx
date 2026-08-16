'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import type { ButtonProps } from 'antd/es/button';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

export type IconButtonTone = 'default' | 'primary' | 'text';

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
  const button = (
    <Button
      {...buttonProps}
      type={tone}
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
