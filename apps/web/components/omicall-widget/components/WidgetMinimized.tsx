import React from 'react';
import { PhoneOutlined } from '@ant-design/icons';

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
  return (
    <div
      onMouseDown={onDragStart}
      className="fixed h-14 w-14 rounded-full flex items-center justify-center cursor-pointer shadow-2xl hover:scale-105 animate-pulse"
      style={{
        background: '#D4A84B',
        boxShadow: '0 8px 30px rgba(212, 168, 75, 0.4)',
        border: '2px solid white',
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        right: position ? undefined : '24px',
        bottom: position ? undefined : '24px',
        zIndex: 9999,
      }}
    >
      {callState === 'connected' ? (
        <span className="text-black font-bold text-xs">{formatDuration(callDuration)}</span>
      ) : (
        <PhoneOutlined style={{ fontSize: '20px', color: 'black' }} />
      )}
    </div>
  );
};
export default WidgetMinimized;
