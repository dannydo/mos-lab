'use client';

import React from 'react';
import { CopyPhoneButton, StatusTag } from '~/components/ui';
import type { CurrentCall } from '~/context/omicall/types';
import { formatCallDuration } from './callLogModalHelpers';

export interface CallActiveBannerProps {
  activeCall: CurrentCall;
  callDuration: number;
  isDark: boolean;
}

export const CallActiveBanner: React.FC<CallActiveBannerProps> = ({ activeCall, callDuration, isDark }) => (
  <div
    className={`mt-4 p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
      isDark ? 'bg-amber-500/[0.04] border-amber-500/15' : 'bg-amber-500/[0.02] border-amber-500/10'
    }`}
  >
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          callDuration > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        {activeCall.direction === 'outbound' ? '📞 Cuộc gọi đi' : '📥 Cuộc gọi đến'}
      </span>
      <span className="text-zinc-500 font-mono tabular-nums">({activeCall.phone})</span>
      <CopyPhoneButton phone={activeCall.phone} size="xs" />
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <span className={`font-mono tabular-nums ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        ⏱ {formatCallDuration(callDuration)}
      </span>
      <StatusTag
        status={callDuration > 0 ? 'success' : 'error'}
        bordered={false}
        className="font-bold text-[10px] uppercase"
        label={callDuration > 0 ? 'Đã kết nối' : 'Không bắt máy'}
      />
    </div>
  </div>
);
