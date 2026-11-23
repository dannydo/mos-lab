'use client';

import React from 'react';

/**
 * Attaches desktop-only left/right ew-resize edge handles to an Antd modal node.
 * Disabled on mobile/compact viewports so touch gestures never collide with resize edges.
 */
export function renderDesktopResizableModal(
  modal: React.ReactNode,
  isMobile: boolean,
  onDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void,
  hoverColor = 'rgba(212, 168, 75, 0.3)'
): React.ReactNode {
  if (isMobile || !React.isValidElement(modal)) {
    return modal;
  }

  return React.cloneElement(modal as SafeAny, {
    style: {
      ...(modal.props as SafeAny)?.style,
      position: 'relative',
    },
    children: (
      <>
        {(modal.props as SafeAny)?.children}
        {(['right', 'left'] as const).map((direction) => (
          <div
            key={direction}
            style={{
              position: 'absolute',
              top: 0,
              [direction]: '-4px',
              bottom: 0,
              width: '8px',
              cursor: 'ew-resize',
              zIndex: 10,
              transition: 'background 0.2s',
            }}
            onMouseDown={(e) => onDragStart(e, direction)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = hoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          />
        ))}
      </>
    ),
  });
}
