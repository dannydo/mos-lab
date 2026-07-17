'use client';

import React from 'react';

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
  if (!width || !onResize) {
    return (
      <th style={style} {...restProps}>
        {children}
      </th>
    );
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Prevent reducing column width to less than 50px
      const newWidth = Math.max(50, startWidth + deltaX);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      style={{
        ...style,
        position: 'relative',
      }}
      {...restProps}
    >
      {children}
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
        }}
        onMouseDown={handleMouseDown}
        className="table-column-resize-handle"
      />
    </th>
  );
};
