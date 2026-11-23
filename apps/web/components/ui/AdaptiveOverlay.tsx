'use client';

import React, { useCallback, useRef, useState } from 'react';
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

export function AdaptiveDrawer({
  intent = 'detail',
  className = '',
  width,
  closable,
  styles,
  ...props
}: AdaptiveDrawerProps) {
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
      height={isBottom ? (props.height ?? '80dvh') : props.height}
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
          touchAction: 'pan-y',
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
  const resolvedClassName =
    `adaptive-overlay ${isFullscreenMobile ? 'adaptive-overlay-mobile-fullscreen' : ''} ${className}`.trim();

  return {
    isMobile,
    isFullscreenMobile,
    width: resolvedWidth,
    style: resolvedStyle,
    styles: resolvedStyles,
    className: resolvedClassName,
  };
}

export function AdaptiveModal({
  intent = 'form',
  className = '',
  width,
  style,
  styles,
  modalRender,
  onCancel,
  closable,
  ...props
}: AdaptiveModalProps) {
  const tier = useResponsiveTier();
  const config = resolveAdaptiveModalConfig({ tier, intent, style, styles, width, className });
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const swipeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lastDy: number;
    startTime: number;
    bodyEl: HTMLElement | null;
    pulling: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    lastDy: 0,
    startTime: 0,
    bodyEl: null,
    pulling: false,
  });

  const canSwipeDismiss = config.isFullscreenMobile && closable !== false && typeof onCancel === 'function';

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!canSwipeDismiss || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const targetEl = e.target instanceof HTMLElement ? e.target : null;
      const bodyEl = targetEl?.closest('.ant-modal-body') as HTMLElement | null;
      if (bodyEl && bodyEl.scrollTop > 0) {
        swipeRef.current.active = false;
        return;
      }
      swipeRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        lastDy: 0,
        startTime: Date.now(),
        bodyEl,
        pulling: false,
      };
    },
    [canSwipeDismiss]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const swipe = swipeRef.current;
    if (!swipe.active || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipe.startX;
    const dy = touch.clientY - swipe.startY;
    if (swipe.bodyEl && !swipe.pulling && swipe.bodyEl.scrollTop > 0) {
      swipe.active = false;
      swipe.lastDy = 0;
      return;
    }
    if (!swipe.pulling) {
      if (dy < -6) {
        swipe.active = false;
        swipe.lastDy = 0;
        return;
      }
      if (dy <= 8 || Math.abs(dy) <= Math.abs(dx) * 1.15) return;
      swipe.pulling = true;
    }
    const clampedDy = Math.max(0, Math.min(dy, 360));
    swipe.lastDy = clampedDy;
    setDragOffsetY(clampedDy);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const swipe = swipeRef.current;
      if (!swipe.active) return;
      swipe.active = false;
      const wasPulling = swipe.pulling;
      const pulledDy = swipe.lastDy;
      swipe.pulling = false;
      swipe.lastDy = 0;
      const elapsed = Math.max(1, Date.now() - swipe.startTime);
      const velocity = pulledDy / elapsed;
      const shouldDismiss = wasPulling && (pulledDy >= 80 || (velocity >= 0.45 && pulledDy >= 36));
      setDragOffsetY(0);
      if (shouldDismiss && onCancel) {
        onCancel(e as unknown as React.MouseEvent<HTMLButtonElement>);
      }
    },
    [onCancel]
  );

  const composedModalRender = useCallback(
    (node: React.ReactNode) => {
      const rendered = modalRender ? modalRender(node) : node;
      if (!canSwipeDismiss || !React.isValidElement(rendered)) return rendered;
      const existingProps = (rendered.props ?? {}) as Record<string, unknown>;
      const existingStyle = (existingProps.style as React.CSSProperties | undefined) ?? {};
      return React.cloneElement(rendered as React.ReactElement<Record<string, unknown>>, {
        style: dragOffsetY > 0 ? { ...existingStyle, transform: `translateY(${dragOffsetY}px)` } : existingStyle,
        onTouchStart: (ev: React.TouchEvent<HTMLElement>) => {
          (existingProps.onTouchStart as ((e: React.TouchEvent<HTMLElement>) => void) | undefined)?.(ev);
          handleTouchStart(ev);
        },
        onTouchMove: (ev: React.TouchEvent<HTMLElement>) => {
          (existingProps.onTouchMove as ((e: React.TouchEvent<HTMLElement>) => void) | undefined)?.(ev);
          handleTouchMove(ev);
        },
        onTouchEnd: (ev: React.TouchEvent<HTMLElement>) => {
          (existingProps.onTouchEnd as ((e: React.TouchEvent<HTMLElement>) => void) | undefined)?.(ev);
          handleTouchEnd(ev);
        },
        onTouchCancel: (ev: React.TouchEvent<HTMLElement>) => {
          (existingProps.onTouchCancel as ((e: React.TouchEvent<HTMLElement>) => void) | undefined)?.(ev);
          handleTouchEnd(ev);
        },
      });
    },
    [modalRender, canSwipeDismiss, dragOffsetY, handleTouchStart, handleTouchMove, handleTouchEnd]
  );

  return (
    <Modal
      {...props}
      closable={closable}
      onCancel={onCancel}
      width={config.width}
      style={config.style}
      styles={config.styles}
      className={config.className}
      modalRender={modalRender || canSwipeDismiss ? composedModalRender : undefined}
    />
  );
}

export function AdaptiveOverlayFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`responsive-overlay-footer ${className}`}>{children}</div>;
}
