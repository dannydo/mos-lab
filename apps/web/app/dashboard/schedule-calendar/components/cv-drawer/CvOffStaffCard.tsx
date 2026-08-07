'use client';

import React from 'react';
import { Avatar, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { StaffOffItem } from './cvDrawerUtils';

interface CvOffStaffCardProps {
  staff: StaffOffItem;
  rankIndex: number;
}

export const CvOffStaffCard: React.FC<CvOffStaffCardProps> = React.memo(({ staff, rankIndex }) => {
  const reasonStr = staff.reason || '';
  const isWeeklyOff =
    staff.type === 'weekly_off' || reasonStr.includes('Nghỉ hàng tuần') || reasonStr.includes('OFF Tuần');
  const isUrgentOff = staff.type === 'urgent_off' || /gấp|đột xuất|bệnh|ốm|khẩn|cấp cứu/i.test(reasonStr);

  const cardStyle = isWeeklyOff
    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/80 shadow-2xs hover:border-amber-400'
    : isUrgentOff
      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/90 dark:border-rose-800/80 shadow-2xs hover:border-rose-400'
      : 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-200/90 dark:border-orange-800/80 shadow-2xs hover:border-orange-400';

  const numColor = isWeeklyOff
    ? 'text-amber-600 dark:text-amber-400'
    : isUrgentOff
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-orange-600 dark:text-orange-400';

  const reasonColor = isWeeklyOff
    ? 'text-amber-800 dark:text-amber-300'
    : isUrgentOff
      ? 'text-rose-800 dark:text-rose-300'
      : 'text-orange-800 dark:text-orange-300';

  const badgeStyleOff = isWeeklyOff
    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    : isUrgentOff
      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
      : 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30';

  const typeLabel = isWeeklyOff ? '🟡 OFF Tuần' : isUrgentOff ? '🔴 OFF Gấp' : '🟠 OFF Phép';

  const tooltipContent = (
    <div className="text-xs space-y-1 min-w-[160px]" role="tooltip">
      <div className="font-bold text-slate-100">{staff.name}</div>
      <div className="text-amber-300 font-semibold">{typeLabel}</div>
      <div className="text-slate-300">Lý do: {staff.reason || 'Chưa ghi lý do'}</div>
      <div className="text-slate-400 text-[11px]">Chi nhánh: {staff.branchName || 'Đề Thám'}</div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="left" arrow>
      <div
        tabIndex={0}
        role="listitem"
        aria-label={`Chuyên viên nghỉ #${rankIndex + 1} ${staff.name}, ${typeLabel}, Lý do: ${staff.reason}`}
        className={`flex items-center justify-between text-xs p-2 rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${cardStyle}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Avatar (Large, spanning 2 lines) */}
          <Avatar
            src={staff.avatarUrl}
            icon={!staff.avatarUrl ? <UserOutlined /> : undefined}
            size={38}
            className="shrink-0 ring-1 ring-slate-300 dark:ring-slate-600 shadow-2xs bg-slate-700 opacity-90"
          />

          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            {/* Line 1: Rank + Name + OFF Badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-bold text-[10px] tabular-nums shrink-0 ${numColor}`}>#{rankIndex + 1}</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">{staff.name}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${badgeStyleOff}`}>
                {typeLabel}
              </span>
            </div>

            {/* Line 2: Reason Text */}
            <div className={`text-[10px] font-medium whitespace-normal break-words line-clamp-1 ${reasonColor}`}>
              {staff.reason}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 ml-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeStyleOff}`}>
            {staff.branchName || 'Đề Thám'}
          </span>
        </div>
      </div>
    </Tooltip>
  );
});

CvOffStaffCard.displayName = 'CvOffStaffCard';
