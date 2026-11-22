'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { History } from 'lucide-react';
import type { TelesaleDailySnapshotItem } from '@mos-lab/shared';
import { getMiniTierBadgeClass, getSnapshotRowDotClass } from './tvMonitorCardStyles';

interface TvMonitorSnapshotsStripProps {
  isDark: boolean;
  month: string;
  snapshots: TelesaleDailySnapshotItem[];
  onSelectDate: (dateStr: string) => void;
}

/** Scrollable strip of past-day Book & Check-in snapshots within the active month, opening the TV journal on click. */
export const TvMonitorSnapshotsStrip: React.FC<TvMonitorSnapshotsStripProps> = ({
  isDark,
  month,
  snapshots,
  onSelectDate,
}) => {
  return (
    <div className={`mt-2 pt-1 border-t border-dashed ${isDark ? 'border-zinc-800/80' : 'border-slate-200'}`}>
      <div
        className={`flex items-center justify-between text-[10px] font-mono px-0.5 mb-1.5 font-semibold ${
          isDark ? 'text-zinc-300' : 'text-slate-700'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <History className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className={`${isDark ? 'text-zinc-200' : 'text-slate-800'} font-bold tracking-wide`}>
            SNAPSHOT CÁC NGÀY QUA ({month})
          </span>
        </span>
        <span className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} text-[9px]`}>
          Hiển thị 7 ngày gần nhất · Bấm xem chi tiết
        </span>
      </div>

      <div
        data-testid="tv-daily-snapshots-list"
        className={`max-h-[165px] overflow-y-auto space-y-1 pr-0.5 rounded-xl p-1.5 border transition-all ${
          isDark
            ? 'bg-black/40 border-zinc-800/80 scrollbar-thin scrollbar-thumb-zinc-700'
            : 'bg-slate-50 border-slate-200 scrollbar-thin scrollbar-thumb-slate-300'
        }`}
      >
        {snapshots.length === 0 ? (
          <div className={`text-center py-4 text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Chưa có dữ liệu các ngày trước trong tháng này
          </div>
        ) : (
          snapshots.map((item) => (
            <Tooltip
              key={item.date}
              placement="top"
              title={`Ngày ${item.date}: Book ${item.bookActual}/${item.bookTarget} (${item.bookPercent}%), Check-in ${item.checkinActual}/${item.checkinTarget} (${item.checkinPercent}%). Bấm để mở nhật ký chi tiết.`}
            >
              <div
                onClick={() => onSelectDate(item.date)}
                className={`flex items-center justify-between text-[10.5px] font-mono tabular-nums px-2 py-1 rounded-lg cursor-pointer transition-all border ${
                  isDark
                    ? 'bg-zinc-900/80 border-zinc-800 text-zinc-100 hover:border-amber-500/60 hover:bg-zinc-800/90'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/50 shadow-xs'
                }`}
              >
                {/* Cột 1: Ngày */}
                <div className="flex items-center gap-1.5 shrink-0 min-w-[75px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${getSnapshotRowDotClass(
                      item.bookTier,
                      item.checkinTier
                    )}`}
                  />
                  <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                    {item.dayDisplay}
                  </span>
                </div>

                {/* Cột 2: Book */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Book:
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getMiniTierBadgeClass(
                      item.bookTier,
                      isDark
                    )}`}
                  >
                    {item.bookActual}/{item.bookTarget} ({item.bookPercent}%)
                  </span>
                </div>

                {/* Cột 3: Check-in */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>In:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getMiniTierBadgeClass(
                      item.checkinTier,
                      isDark
                    )}`}
                  >
                    {item.checkinActual}/{item.checkinTarget} ({item.checkinPercent}%)
                  </span>
                </div>
              </div>
            </Tooltip>
          ))
        )}
      </div>
    </div>
  );
};
