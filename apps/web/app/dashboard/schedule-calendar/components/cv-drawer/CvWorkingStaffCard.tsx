'use client';

import React from 'react';
import { Avatar, Tag, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { StaffWorkingItem, CvAvailabilityInfo } from './cvDrawerUtils';

interface CvWorkingStaffCardProps {
  staff: StaffWorkingItem & { availability: CvAvailabilityInfo };
  rankIndex: number;
}

export const CvWorkingStaffCard: React.FC<CvWorkingStaffCardProps> = React.memo(({ staff, rankIndex }) => {
  const isTopBooked = rankIndex === 0 && (staff.bookedCount || 0) > 0;

  const tooltipContent = (
    <div className="text-xs space-y-1.5 min-w-[180px]" role="tooltip">
      <div className="font-bold text-slate-100 flex items-center justify-between">
        <span>{staff.name}</span>
        <span className="text-[10px] text-emerald-400">#{rankIndex + 1}</span>
      </div>
      <div className="text-slate-300 flex items-center gap-1">
        <span>Trạng thái:</span>
        <span className="font-bold">{staff.availability.label}</span>
      </div>
      {staff.availability.customerName && (
        <div className="text-cyan-300 font-semibold">👤 Đang làm: {staff.availability.customerName}</div>
      )}
      <div className="border-t border-slate-700/60 pt-1 space-y-0.5 text-slate-300">
        <div>
          Lịch book ca: <b className="text-blue-300 tabular-nums">{staff.bookedCount || 0}</b> đơn
        </div>
        <div>
          Đã hoàn thành: <b className="text-emerald-300 tabular-nums">{staff.doneCount || 0}</b> đơn
        </div>
        {staff.availability.etaInfo && (
          <div className="border-t border-slate-700/40 pt-1 mt-1 space-y-0.5">
            {staff.availability.etaInfo.lashStyle && (
              <div className="text-[11px] text-cyan-300">
                🎀 Loại mi: <b>{staff.availability.etaInfo.lashStyle}</b>
              </div>
            )}
            <div className="text-[11px] text-amber-300 tabular-nums">
              ⏱ ETA: <b>{staff.availability.etaInfo.etaMinutes}p</b>
              <span className="text-slate-400 ml-1">(Layer {staff.availability.etaInfo.layer})</span>
            </div>
            {staff.availability.etaInfo.source && (
              <div className="text-[10px] text-slate-400 italic">{staff.availability.etaInfo.source}</div>
            )}
          </div>
        )}
        {staff.avgDurationMinutes?.normalAvg && staff.avgDurationMinutes?.retainAvg && (
          <div className="text-[11px] text-purple-300 tabular-nums">
            ⏱ TB Nối: {staff.avgDurationMinutes.normalAvg}p | Dặm: {staff.avgDurationMinutes.retainAvg}p
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="left" arrow>
      <div
        tabIndex={0}
        role="listitem"
        aria-label={`Chuyên viên #${rankIndex + 1} ${staff.name}, ${staff.availability.label}, ${staff.bookedCount || 0} Đặt lịch, ${staff.doneCount || 0} Hoàn thành`}
        className={`flex items-center justify-between text-xs p-2 rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${staff.availability.cardStyle}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Avatar (Large, spanning 2 lines) */}
          <Avatar
            src={staff.avatarUrl}
            icon={!staff.avatarUrl ? <UserOutlined /> : undefined}
            size={38}
            className="shrink-0 ring-1 ring-slate-300 dark:ring-slate-600 shadow-2xs bg-slate-700"
          />

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {/* Line 1: Rank + Name + Top Booked + Status Badge */}
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                className={`font-bold text-[10px] min-w-[20px] text-center px-1 py-0.2 rounded tabular-nums shrink-0 ${
                  isTopBooked
                    ? 'bg-amber-500 text-white font-extrabold shadow-2xs'
                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                }`}
              >
                #{rankIndex + 1}
              </span>

              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">{staff.name}</span>

              {isTopBooked && (
                <Tag color="gold" className="m-0 text-[9px] px-1 py-0 font-bold shrink-0">
                  🔥 Top Booked
                </Tag>
              )}

              <span className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${staff.availability.badgeStyle}`}>
                {staff.availability.label}
              </span>
            </div>

            {/* Line 2: Metrics */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold tabular-nums">
                📅 {staff.bookedCount || 0} Book
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold tabular-nums">
                ✅ {staff.doneCount || 0} Done
              </span>
              {staff.avgDurationMinutes?.normalAvg && staff.avgDurationMinutes?.retainAvg && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold tabular-nums">
                  ⚡ {staff.avgDurationMinutes.normalAvg}p nối • {staff.avgDurationMinutes.retainAvg}p dặm
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-0.5 ml-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
            {staff.branchName || 'Đề Thám'}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">{staff.shift || 'Ca Full'}</span>
        </div>
      </div>
    </Tooltip>
  );
});

CvWorkingStaffCard.displayName = 'CvWorkingStaffCard';
