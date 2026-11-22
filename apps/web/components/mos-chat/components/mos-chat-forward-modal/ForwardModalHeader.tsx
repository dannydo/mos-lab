'use client';

import React from 'react';
import { Forward } from 'lucide-react';

export interface ForwardModalHeaderProps {
  isDark: boolean;
  isReplyForward: boolean;
}

export const ForwardModalHeader: React.FC<ForwardModalHeaderProps> = ({ isDark, isReplyForward }) => (
  <div
    className={`px-4 py-3.5 border-b flex items-center gap-2.5 pr-11 ${
      isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
    }`}
  >
    <div
      className={`w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 ${
        isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-600/10 text-amber-600'
      }`}
    >
      <Forward size={16} />
    </div>
    <div className="min-w-0">
      <h2 className={`text-[15px] font-bold leading-tight m-0 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
        {isReplyForward ? 'Chuyển tiếp phản hồi' : 'Chuyển tiếp tin nhắn'}
      </h2>
      <p className={`text-[11.5px] m-0 mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Chọn 1 hoặc nhiều Space, DM hoặc đồng nghiệp bất kỳ để gửi qua
      </p>
    </div>
  </div>
);
