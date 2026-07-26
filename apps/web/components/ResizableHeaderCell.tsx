'use client';

import React, { useState, useRef } from 'react';

interface ResizableHeaderCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  onResize?: (width: number) => void;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizableHeaderCell(props: ResizableHeaderCellProps) {
  const { onResize, width, minWidth = 70, maxWidth = 800, children, style, className, ...restProps } = props;
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  if (!onResize || !width) {
    return (
      <th style={style} className={className} {...restProps}>
        {children}
      </th>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = Number(width);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + deltaX));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      style={{
        ...style,
        position: 'relative',
        userSelect: isResizing ? 'none' : undefined,
      }}
      className={`${className || ''} ${isResizing ? 'select-none' : ''}`}
      {...restProps}
    >
      <div style={{ paddingRight: '8px' }}>{children}</div>
      <div
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '12px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="group"
        title="Kéo để thay đổi độ rộng cột (Tự động lưu F5)"
      >
        <div
          style={{
            width: isResizing ? '3px' : '2px',
            height: '100%',
            backgroundColor: isResizing ? '#D4A84B' : 'transparent',
            transition: 'background-color 0.15s ease-in-out',
          }}
          className="group-hover:bg-[#D4A84B]/70"
        />
      </div>
    </th>
  );
}
