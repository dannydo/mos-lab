'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { ChevronRight } from 'lucide-react';
import { CcLeaderboardEntry, calculateWheelBonusCap } from '@mos-lab/shared';
import { AppIcon, MobileRecordList } from '~/components/ui';
import CcAvatar from '../CcAvatar';
import { formatCompactVND, formatStoreCode } from '../../../../../lib/format-utils';
import { calculateProjectedCcXoay } from './cc-leaderboard-utils';

interface CcLeaderboardMobileListProps {
  leaderboard: CcLeaderboardEntry[];
  loading?: boolean;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
  onInspectConsultantMobile?: (entry: CcLeaderboardEntry) => void;
  isDayMode: boolean;
  isMonthMode: boolean;
  isPastPeriod: boolean;
  ratio: number;
}

export function CcLeaderboardMobileList({
  leaderboard,
  loading,
  selectedConsultant,
  onSelectConsultant,
  onInspectConsultantMobile,
  isDayMode,
  isMonthMode,
  isPastPeriod,
  ratio,
}: CcLeaderboardMobileListProps) {
  const { token } = theme.useToken();

  return (
    <MobileRecordList
      className="cc-xoay-mobile-record-list space-y-2"
      recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
      records={leaderboard}
      loading={loading}
      getKey={(record) => String(record.consultantId)}
      getRecordClassName={(record) =>
        selectedConsultant === record.displayName ? '!ring-1 !ring-amber-400/70 !bg-amber-500/10' : ''
      }
      renderRecord={(record) => {
        const isSelected = selectedConsultant === record.displayName;
        const cap = calculateWheelBonusCap(record.monthlyDailyBonus || 0, record.monthlyWheelBonus || 0);
        const level = record.level || Math.floor((record.totalPointsAccu || 0) / 100) + 1;
        const dailyBonus = Math.max(0, record.monthlyDailyBonus || 0);
        const capProgress = Math.min(100, Math.max(0, Math.round((cap.wheelCapPercent / 150) * 100)));
        const isHardcapped = cap.capStatus === 'HARDCAPPED';
        const isWarning = cap.capStatus === 'WARNING';

        return (
          <button
            type="button"
            className="w-full min-w-0 text-left cursor-pointer active:scale-[0.99] transition-transform"
            aria-pressed={isSelected}
            onClick={() =>
              onInspectConsultantMobile ? onInspectConsultantMobile(record) : onSelectConsultant?.(record.displayName)
            }
          >
            {/* Top Row: Medal + Avatar + Name/Lv/Pts on Left | Hero Thưởng Xoay + % trần + Chevron on Right */}
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">
                  {record.rank === 1 ? '🥇' : record.rank === 2 ? '🥈' : record.rank === 3 ? '🥉' : `#${record.rank}`}
                </span>
                <CcAvatar name={record.displayName} src={record.avatar} isSelected={isSelected} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {record.displayName}
                  </div>
                  <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatStoreCode(record.store)} · Lv.{level} ·{' '}
                    {(record.totalPointsAccu || 0).toLocaleString('vi-VN')} pts
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="text-right">
                  <div
                    className={`text-[17px] font-bold leading-none tabular-nums ${
                      isHardcapped ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {formatCompactVND(cap.effectiveWheelBonus)}
                  </div>
                  <div
                    className={`mt-0.5 text-[10.5px] font-semibold tabular-nums ${
                      isHardcapped
                        ? 'text-rose-600 dark:text-rose-400'
                        : isWarning
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {cap.wheelCapPercent}% trần 1.5×
                  </div>
                </div>
                <AppIcon icon={ChevronRight} size={16} className="text-slate-400/75 shrink-0" aria-hidden />
              </div>
            </div>

            {/* Slim 3px Hardcap Progress Bar */}
            <div className="mt-2.5">
              <Progress
                percent={capProgress}
                size="small"
                showInfo={false}
                strokeColor={isHardcapped ? token.colorError : isWarning ? token.colorWarning : token.colorSuccess}
                className="m-0 block leading-none [&_.ant-progress-inner]:!h-[3px] [&_.ant-progress-bg]:!h-[3px]"
              />
            </div>

            {/* Bottom 3-col hairline row */}
            <dl className="mt-2.5 pt-2 border-t border-slate-200/75 dark:border-white/[0.07] grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Khách / DV</dt>
                <dd className="truncate text-[13.5px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
                  {record.totalCheckins}/{record.totalServices || 0}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Daily Bonus</dt>
                <dd className="truncate text-[13.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCompactVND(dailyBonus)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  {isMonthMode && !isPastPeriod && !isDayMode ? 'Dự kiến Xoay' : 'Trần 1.5×'}
                </dt>
                <dd className="truncate text-[13.5px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                  {isMonthMode && !isPastPeriod && !isDayMode
                    ? `~${formatCompactVND(calculateProjectedCcXoay(record.totalCheckins, cap.rawWheelBonus, ratio, dailyBonus))}`
                    : formatCompactVND(cap.maxWheelBonusAllowed)}
                </dd>
              </div>
            </dl>
          </button>
        );
      }}
    />
  );
}
