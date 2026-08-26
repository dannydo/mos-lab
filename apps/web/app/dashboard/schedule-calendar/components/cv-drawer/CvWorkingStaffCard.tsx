'use client';

import React, { useMemo } from 'react';
import { Avatar, Tag, Tooltip } from 'antd';
import {
  UserOutlined,
  FireOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { StaffWorkingItem, CvAvailabilityInfo } from './cvDrawerUtils';
import { getCvBranchBadgeStyle } from './cvBranchBadge';

interface CvWorkingStaffCardProps {
  staff: StaffWorkingItem & { availability: CvAvailabilityInfo };
  rankIndex: number;
  onBookCv?: (staff: StaffWorkingItem) => void;
}

/**
 * Returns gradient color for progress bar based on percentage.
 * Green (0-60%) → Yellow (60-85%) → Orange (85-100%) → Red (>100%)
 */
function getProgressColor(percent: number): {
  barBg: string;
  barGlow: string;
  textColor: string;
} {
  if (percent >= 100) {
    return {
      barBg: 'bg-gradient-to-r from-rose-500 to-red-600',
      barGlow: 'shadow-rose-500/40',
      textColor: 'text-rose-400',
    };
  }
  if (percent >= 85) {
    return {
      barBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      barGlow: 'shadow-amber-500/30',
      textColor: 'text-amber-400',
    };
  }
  if (percent >= 60) {
    return {
      barBg: 'bg-gradient-to-r from-yellow-400 to-amber-500',
      barGlow: 'shadow-yellow-500/20',
      textColor: 'text-yellow-400',
    };
  }
  return {
    barBg: 'bg-gradient-to-r from-emerald-400 to-cyan-500',
    barGlow: 'shadow-emerald-500/20',
    textColor: 'text-emerald-400',
  };
}

const LAYER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'L1 Cao', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
  2: { label: 'L2 TB', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  3: { label: 'L3 Ref', color: 'text-slate-400 bg-slate-500/15 border-slate-500/30' },
};

export const CvWorkingStaffCard: React.FC<CvWorkingStaffCardProps> = React.memo(({ staff, rankIndex, onBookCv }) => {
  const isTopBooked = rankIndex === 0 && (staff.bookedCount || 0) > 0;
  const eta = staff.availability.etaInfo;
  const cleanLabel = (staff.availability.label || '').replace(/^[🟢🔴🟡🔵💬🧹📷⚡🏁📅]\s*/, '');
  const branchLabel = staff.branchCode || staff.branchName || 'DT';
  const branchBadgeStyle = getCvBranchBadgeStyle(staff.branchCode, staff.branchName);

  const progressColors = useMemo(() => {
    if (!eta) return null;
    return getProgressColor(eta.progressPercent);
  }, [eta]);

  const tooltipContent = (
    <div className="text-xs space-y-1.5 min-w-[210px]" role="tooltip">
      <div className="font-bold text-slate-100 flex items-center justify-between">
        <span>{staff.name}</span>
        <span className="text-[10px] font-mono text-slate-400">#{rankIndex + 1}</span>
      </div>
      <div className="text-emerald-400 font-semibold">{cleanLabel}</div>
      <div className="text-slate-300 grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-slate-700">
        <div>Booked: {staff.bookedCount || 0}</div>
        <div>Đã xong: {staff.doneCount || 0}</div>
      </div>
      {eta && (
        <div className="text-[11px] pt-1 border-t border-slate-700 space-y-1">
          <div className="text-amber-300 font-semibold flex items-center justify-between">
            <span>
              ETA: ~{eta.etaMinutes}p ({eta.lashStyle})
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
              Layer {eta.layer} ({eta.confidence})
            </span>
          </div>
          <div className="text-slate-300">
            Đã làm: <b>{eta.elapsedMinutes}p</b> ({eta.progressPercent}%)
            <span className="text-slate-400 mx-1">•</span>
            Còn: <b>{eta.remainingMinutes}p</b>
          </div>
          <div className="text-[10px] text-slate-400 italic">{eta.source}</div>
        </div>
      )}
      {(staff.avgDurationMinutes?.normalAvg ||
        staff.avgDurationMinutes?.retainAvg ||
        staff.avgDurationMinutes?.removalAvg) && (
        <div className="text-[11px] text-purple-300 tabular-nums">
          TB Nối:{' '}
          {[
            staff.avgDurationMinutes.normalAvg ? `${staff.avgDurationMinutes.normalAvg}p` : null,
            staff.avgDurationMinutes.retainAvg ? `Dặm: ${staff.avgDurationMinutes.retainAvg}p` : null,
          ]
            .filter(Boolean)
            .join(' | ')}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="left" arrow>
      <div
        tabIndex={0}
        role="listitem"
        aria-label={`Chuyên viên #${rankIndex + 1} ${staff.name}, ${cleanLabel}, ${staff.bookedCount || 0} Đặt lịch, ${staff.doneCount || 0} Hoàn thành`}
        className={`flex flex-col text-xs rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${staff.availability.cardStyle}`}
      >
        {/* Row 1: Avatar + Info + Branch */}
        <div className="flex items-center justify-between p-2 pb-1">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Avatar */}
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
                  <Tag color="gold" className="m-0 text-[9px] px-1.5 py-0 font-bold shrink-0 inline-flex items-center">
                    <FireOutlined className="mr-0.5 text-amber-500" /> Top Booked
                  </Tag>
                )}

                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded border shrink-0 inline-flex items-center gap-1 ${staff.availability.badgeStyle}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0" />
                  {cleanLabel}
                </span>
              </div>

              {/* Line 2: Metrics */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold tabular-nums inline-flex items-center">
                  <CalendarOutlined className="mr-1 text-blue-500" />
                  {staff.bookedCount || 0} Book
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold tabular-nums inline-flex items-center">
                  <CheckCircleOutlined className="mr-1 text-emerald-500" />
                  {staff.doneCount || 0} Done
                </span>
                {(staff.avgDurationMinutes?.normalAvg ||
                  staff.avgDurationMinutes?.retainAvg ||
                  staff.avgDurationMinutes?.removalAvg) && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold tabular-nums inline-flex items-center">
                    <ThunderboltOutlined className="mr-1 text-purple-500" />
                    {[
                      staff.avgDurationMinutes.normalAvg ? `${staff.avgDurationMinutes.normalAvg}p nối` : null,
                      staff.avgDurationMinutes.retainAvg ? `${staff.avgDurationMinutes.retainAvg}p dặm` : null,
                      !staff.avgDurationMinutes.normalAvg &&
                      !staff.avgDurationMinutes.retainAvg &&
                      staff.avgDurationMinutes.removalAvg
                        ? `${staff.avgDurationMinutes.removalAvg}p tháo`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-1 ml-2">
            <div className="flex items-center gap-1">
              <span
                aria-label={`Chi nhánh ${branchLabel}`}
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${branchBadgeStyle}`}
              >
                {branchLabel}
              </span>
              {onBookCv && (
                <Tooltip title="Đặt lịch cho CV này">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookCv(staff);
                    }}
                    className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/40 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <CalendarOutlined className="text-[10px]" />
                    <span className="text-[11px] font-extrabold leading-none">+</span>
                  </button>
                </Tooltip>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">{staff.shift || 'Ca Full'}</span>
          </div>
        </div>

        {/* Row 2: ETA Progress Bar (only when BUSY with etaInfo) */}
        {eta && progressColors && (
          <div className="px-2 pb-2 pt-0.5">
            <div className="rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 p-1.5">
              {/* Label row: lash style + ETA + layer badge */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 truncate">
                    🎀 {eta.lashStyle}
                    {eta.lashCount != null && (
                      <span className="text-slate-500 dark:text-slate-400 font-normal ml-0.5">{eta.lashCount} sợi</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[9px] px-1 py-0 rounded border font-bold ${LAYER_LABELS[eta.layer]?.color || ''}`}
                  >
                    {LAYER_LABELS[eta.layer]?.label || `L${eta.layer}`}
                  </span>
                  <span className={`text-[10px] font-bold tabular-nums ${progressColors.textColor}`}>
                    {eta.remainingMinutes > 0
                      ? `còn ${eta.remainingMinutes}p`
                      : `+${Math.abs(eta.remainingMinutes)}p quá giờ`}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${progressColors.barBg} ${progressColors.barGlow} shadow-sm ${
                    eta.progressPercent >= 100 ? 'animate-pulse' : ''
                  }`}
                  style={{
                    width: `${Math.min(100, eta.progressPercent)}%`,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
                {/* Percentage text inside bar */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-[8px] font-extrabold tabular-nums drop-shadow-sm"
                    style={{
                      color: eta.progressPercent > 50 ? '#fff' : undefined,
                    }}
                  >
                    {eta.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Bottom label: elapsed / total */}
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {eta.elapsedMinutes}p / {eta.etaMinutes}p
                </span>
                <span className="text-[9px] text-slate-400 italic truncate max-w-[150px]">{eta.source}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Tooltip>
  );
});

CvWorkingStaffCard.displayName = 'CvWorkingStaffCard';
