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

export function AdaptiveDrawer({ intent = 'detail', className = '', width, ...props }: AdaptiveDrawerProps) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  return (
    <Drawer
      {...props}
      width={isMobile ? '100vw' : (width ?? getOverlayWidth(tier, intent))}
      placement={isMobile ? 'right' : props.placement}
      className={`adaptive-overlay ${isMobile ? 'adaptive-overlay-mobile-fullscreen' : ''} ${className}`}
    />
  );
}

export interface AdaptiveModalProps extends ModalProps {
  intent?: OverlayIntent;
}

export function AdaptiveModal({ intent = 'form', className = '', width, style, styles, ...props }: AdaptiveModalProps) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  // Ant Design's mobile modal wrapper retains an 8px inset on both sides.
  // Reserving that space avoids a 100vw content surface extending past the
  // viewport while preserving the full-height workflow composition.
  const mobileModalWidth = 'calc(100vw - 16px)';
  const mobileModalStyle = isMobile ? { ...style, height: 'calc(100dvh - 16px)', margin: '8px auto', top: 0 } : style;
  const mobileModalStyles = isMobile
    ? { ...styles, content: { ...styles?.content, height: styles?.content?.height ?? '100%' } }
    : styles;

  return (
    <Modal
      {...props}
      width={isMobile ? mobileModalWidth : (width ?? getOverlayWidth(tier, intent))}
      style={mobileModalStyle}
      styles={mobileModalStyles}
      className={`adaptive-overlay ${isMobile ? 'adaptive-overlay-mobile-fullscreen' : ''} ${className}`}
    />
  );
}

export function AdaptiveOverlayFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`responsive-overlay-footer ${className}`}>{children}</div>;
}
