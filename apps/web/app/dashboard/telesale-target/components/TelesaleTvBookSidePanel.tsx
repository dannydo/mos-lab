'use client';

import React from 'react';
import { Calendar, X, Sparkles, User, Tag as TagIcon, Clock } from 'lucide-react';
import { Avatar, Tooltip } from 'antd';
import type { TelesaleTodayBookItem } from '@mos-lab/shared';

interface TelesaleTvBookSidePanelProps {
  bookList?: TelesaleTodayBookItem[];
  isDark: boolean;
  onClose: () => void;
}

export const TelesaleTvBookSidePanel: React.FC<TelesaleTvBookSidePanelProps> = ({ bookList = [], isDark, onClose }) => {
  const totalCount = bookList.length;

  return (
    <aside
      data-testid="tv-book-side-panel"
      className={`w-[290px] xl:w-[310px] 2xl:w-[330px] shrink-0 h-full flex flex-col rounded-3xl border backdrop-blur-xl transition-all duration-300 shadow-2xl overflow-hidden ${
        isDark
          ? 'bg-zinc-900/90 border-amber-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.6)]'
          : 'bg-white/95 border-amber-300/80 shadow-[0_4px_24px_rgba(245,158,11,0.12)]'
      }`}
    >
      {/* Top Header */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-zinc-950/70 border-zinc-800/80' : 'bg-amber-50/70 border-amber-200/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                : 'bg-amber-100 border border-amber-300 text-amber-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3
              className={`text-xs xl:text-sm font-black tracking-wider uppercase m-0 truncate ${
                isDark ? 'text-zinc-100' : 'text-slate-900'
              }`}
            >
              BOOK HÔM NAY
            </h3>
            <span
              className={`text-[11px] font-mono font-bold block leading-none mt-0.5 ${
                isDark ? 'text-amber-400' : 'text-amber-700'
              }`}
            >
              {totalCount} lịch hẹn tạo mới
            </span>
          </div>
        </div>

        <Tooltip title="Thu gọn panel Book (Bấm nút trên thanh Top Bar để mở lại)">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng panel Book hôm nay"
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
        {bookList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Calendar className={`w-8 h-8 opacity-40 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              Chưa có lịch hẹn nào được tạo hôm nay
            </p>
          </div>
        ) : (
          bookList.map((item, index) => {
            const isLatest = index === 0;
            return (
              <div
                key={`${item.orderId}-${index}`}
                className={`p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                  isLatest
                    ? isDark
                      ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
                      : 'bg-amber-50/60 border-amber-400/80 shadow-[0_2px_12px_rgba(245,158,11,0.15)] ring-1 ring-amber-300'
                    : isDark
                      ? 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80'
                      : 'bg-slate-50/80 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Latest Pulse Dot */}
                {isLatest && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                )}

                {/* Row 1: Customer Avatar + Name + Booker Chip */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative shrink-0">
                    <Avatar
                      size={36}
                      src={item.customerAvatar}
                      icon={<User className="w-4 h-4" />}
                      className="border border-amber-400/30 bg-amber-500/20 text-amber-300 font-bold"
                    >
                      {item.customerName?.slice(0, 1) || 'K'}
                    </Avatar>
                    {/* Booker Badge Overlay at bottom-right */}
                    {item.bookerAvatar ? (
                      <img
                        src={item.bookerAvatar}
                        alt={item.bookerName}
                        title={`Tư vấn bởi: ${item.bookerName}`}
                        className="w-4 h-4 rounded-full border border-white dark:border-zinc-900 absolute -bottom-1 -right-1 shadow-sm object-cover"
                      />
                    ) : (
                      <span
                        title={`Tư vấn bởi: ${item.bookerName}`}
                        className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black absolute -bottom-1 -right-1 flex items-center justify-center border border-white dark:border-zinc-900 shadow-sm"
                      >
                        {item.bookerName?.slice(0, 1) || 'B'}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-black truncate max-w-[130px] ${
                          isDark ? 'text-zinc-100' : 'text-slate-900'
                        }`}
                      >
                        {item.customerName}
                      </span>
                      {item.isNewCustomer && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                          Mới
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                      {item.customerPhone && <span className="tabular-nums">{item.customerPhone}</span>}
                      <span>·</span>
                      <span className="text-amber-500 font-semibold truncate max-w-[90px]">BK: {item.bookerName}</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Appointment Time (Ngày đến) */}
                <div
                  className={`p-1.5 rounded-xl border flex items-center justify-between gap-1.5 mb-1.5 ${
                    isDark ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300' : 'bg-white border-amber-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold truncate">
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">Hẹn: {item.bookingDateDisplay}</span>
                  </div>
                  <span className={`text-[10px] font-mono shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>
                    {item.timeAgoText || 'Vừa xong'}
                  </span>
                </div>

                {/* Row 3: Promotion Tag (nếu có) */}
                {item.promotionName && (
                  <div className="flex items-center gap-1 pt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border truncate max-w-full ${
                        isDark
                          ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <TagIcon className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{item.promotionName}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
