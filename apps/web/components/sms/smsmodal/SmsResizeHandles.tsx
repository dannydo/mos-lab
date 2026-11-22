'use client';

import React from 'react';
import { Tooltip } from 'antd';
import type { SmsResizeDirection } from './smsModalTypes';

export interface SmsResizeHandlesProps {
  isDark: boolean;
  onDragStart: (e: React.MouseEvent, direction: SmsResizeDirection) => void;
}

export const SmsResizeHandles: React.FC<SmsResizeHandlesProps> = ({ isDark, onDragStart }) => {
  const iconToneClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      <Tooltip title="Kéo góc để điều chỉnh chiều rộng Modal">
        <div
          onMouseDown={(e) => onDragStart(e, 'right')}
          className={`absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize z-20 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity ${iconToneClass}`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M9 1L1 9M9 5L5 9M9 9H9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </Tooltip>

      <Tooltip title="Kéo góc để điều chỉnh chiều rộng Modal">
        <div
          onMouseDown={(e) => onDragStart(e, 'left')}
          className={`absolute left-1 bottom-1 w-4 h-4 cursor-nesw-resize z-20 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity ${iconToneClass}`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 1L9 9M1 5L5 9M1 9H1.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </Tooltip>
    </>
  );
};
