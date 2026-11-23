'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { ClipboardList, RotateCw } from 'lucide-react';

interface TvJournalHeaderProps {
  isDark: boolean;
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

/** Header bar for the TV Monitor journal modal with role badge, refresh trigger, and close action. */
export const TvJournalHeader: React.FC<TvJournalHeaderProps> = ({ isDark, loading, onRefresh, onClose }) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
        isDark ? 'border-zinc-800' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
          <div
            className={`w-full h-full rounded-[10px] flex items-center justify-center ${
              isDark ? 'bg-zinc-950' : 'bg-white'
            }`}
          >
            <ClipboardList className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2
              className={`text-base sm:text-lg font-black tracking-tight m-0 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}
            >
              NHẬT KÝ TV MONITOR · GIÁM SÁT LIVE EVENTS
            </h2>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                isDark
                  ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              MANAGER / ADMIN
            </span>
          </div>
          <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Kiểm tra từng bước xử lý sự kiện: Tiếp nhận TV → Kích hoạt Voice → Kích hoạt Overlay
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Tooltip title="Làm mới lịch sử sự kiện">
          <Button
            type="text"
            aria-label="Làm mới lịch sử sự kiện"
            icon={
              <RotateCw
                className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-slate-600'} ${loading ? 'animate-spin' : ''}`}
              />
            }
            onClick={onRefresh}
            className={`!rounded-xl !h-9 !w-9 !p-0 flex items-center justify-center border transition-all ${
              isDark
                ? '!text-zinc-300 hover:!bg-zinc-800 border-zinc-700'
                : '!text-slate-600 hover:!bg-slate-100 border-slate-300 shadow-sm'
            }`}
          />
        </Tooltip>
        <Button
          onClick={onClose}
          className={`rounded-xl text-xs h-9 px-3 font-semibold border transition-all ${
            isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
          }`}
        >
          Đóng
        </Button>
      </div>
    </div>
  );
};
