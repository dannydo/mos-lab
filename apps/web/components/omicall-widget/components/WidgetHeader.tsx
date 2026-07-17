import React from 'react';
import { Tag, Button } from 'antd';
import { BorderOutlined, CloseOutlined } from '@ant-design/icons';

interface WidgetHeaderProps {
  callState: string;
  isRegistered: boolean;
  isTabMuted: boolean;
  isSimulated: boolean;
  themeMode: string;
  onMinimize: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  borderColor: string;
}

export const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  callState,
  isTabMuted,
  isSimulated,
  themeMode,
  onMinimize,
  onDragStart,
  borderColor,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <div
      onMouseDown={onDragStart}
      className="px-4 py-3 flex items-center justify-between border-b cursor-move select-none"
      style={{ borderColor: borderColor, background: isDark ? '#18181b' : '#f4f4f5' }}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${callState !== 'idle' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}
        ></span>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500 font-sans">
          {isTabMuted ? 'OmiCall (Tab khác)' : 'OmiCall WebRTC'}
        </span>
        {isSimulated && (
          <Tag color="warning" className="m-0 text-[9px] font-extrabold uppercase px-1 py-0 border-0 leading-none">
            MÔ PHỎNG
          </Tag>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="text"
          size="small"
          onClick={onMinimize}
          icon={<BorderOutlined style={{ fontSize: '12px' }} />}
          className="flex items-center justify-center h-6 w-6"
        />
      </div>
    </div>
  );
};
export default WidgetHeader;
