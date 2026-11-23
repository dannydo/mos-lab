'use client';

import { Progress, theme } from 'antd';
import { CcLeaderboardEntry, calculateWheelBonusCap } from '@mos-lab/shared';
import { MobileRecordList } from '~/components/ui';
import CcAvatar from '../CcAvatar';
import { formatCompactVND } from '../../../../../lib/format-utils';
import { calculateProjectedCcXoay, fmtVnd } from './cc-leaderboard-utils';

interface CcLeaderboardMobileListProps {
  leaderboard: CcLeaderboardEntry[];
  loading?: boolean;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
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
  isDayMode,
  isMonthMode,
  isPastPeriod,
  ratio,
}: CcLeaderboardMobileListProps) {
  const { token } = theme.useToken();

  return (
    <div className="!p-1.5 cc-xoay-mobile-list-shell">
      <MobileRecordList
        className="cc-xoay-mobile-record-list !gap-1.5"
        recordClassName="!rounded-lg !p-2"
        records={leaderboard}
        loading={loading}
        getKey={(record) => String(record.consultantId)}
        getRecordClassName={(record) =>
          selectedConsultant === record.displayName ? 'bg-amber-500/10 ring-1 ring-amber-400/60' : ''
        }
        renderRecord={(record) => {
          const isSelected = selectedConsultant === record.displayName;
          const cap = calculateWheelBonusCap(record.monthlyDailyBonus || 0, record.monthlyWheelBonus || 0);
          const level = record.level || Math.floor((record.totalPointsAccu || 0) / 100) + 1;
          const dailyBonus = Math.max(0, record.monthlyDailyBonus || 0);
          const rawWheelBonus = Math.max(0, cap.rawWheelBonus);
          const chartMax = Math.max(cap.maxWheelBonusAllowed, dailyBonus, rawWheelBonus, 1);
          const dailyBarPercent = Math.min(100, Math.round((dailyBonus / chartMax) * 100));
          const wheelBarPercent = Math.min(100, Math.round((rawWheelBonus / chartMax) * 100));
          return (
            <button
              type="button"
              className="w-full min-w-0 text-left"
              aria-pressed={isSelected}
              onClick={() => onSelectConsultant?.(record.displayName)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                  {record.rank === 1 ? '🥇' : record.rank === 2 ? '🥈' : record.rank === 3 ? '🥉' : `#${record.rank}`}
                </span>
                <CcAvatar name={record.displayName} src={record.avatar} isSelected={isSelected} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {record.displayName}
                  </div>
                  <div className="text-xs text-slate-400">
                    Lv.{level} · {(record.totalPointsAccu || 0).toLocaleString('vi-VN')} pts
                  </div>
                </div>
                <span className="shrink-0 text-xs text-amber-400">{isSelected ? 'Đang lọc' : 'Xem'}</span>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-1.5 border-t border-slate-200 pt-2 dark:border-slate-800">
                <div className="min-w-0">
                  <dt className="text-[10px] text-slate-500">Khách / DV</dt>
                  <dd className="truncate text-sm font-bold tabular-nums text-sky-400">
                    {record.totalCheckins}/{record.totalServices || 0}
                  </dd>
                  {!isDayMode && !isPastPeriod && (
                    <div className="text-[10px] text-slate-400 font-medium tabular-nums">
                      🔮 ~{Math.round((record.totalCheckins || 0) / (ratio || 1))}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] text-slate-500">Daily</dt>
                  <dd className="truncate text-sm font-bold tabular-nums text-emerald-400">
                    {fmtVnd(dailyBonus)}&nbsp;đ
                  </dd>
                  {!isDayMode && !isPastPeriod && (
                    <div className="text-[10px] text-emerald-400/80 font-medium tabular-nums">
                      🔮 ~{formatCompactVND(Math.round(dailyBonus / (ratio || 1)))}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] text-slate-500">Xoay</dt>
                  <dd
                    className={`truncate text-sm font-bold tabular-nums ${cap.capStatus === 'HARDCAPPED' ? 'text-rose-400' : 'text-amber-400'}`}
                  >
                    {fmtVnd(cap.effectiveWheelBonus)}&nbsp;đ
                  </dd>
                  {isMonthMode && !isPastPeriod && (
                    <div className="text-[10px] text-emerald-400 font-medium tabular-nums">
                      🔮 ~
                      {formatCompactVND(
                        calculateProjectedCcXoay(record.totalCheckins, cap.rawWheelBonus, ratio, dailyBonus)
                      )}
                    </div>
                  )}
                </div>
              </dl>
              <div
                className="cc-xoay-mobile-performance mt-1.5 space-y-1"
                role="img"
                aria-label={`Biểu đồ thưởng: Daily ${fmtVnd(dailyBonus)} đồng, Xoay ${fmtVnd(cap.effectiveWheelBonus)} đồng trên trần ${fmtVnd(cap.maxWheelBonusAllowed)} đồng`}
              >
                <div className="flex items-center gap-2 text-[10px] tabular-nums">
                  <span className="w-9 shrink-0 text-slate-500">Daily</span>
                  <Progress
                    percent={dailyBarPercent}
                    size="small"
                    showInfo={false}
                    strokeColor={token.colorSuccess}
                    className="m-0 min-w-0 flex-1"
                  />
                  <span className="w-8 shrink-0 text-right text-emerald-400">{dailyBarPercent}%</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] tabular-nums">
                  <span className="w-9 shrink-0 text-slate-500">Xoay</span>
                  <Progress
                    percent={wheelBarPercent}
                    size="small"
                    showInfo={false}
                    strokeColor={cap.capStatus === 'HARDCAPPED' ? token.colorError : token.colorWarning}
                    className="m-0 min-w-0 flex-1"
                  />
                  <span
                    className={`w-8 shrink-0 text-right ${cap.capStatus === 'HARDCAPPED' ? 'text-rose-400' : 'text-amber-400'}`}
                  >
                    {wheelBarPercent}%
                  </span>
                </div>
              </div>
            </button>
          );
        }}
      />
    </div>
  );
}
