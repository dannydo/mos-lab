'use client';

import React, { forwardRef } from 'react';
import { theme } from 'antd';

type HeaderActionIndicatorBaseProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> & {
  children: React.ReactElement;
  color?: string;
  /** Lets the marker visually separate from an action with a tinted surface. */
  surface?: 'default' | 'accent';
};

export type HeaderActionIndicatorProps =
  | (HeaderActionIndicatorBaseProps & {
      /** A compact boolean signal: show a dot, never a visual count. */
      variant: 'status';
      active: boolean;
    })
  | (HeaderActionIndicatorBaseProps & {
      /** An at-a-glance operational or actionable value: show its exact count. */
      variant: 'count';
      count: number;
    });

/**
 * Header signal policy: a dot communicates a compact state or summarized
 * attention; a number is used only when its exact value is useful at a glance.
 */
export const HeaderActionIndicator = forwardRef<HTMLSpanElement, HeaderActionIndicatorProps>(
  function HeaderActionIndicator(props, ref) {
    const { children, color, variant, surface = 'default', className, ...spanProps } = props;
    const {
      active: _active,
      count: _count,
      ...domProps
    } = spanProps as React.HTMLAttributes<HTMLSpanElement> & {
      active?: boolean;
      count?: number;
    };
    const { token } = theme.useToken();
    const visible = variant === 'status' ? props.active : props.count > 0;
    const indicatorColor = color ?? (variant === 'status' ? token.colorSuccess : token.colorError);
    const displayCount = variant === 'count' ? (props.count > 99 ? '99+' : String(props.count)) : undefined;
    const countSizeClass =
      variant === 'count'
        ? props.count > 99
          ? 'mos-header-action-indicator--count-overflow'
          : props.count < 10
            ? 'mos-header-action-indicator--count-single'
            : 'mos-header-action-indicator--count-multiple'
        : '';

    return (
      <span
        {...domProps}
        ref={ref}
        className={[
          'mos-header-action-indicator',
          `mos-header-action-indicator--${variant}`,
          visible ? 'mos-header-action-indicator--visible' : '',
          `mos-header-action-indicator--surface-${surface}`,
          countSizeClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
        {visible && variant === 'status' ? (
          <span
            aria-hidden="true"
            className="mos-header-action-indicator__status"
            style={{ backgroundColor: indicatorColor }}
          />
        ) : null}
        {visible && variant === 'count' ? (
          <span
            aria-hidden="true"
            className="mos-header-action-indicator__count"
            style={{ backgroundColor: indicatorColor, color: token.colorTextLightSolid }}
          >
            {displayCount}
          </span>
        ) : null}
      </span>
    );
  }
);

HeaderActionIndicator.displayName = 'HeaderActionIndicator';
