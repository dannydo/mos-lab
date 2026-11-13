'use client';

import React from 'react';
import { Play, Pause, CheckCircle2 } from 'lucide-react';

interface IosCircularTimerProps {
  elapsedSeconds: number;
  isRunning: boolean;
  targetMinutes?: number;
  onToggle: () => void;
  onFinish: () => void;
}

export function IosCircularTimer({
  elapsedSeconds,
  isRunning,
  targetMinutes = 75,
  onToggle,
  onFinish,
}: IosCircularTimerProps) {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const targetSeconds = targetMinutes * 60;
  const progressPercent = Math.min(100, (elapsedSeconds / targetSeconds) * 100);

  // SVG circle calculation
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 select-none">
      {/* Circle Container */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 220 220">
          {/* Background track */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke="var(--mos-surface-border-strong, #262626)"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Active progress */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke="var(--mos-accent, #FFB400)"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-300 ease-linear"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="text-xs uppercase tracking-wider font-semibold mb-1"
            style={{ color: 'var(--mos-text-muted)' }}
          >
            Thời Gian Thực Tế
          </span>
          <span
            className="text-3xl font-bold tabular-nums tracking-tight font-mono"
            style={{ color: 'var(--mos-text)' }}
          >
            {timeFormatted}
          </span>
          <span className="text-xs mt-1 font-medium" style={{ color: 'var(--mos-accent)' }}>
            Mục tiêu: {targetMinutes} phút
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center space-x-4 w-full max-w-xs">
        <button
          onClick={onToggle}
          className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer border"
          style={
            isRunning
              ? {
                  backgroundColor: 'var(--mos-focus-ring)',
                  color: 'var(--mos-accent)',
                  borderColor: 'var(--mos-accent)',
                }
              : {
                  backgroundColor: 'var(--mos-accent)',
                  color: 'var(--mos-accent-contrast)',
                  borderColor: 'var(--mos-accent)',
                  boxShadow: 'var(--mos-shadow)',
                }
          }
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Tạm Dừng</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Bắt Đầu Làm</span>
            </>
          )}
        </button>

        <button
          onClick={onFinish}
          className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Hoàn Thành</span>
        </button>
      </div>
    </div>
  );
}
