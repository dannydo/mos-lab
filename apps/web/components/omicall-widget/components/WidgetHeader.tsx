import React from 'react';
import { Button } from 'antd';
import { MinusOutlined } from '@ant-design/icons';

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
      style={{
        borderColor: borderColor,
        background: isDark ? 'rgba(24, 24, 27, 0.9)' : 'rgba(244, 244, 245, 0.9)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full transition-all duration-300 ${
            callState !== 'idle'
              ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]'
              : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
          }`}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 font-sans">
          {isTabMuted ? 'OmiCall (Tab khác)' : 'OmiCall WebRTC'}
        </span>
        {isSimulated && (
          <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full leading-none bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 tracking-wider">
            MÔ PHỎNG
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="text"
          size="small"
          onClick={onMinimize}
          icon={<MinusOutlined style={{ fontSize: '14px' }} />}
          className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-zinc-500/10 transition-colors"
        />
      </div>
    </div>
  );
};
export default WidgetHeader;
