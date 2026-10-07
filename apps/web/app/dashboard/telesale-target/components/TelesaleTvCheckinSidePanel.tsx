'use client';

import React from 'react';
import { CheckCircle2, X, Sparkles, User, Crown, Coins, Clock, Scissors, Package } from 'lucide-react';
import { Avatar, Tooltip } from 'antd';
import type { TelesaleTodayCheckinItem } from '@mos-lab/shared';

interface TelesaleTvCheckinSidePanelProps {
  checkinList?: TelesaleTodayCheckinItem[];
  isDark: boolean;
  onClose: () => void;
}

export const TelesaleTvCheckinSidePanel: React.FC<TelesaleTvCheckinSidePanelProps> = ({
  checkinList = [],
  isDark,
  onClose,
}) => {
  const totalCount = checkinList.length;
  const doneCount = checkinList.filter((item) => item.isDone).length;
  const comboCount = checkinList.filter((item) => item.hasCombo).length;
  const tipCount = checkinList.filter((item) => item.hasTip).length;

  return (
    <aside
      data-testid="tv-checkin-side-panel"
      className={`w-[320px] xl:w-[340px] 2xl:w-[360px] shrink-0 h-full flex flex-col rounded-3xl border backdrop-blur-xl transition-all duration-300 shadow-2xl overflow-hidden ${
        isDark
          ? 'bg-zinc-900/90 border-emerald-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.6)]'
          : 'bg-white/95 border-emerald-300/80 shadow-[0_4px_24px_rgba(16,185,129,0.12)]'
      }`}
    >
      {/* Top Header */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-zinc-950/70 border-zinc-800/80' : 'bg-emerald-50/70 border-emerald-200/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                : 'bg-emerald-100 border border-emerald-300 text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3
              className={`text-xs xl:text-sm font-black tracking-wider uppercase m-0 truncate ${
                isDark ? 'text-zinc-100' : 'text-slate-900'
              }`}
            >
              CHECK-IN HÔM NAY
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold mt-0.5">
              <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{totalCount} khách</span>
              <span className={isDark ? 'text-zinc-600' : 'text-slate-300'}>·</span>
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>{doneCount} hoàn tất</span>
              {(comboCount > 0 || tipCount > 0) && (
                <>
                  <span className={isDark ? 'text-zinc-600' : 'text-slate-300'}>·</span>
                  <span className="text-purple-500 font-bold">
                    {comboCount > 0 && `+${comboCount} Combo`}
                    {comboCount > 0 && tipCount > 0 && ', '}
                    {tipCount > 0 && `+${tipCount} Tip`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <Tooltip title="Thu gọn panel Check-in (Bấm nút trên thanh Top Bar để mở lại)">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng panel Check-in hôm nay"
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
              isDark
                ? 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>

      {/* List Container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5 custom-tv-scroll">
        {checkinList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <CheckCircle2 className={`w-8 h-8 opacity-40 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              Chưa có khách nào check-in hôm nay
            </p>
          </div>
        ) : (
          checkinList.map((item, index) => {
            const isSuperWin = item.isDone && item.hasCombo && item.hasTip;
            const isComboWin = item.isDone && item.hasCombo;
            const isTipWin = item.isDone && item.hasTip;
            const isDoneNormal = item.isDone && !item.hasCombo && !item.hasTip;
            const isInService = !item.isDone;

            return (
              <div
                key={`${item.orderId}-${index}`}
                className={`p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                  isSuperWin
                    ? isDark
                      ? 'bg-gradient-to-br from-purple-950/40 via-zinc-950 to-amber-950/30 border-purple-500/70 shadow-[0_0_16px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/50'
                      : 'bg-gradient-to-br from-purple-50 via-white to-amber-50 border-purple-400 shadow-[0_2px_14px_rgba(168,85,247,0.2)] ring-1 ring-purple-300'
                    : isComboWin
                      ? isDark
                        ? 'bg-purple-950/30 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/40'
                        : 'bg-purple-50/70 border-purple-300 shadow-[0_2px_10px_rgba(168,85,247,0.15)] ring-1 ring-purple-200'
                      : isTipWin
                        ? isDark
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
                          : 'bg-amber-50/70 border-amber-300 shadow-[0_2px_10px_rgba(245,158,11,0.15)] ring-1 ring-amber-200'
                        : isInService
                          ? isDark
                            ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60'
                            : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                          : isDark
                            ? 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80'
                            : 'bg-slate-50/80 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Status Celebration Banner on Top */}
                {isSuperWin && (
                  <div className="mb-2 -mx-3 -mt-3 px-3 py-1 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 text-white flex items-center justify-between text-[10px] font-black uppercase tracking-wider shadow-sm">
                    <span className="flex items-center gap-1 truncate">
                      <Crown className="w-3 h-3 fill-amber-300 text-amber-200 shrink-0" />
                      <span className="truncate">
                        👑 CHỐT {item.comboPackageName || 'COMBO'} & TIP{' '}
                        {item.tipAmount ? `${item.tipAmount.toLocaleString('vi-VN')}đ` : ''}!
                      </span>
                    </span>
                    <Sparkles className="w-3 h-3 text-amber-200 animate-spin shrink-0" />
                  </div>
                )}

                {isComboWin && !isSuperWin && (
                  <div className="mb-2 -mx-3 -mt-3 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between text-[10px] font-black uppercase tracking-wider shadow-sm">
                    <span className="flex items-center gap-1 truncate">
                      <Crown className="w-3 h-3 text-purple-200 shrink-0" />
                      <span className="truncate">
                        ✨ ĐÃ CHỐT {item.comboPackageName ? item.comboPackageName.toUpperCase() : 'COMBO MỚI'}!
                      </span>
                    </span>
                    <Sparkles className="w-3 h-3 text-purple-200 shrink-0" />
                  </div>
                )}

                {isTipWin && !isSuperWin && (
                  <div className="mb-2 -mx-3 -mt-3 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white flex items-center justify-between text-[10px] font-black uppercase tracking-wider shadow-sm">
                    <span className="flex items-center gap-1 truncate">
                      <Coins className="w-3 h-3 fill-white shrink-0" />
                      <span className="truncate">
                        💛 KHÁCH TIP +{item.tipAmount ? `${item.tipAmount.toLocaleString('vi-VN')}đ` : ''}!
                      </span>
                    </span>
                    <Sparkles className="w-3 h-3 text-white shrink-0" />
                  </div>
                )}

                {/* Row 1: Customer Avatar + Name + In-Service/Done Pill */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative shrink-0">
                    <Avatar
                      size={36}
                      src={item.customerAvatar}
                      icon={<User className="w-4 h-4" />}
                      className={`font-bold border ${
                        isInService
                          ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                          : 'border-purple-400/40 bg-purple-500/20 text-purple-300'
                      }`}
                    >
                      {item.customerName?.slice(0, 1) || 'K'}
                    </Avatar>
                    {/* Booker Avatar Overlay at bottom-right */}
                    {item.bookerAvatar ? (
                      <img
                        src={item.bookerAvatar}
                        alt={item.bookerName}
                        title={`Tạo lịch bởi: ${item.bookerName}`}
                        className="w-4 h-4 rounded-full border border-white dark:border-zinc-900 absolute -bottom-1 -right-1 shadow-sm object-cover"
                      />
                    ) : (
                      <span
                        title={`Tạo lịch bởi: ${item.bookerName}`}
                        className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black absolute -bottom-1 -right-1 flex items-center justify-center border border-white dark:border-zinc-900 shadow-sm"
                      >
                        {item.bookerName?.slice(0, 1) || 'B'}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`text-xs font-black truncate max-w-[130px] ${
                          isDark ? 'text-zinc-100' : 'text-slate-900'
                        }`}
                      >
                        {item.customerName}
                      </span>
                      {isInService ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Đang làm {item.timeInService ? `(${item.timeInService})` : ''}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 shrink-0">
                          Xong
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                      {item.customerPhone && <span className="tabular-nums">{item.customerPhone}</span>}
                      <span>·</span>
                      <span className="text-blue-400 font-semibold truncate max-w-[100px]">BK: {item.bookerName}</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Service Name (Bộ mi đang làm) */}
                <div
                  className={`p-1.5 rounded-xl border flex items-center justify-between gap-1.5 mb-1.5 ${
                    isDark ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold truncate">
                    <Scissors className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate text-emerald-600 dark:text-emerald-300">
                      {item.serviceName || 'Nối mi thiết kế'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>
                    Vào: {item.checkinDateDisplay}
                  </span>
                </div>

                {/* Combo Package Row if purchased or combo member */}
                {item.hasCombo && item.comboPackageName && (
                  <div
                    className={`p-1.5 px-2 rounded-xl border flex items-center justify-between gap-1.5 mb-1.5 text-[10px] font-bold ${
                      isDark
                        ? 'bg-purple-950/60 border-purple-500/50 text-purple-200 shadow-sm'
                        : 'bg-purple-50 border-purple-200 text-purple-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Package className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">Gói: {item.comboPackageName}</span>
                    </div>
                    {item.comboPrice && (
                      <span className="font-mono text-purple-400 dark:text-purple-300 shrink-0 tabular-nums">
                        {item.comboPrice.toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </div>
                )}

                {/* Row 3: Staff in salon (Chuyên Viên CV & Tư Vấn CC) */}
                <div className="flex items-center justify-between text-[10px] font-semibold pt-0.5">
                  <div className="flex items-center gap-1 truncate text-zinc-400">
                    <span>CV:</span>
                    <span className={`font-bold truncate max-w-[85px] ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                      {item.assignedStaffName || 'Đang phân'}
                    </span>
                  </div>
                  {item.checkInStaffName && (
                    <div className="flex items-center gap-1 truncate text-zinc-400">
                      <span>CC:</span>
                      <span
                        className={`font-bold truncate max-w-[85px] ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}
                      >
                        {item.checkInStaffName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
