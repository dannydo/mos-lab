'use client';

import React, { useState, useRef } from 'react';

interface ResizableHeaderCellProps extends React.HTMLAttributes<HTMLTableHeaderCellElement> {
  width?: number;
  onResize?: (width: number) => void;
}

export const ResizableHeaderCell: React.FC<ResizableHeaderCellProps> = ({
  width,
  onResize,
  style,
  children,
  ...restProps
}) => {
  const [resizing, setResizing] = useState(false);
  const cellRef = useRef<HTMLTableHeaderCellElement>(null);

  // If onResize callback is not present, fallback to standard th
  if (!onResize) {
    return (
      <th style={style} {...restProps}>
        {children}
      </th>
    );
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);

    const startX = e.clientX;
    // Resolve start width: prioritise set width prop, fallback to actual offset width
    const startWidth = width || (cellRef.current ? cellRef.current.offsetWidth : 120);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Prevent reducing column width to less than 50px
      const newWidth = Math.max(50, startWidth + deltaX);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      ref={cellRef}
      style={{
        ...style,
        position: 'relative',
        userSelect: resizing ? 'none' : 'auto',
      }}
      {...restProps}
    >
      <div style={{ display: 'inline-block', width: '100%' }}>{children}</div>
      <span
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: 'col-resize',
          zIndex: 10,
          userSelect: 'none',
          background: resizing ? 'rgba(212, 168, 75, 0.4)' : 'transparent',
          transition: 'background 0.2s',
        }}
        onMouseDown={handleMouseDown}
        className="table-column-resize-handle"
      />
    </th>
  );
};
