import React from 'react';
import { PhoneOutlined } from '@ant-design/icons';
import { theme } from 'antd';

interface WidgetMinimizedProps {
  callState: string;
  callDuration: number;
  formatDuration: (secs: number) => string;
  onDragStart: (e: React.MouseEvent) => void;
  position: { x: number; y: number } | null;
}

export const WidgetMinimized: React.FC<WidgetMinimizedProps> = ({
  callState,
  callDuration,
  formatDuration,
  onDragStart,
  position,
}) => {
  const { token } = theme.useToken();

  return (
    <div
      onMouseDown={onDragStart}
      className="omicall-launcher fixed h-11 w-11 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform"
      style={{
        width: 44,
        minWidth: 44,
        height: 44,
        background: 'var(--mos-accent, ' + token.colorPrimary + ')',
        boxShadow: token.boxShadowSecondary || '0 4px 14px rgba(0, 0, 0, 0.15)',
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        right: position ? 'auto' : 'calc(var(--mos-floating-offset) + env(safe-area-inset-right))',
        bottom: position ? 'auto' : 'calc(var(--mos-floating-offset) + env(safe-area-inset-bottom))',
        zIndex: 10040,
      }}
    >
      {callState === 'connected' ? (
        <span
          className="font-bold text-[11px] font-mono leading-none"
          style={{ color: 'var(--mos-accent-contrast, #000000)' }}
        >
          {formatDuration(callDuration)}
        </span>
      ) : (
        <PhoneOutlined style={{ fontSize: '18px', color: 'var(--mos-accent-contrast, #000000)' }} />
      )}
    </div>
  );
};
export default WidgetMinimized;
