import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';

interface CallAnalyzingProps {
  descColor: string;
}

export const CallAnalyzing: React.FC<CallAnalyzingProps> = ({ descColor }) => {
  return (
    <div className="p-6 space-y-4 text-center">
      <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
        <LoadingOutlined className="text-2xl" />
      </div>
      <div>
        <h4 className="text-sm font-bold">🤖 AI đang phân tích cuộc gọi...</h4>
        <p className="text-xs mt-1" style={{ color: descColor }}>
          Đang phân tích tiếng cười và kết luận Happy Call từ ghi âm.
        </p>
      </div>

      {/* Animated Waveform */}
      <div className="flex items-end justify-center gap-[3px] h-12 my-4 bg-zinc-900/5 border border-zinc-800/10 rounded-lg p-2 overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent to-amber-500/10 animate-pulse border-r border-amber-500/30"></div>
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="w-[3px] bg-amber-500 rounded-full animate-bounce"
            style={{
              height: `${15 + Math.sin(i * 0.8) * 12 + Math.cos(i * 0.4) * 8}px`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: '0.9s',
            }}
          />
        ))}
      </div>

      <div className="text-[11px] font-mono" style={{ color: descColor }}>
        Thời gian chờ dự kiến: ~10 giây
      </div>
    </div>
  );
};
export default CallAnalyzing;
