'use client';

import React from 'react';
import { Drawer, Modal } from 'antd';
import type { DrawerProps, ModalProps } from 'antd';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';

export type OverlayIntent = 'confirm' | 'form' | 'detail' | 'data';

function getOverlayWidth(tier: ReturnType<typeof useResponsiveTier>, intent: OverlayIntent): number | string {
  if (tier === 'mobile') return '100vw';
  if (tier === 'tablet') return intent === 'confirm' ? 520 : 'min(90vw, 760px)';
  if (intent === 'confirm') return 520;
  if (intent === 'form') return 720;
  if (intent === 'detail') return tier === 'uhd' ? 1280 : 980;
  return tier === 'uhd' ? 1440 : tier === 'wide' ? 1200 : 960;
}

export interface AdaptiveDrawerProps extends DrawerProps {
  intent?: OverlayIntent;
}

export function AdaptiveDrawer({ intent = 'detail', className = '', width, closable, styles, ...props }: AdaptiveDrawerProps) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const isBottom = props.placement === 'bottom';

  // Invariant: Nút đóng [✕] của mọi Drawer bắt buộc nằm ở góc trên bên phải (placement: 'end')
  const mergedClosable =
    closable === false
      ? false
      : typeof closable === 'object' && closable !== null
        ? { placement: 'end' as const, ...closable }
        : { placement: 'end' as const };

  const mergedStyles = {
    ...styles,
    header: {
      ...(isMobile && !isBottom ? { paddingTop: 'max(14px, env(safe-area-inset-top, 0px))' } : {}),
      ...styles?.header,
    },
  };

  return (
    <Drawer
      {...props}
      styles={mergedStyles}
      closable={mergedClosable}
      width={isBottom ? undefined : isMobile ? '100vw' : (width ?? getOverlayWidth(tier, intent))}
      height={isBottom ? (props.height ?? (isMobile ? '80vh' : '80vh')) : props.height}
      placement={isMobile ? (isBottom ? 'bottom' : 'right') : props.placement}
      className={`adaptive-overlay ${
        isMobile ? (isBottom ? 'adaptive-overlay-mobile-bottom-sheet' : 'adaptive-overlay-mobile-fullscreen') : ''
      } ${className}`}
    />
  );
}

export interface AdaptiveModalProps extends ModalProps {
  intent?: OverlayIntent;
}

export function resolveAdaptiveModalConfig({
  tier,
  intent = 'form',
  style,
  styles,
  width,
  className = '',
}: {
  tier: ReturnType<typeof useResponsiveTier>;
  intent?: OverlayIntent;
  style?: React.CSSProperties;
  styles?: ModalProps['styles'];
  width?: ModalProps['width'];
  className?: string;
}) {
  const isMobile = tier === 'mobile';
  const isFullscreenMobile = isMobile && intent !== 'confirm';
  const mobileModalWidth = 'calc(100vw - 16px)';

  const resolvedStyle: React.CSSProperties | undefined = isFullscreenMobile
    ? {
        ...style,
        height: '100dvh',
        maxHeight: '100dvh',
        margin: '0 auto',
        top: 0,
        paddingBottom: 0,
      }
    : style;

  const resolvedStyles: ModalProps['styles'] = isFullscreenMobile
    ? {
        ...styles,
        content: {
          paddingTop: 'max(16px, calc(env(safe-area-inset-top, 0px) + 8px))',
          paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px))',
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          height: styles?.content?.height ?? '100%',
          maxHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 16,
          ...styles?.content,
        },
        header: {
          paddingRight: 48,
          marginBottom: 12,
          flexShrink: 0,
          ...styles?.header,
        },
        body: {
          flex: '1 1 auto',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
          ...styles?.body,
        },
        footer: {
          flexShrink: 0,
          marginTop: 12,
          ...styles?.footer,
        },
      }
    : styles;

  const resolvedWidth = isMobile ? mobileModalWidth : (width ?? getOverlayWidth(tier, intent));
  const resolvedClassName = `adaptive-overlay ${isFullscreenMobile ? 'adaptive-overlay-mobile-fullscreen' : ''} ${className}`.trim();

  return {
    isMobile,
    isFullscreenMobile,
    width: resolvedWidth,
    style: resolvedStyle,
    styles: resolvedStyles,
    className: resolvedClassName,
  };
}

export function AdaptiveModal({ intent = 'form', className = '', width, style, styles, ...props }: AdaptiveModalProps) {
  const tier = useResponsiveTier();
  const config = resolveAdaptiveModalConfig({ tier, intent, style, styles, width, className });

  return (
    <Modal
      {...props}
      width={config.width}
      style={config.style}
      styles={config.styles}
      className={config.className}
    />
  );
}

export function AdaptiveOverlayFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`responsive-overlay-footer ${className}`}>{children}</div>;
}
