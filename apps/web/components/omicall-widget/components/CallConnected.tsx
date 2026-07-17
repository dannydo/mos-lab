import React from 'react';
import { Button } from 'antd';
import { AudioMutedOutlined, PauseOutlined } from '@ant-design/icons';

interface CallConnectedProps {
  currentCall: SafeAny;
  callDuration: number;
  isSimulated: boolean;
  isMuted: boolean;
  isHeld: boolean;
  descColor: string;
  borderColor: string;
  subBg: string;
  toggleMute: () => void;
  toggleHold: () => void;
  hangUp: () => void;
  children?: React.ReactNode;
  getProgressPercentage: () => number;
  getProgressBarColor: () => string;
  formatDuration: (secs: number) => string;
}

export const CallConnected: React.FC<CallConnectedProps> = ({
  currentCall,
  callDuration,
  isSimulated,
  isMuted,
  isHeld,
  descColor,
  borderColor,
  subBg,
  toggleMute,
  toggleHold,
  hangUp,
  children,
  getProgressPercentage,
  getProgressBarColor,
  formatDuration,
}) => {
  return (
    <div className="p-6 space-y-5">
      <div className="text-center">
        <div className="text-3xl font-bold font-mono tracking-tight">{formatDuration(callDuration)}</div>
        <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: descColor }}>
          Thời gian đàm thoại
        </p>
      </div>

      <div className="p-3 border rounded-xl" style={{ borderColor: borderColor, background: subBg }}>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span>{currentCall?.name}</span>
          <span className="font-mono text-zinc-500">{currentCall?.phone}</span>
        </div>
        {isSimulated ? (
          <div
            className="text-[10px] flex items-center gap-1.5 border-t mt-2 pt-2 text-amber-500"
            style={{ borderColor: borderColor }}
          >
            <span className="font-bold">⚠️ CUỘC GỌI MÔ PHỎNG</span>
            <span>Tài khoản chưa có cấu hình máy lẻ</span>
          </div>
        ) : (
          <div
            className="text-[10px] flex items-center gap-1.5 border-t mt-2 pt-2"
            style={{ borderColor: borderColor, color: descColor }}
          >
            <span className="text-red-500 animate-pulse font-bold">● REC</span>
            <span>Ghi âm đang bật — AI sẽ quét sau khi gác máy</span>
          </div>
        )}
      </div>

      {children}

      {/* Color Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs" style={{ color: descColor }}>
          <span>Tiến trình KPI cuộc gọi</span>
          <span className="font-bold">{callDuration}s</span>
        </div>
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative">
          {/* 30s marker */}
          <div className="absolute top-0 bottom-0 left-[16.6%] w-px bg-white/30 z-10" title="Mốc 30 giây"></div>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${getProgressPercentage()}%`,
              background: getProgressBarColor(),
            }}
          />
        </div>
        <div className="flex justify-between text-[9px]" style={{ color: descColor }}>
          <span>0s</span>
          <span className="text-amber-500 font-bold">30s (Min Happy)</span>
          <span className="text-emerald-500 font-bold">180s (Auto Happy)</span>
        </div>
      </div>

      {/* Controls toolbar */}
      <div className="flex justify-center gap-4 pt-2">
        <Button
          shape="circle"
          icon={<AudioMutedOutlined />}
          onClick={toggleMute}
          style={{
            background: isMuted ? '#f59e0b' : '',
            color: isMuted ? 'black' : '',
          }}
        />
        <Button
          shape="circle"
          icon={<PauseOutlined />}
          onClick={toggleHold}
          style={{
            background: isHeld ? '#f59e0b' : '',
            color: isHeld ? 'black' : '',
          }}
        />
        <Button danger type="primary" shape="round" onClick={hangUp} className="px-6 font-bold">
          Gác máy
        </Button>
      </div>
    </div>
  );
};
export default CallConnected;
