'use client';

import React from 'react';
import { Switch } from 'antd';
import { PhoneCall, Radio } from 'lucide-react';
import { useOmiCall } from '../../context/OmiCallContext';

function getCallStatusInfo({
  isRegistered,
  omicallReady,
  callState,
}: {
  isRegistered: boolean;
  omicallReady: boolean;
  callState: string;
}) {
  if (callState === 'connected') {
    return {
      text: 'Đang trong cuộc gọi',
      dotClass: 'bg-rose-500 animate-pulse',
      iconClass: 'bg-rose-500/15 text-rose-500',
    };
  }
  if (callState === 'incoming') {
    return {
      text: 'Có cuộc gọi đến...',
      dotClass: 'bg-amber-500 animate-bounce',
      iconClass: 'bg-amber-500/15 text-amber-500',
    };
  }
  if (callState === 'ringing') {
    return {
      text: 'Đang đổ chuông...',
      dotClass: 'bg-amber-500 animate-bounce',
      iconClass: 'bg-amber-500/15 text-amber-500',
    };
  }
  if (callState === 'confirming') {
    return { text: 'Sẵn sàng gọi ra', dotClass: 'bg-emerald-500', iconClass: 'bg-emerald-500/15 text-emerald-500' };
  }
  if (isRegistered) {
    return {
      text: 'Sẵn sàng nhận cuộc gọi',
      dotClass: 'bg-emerald-500',
      iconClass: 'bg-emerald-500/15 text-emerald-500',
    };
  }
  if (omicallReady) {
    return {
      text: 'Đang kết nối tổng đài...',
      dotClass: 'bg-sky-500 animate-pulse',
      iconClass: 'bg-sky-500/15 text-sky-500',
    };
  }
  return { text: 'Chưa bật nhận cuộc gọi', dotClass: 'bg-slate-400', iconClass: 'bg-slate-500/10 text-slate-400' };
}

interface ProfileOmiCallSectionProps {
  isDark: boolean;
}

export const ProfileOmiCallSection: React.FC<ProfileOmiCallSectionProps> = ({ isDark }) => {
  const {
    isRegistered,
    callState,
    omicallReady,
    setOmicallReady,
    floatingLauncherVisible,
    setFloatingLauncherVisible,
    canAccessOmiCall,
    isGrowthMember,
    isAdmin,
    adminOmiCallEnabled,
    setAdminOmiCallEnabled,
  } = useOmiCall();

  if (!isAdmin && !isGrowthMember) return null;
  const callStatus = getCallStatusInfo({ isRegistered, omicallReady, callState });

  return (
    <div
      className="p-3 rounded-2xl border space-y-2 transition-colors"
      style={{
        backgroundColor: 'var(--mos-surface-raised, var(--mos-surface))',
        borderColor: 'var(--mos-surface-border)',
      }}
    >
      <div className="text-[11px] font-bold uppercase tracking-wider px-0.5 text-neutral-400">
        {canAccessOmiCall ? 'Tổng đài & Tiện ích' : 'Tiện ích'}
      </div>

      {isAdmin && (
        <div className="flex items-center justify-between gap-2 px-1 py-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                adminOmiCallEnabled ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Bật công cụ OmiCall tổng đài
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-neutral-400 truncate">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${adminOmiCallEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}
                />
                <span className="truncate">
                  {adminOmiCallEnabled ? 'Đang bật · Đã kết nối' : 'Đang tắt (mặc định)'}
                </span>
              </div>
            </div>
          </div>
          <Switch
            size="small"
            checked={adminOmiCallEnabled}
            aria-label="Bật công cụ OmiCall tổng đài cho Admin"
            onChange={(checked) => setAdminOmiCallEnabled(checked)}
          />
        </div>
      )}

      {!isAdmin && isGrowthMember && (
        <>
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${callStatus.iconClass}`}>
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  Nhận cuộc gọi tổng đài
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-neutral-400 truncate">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${callStatus.dotClass}`} />
                  <span className="truncate">{callStatus.text}</span>
                </div>
              </div>
            </div>
            <Switch
              size="small"
              checked={omicallReady}
              aria-label="Bật nhận cuộc gọi tổng đài OmiCall"
              onChange={(checked) => setOmicallReady(checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Nút gọi nổi màn hình
              </div>
            </div>
            <Switch
              size="small"
              checked={floatingLauncherVisible}
              aria-label="Hiển thị nút gọi nổi OmiCall"
              onChange={setFloatingLauncherVisible}
            />
          </div>
        </>
      )}
    </div>
  );
};
