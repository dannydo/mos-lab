'use client';

import React from 'react';
import { Camera } from 'lucide-react';

export interface AvatarCropHeaderProps {
  isDark: boolean;
}

export const AvatarCropHeader: React.FC<AvatarCropHeaderProps> = ({ isDark }) => (
  <div
    className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}
  >
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
        <Camera size={16} />
      </div>
      <div>
        <h2
          className={`text-sm md:text-base font-bold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          Căn Chỉnh &amp; Chấm Điểm AI
        </h2>
        <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Apple Viewfinder &amp; Wings Coach
        </p>
      </div>
    </div>
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
        isDark
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          : 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
      }`}
    >
      PRO
    </span>
  </div>
);
