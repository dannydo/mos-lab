'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface IosStatusBarProps {
  darkTheme?: boolean;
}

export function IosStatusBar({ darkTheme = true }: IosStatusBarProps) {
  const [timeStr, setTimeStr] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const textColor = darkTheme ? 'text-white' : 'text-neutral-900';

  return (
    <div
      className={`w-full h-11 px-6 flex items-center justify-between text-xs font-semibold select-none ${textColor} z-50`}
    >
      {/* Time */}
      <span className="tabular-nums tracking-tight font-medium text-[14px]">{timeStr}</span>

      {/* Dynamic Island Pill (Center) */}
      <div className="w-28 h-6 bg-black rounded-full flex items-center justify-end px-2 space-x-1 border border-neutral-800 shadow-inner">
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-900/90 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-blue-500/40" />
        </div>
      </div>

      {/* Right Icons: Signal, Wifi, Battery */}
      <div className="flex items-center space-x-1.5">
        <Signal className="w-3.5 h-3.5 stroke-[2.5]" />
        <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
        <div className="flex items-center space-x-0.5">
          <div className="w-5 h-2.5 rounded-[4px] border border-current p-0.5 flex items-center">
            <div className="w-3.5 h-full bg-emerald-500 rounded-[2px]" />
          </div>
          <div className="w-0.5 h-1 bg-current rounded-r-sm" />
        </div>
      </div>
    </div>
  );
}
