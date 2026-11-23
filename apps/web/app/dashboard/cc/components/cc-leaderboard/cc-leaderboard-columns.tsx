'use client';

import { Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2 } from 'lucide-react';
import { CcLeaderboardEntry, calculateWheelBonusCap } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import CcAvatar from '../CcAvatar';
import { formatCompactVND } from '../../../../../lib/format-utils';
import { calculateProjectedCcXoay, fmtVnd } from './cc-leaderboard-utils';

export function buildCcLeaderboardColumns(params: {
  selectedConsultant?: string;
  isMonthMode: boolean;
  isDayMode: boolean;
  isPastPeriod: boolean;
  ratio: number;
  maxBarValue: number;
}): ColumnsType<CcLeaderboardEntry> {
  const { selectedConsultant, isMonthMode, isDayMode, isPastPeriod, ratio, maxBarValue } = params;

  return [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 50,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span className="text-base">🥇</span>;
        if (rank === 2) return <span className="text-base">🥈</span>;
        if (rank === 3) return <span className="text-base">🥉</span>;
        return <span className="tabular-nums font-medium text-slate-500 text-[11px]">#{rank}</span>;
      },
    },
    {
      title: 'CC',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 160,
      render: (name: string, record: CcLeaderboardEntry) => {
        const isSelected = selectedConsultant === name;
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={6}>
            <CcAvatar name={name} src={record.avatar} isSelected={isSelected} size={28} />
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span
                className={`font-semibold text-xs transition-colors ${
                  isSelected
                    ? 'text-amber-400 underline underline-offset-2'
                    : 'text-slate-900 dark:text-slate-100 hover:text-amber-400'
                }`}
              >
                {name}
              </span>
              {isSelected && <AppIcon icon={CheckCircle2} size={11} className="text-amber-400" />}
            </div>
          </Space>
        );
      },
    },
    {
      title: (
        <Tooltip title="Level CC = ⌊Điểm / 100⌋ + 1. Reset mỗi đầu tháng.">
          <span className="cursor-help">Lv / Điểm</span>
        </Tooltip>
      ),
      key: 'levelAndPoints',
      align: 'center' as const,
      width: 100,
      render: (_: unknown, record: CcLeaderboardEntry) => {
        const lvl = record.level || Math.floor((record.totalPointsAccu || 0) / 100) + 1;
        const projectedPoints = Math.round((record.totalPointsAccu || 0) / (ratio || 1));
        const projectedLevel = Math.floor(projectedPoints / 100) + 1;
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="tabular-nums font-semibold text-[11px] text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-px rounded-full leading-tight">
              Lv.{lvl}
            </span>
            <span className="tabular-nums text-[10px] text-emerald-600 dark:text-emerald-400/80">
              {(record.totalPointsAccu || 0).toLocaleString('vi-VN')} pts
            </span>
            {!isDayMode && !isPastPeriod && (
              <span className="tabular-nums text-[9px] text-emerald-700 dark:text-emerald-400 font-medium">
                🔮 ~{projectedPoints.toLocaleString('vi-VN')}p (Lv.{projectedLevel})
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Lượt khách phục vụ / Lượt dịch vụ thực hiện">
          <span className="cursor-help">Khách / DV</span>
        </Tooltip>
      ),
      key: 'checkinAndServices',
      align: 'center' as const,
      width: 80,
      render: (_: unknown, record: CcLeaderboardEntry) => {
        const projectedCheckins = Math.round((record.totalCheckins || 0) / (ratio || 1));
        const projectedServices = Math.round((record.totalServices || 0) / (ratio || 1));
        return (
          <div className="flex flex-col items-center">
            <span className="tabular-nums text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{record.totalCheckins}</span>
              <span className="text-slate-400 mx-0.5">/</span>
              <span className="text-slate-500 dark:text-slate-400">{record.totalServices || 0}</span>
            </span>
            {!isDayMode && !isPastPeriod && (
              <span className="tabular-nums text-[9px] text-slate-400">
                🔮 ~{projectedCheckins}/{projectedServices}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Tổng thưởng CC Xoay (Level × 65đ). Khi vượt 1.5× CC Daily Bonus, chỉ nhận mức trần.">
          <span className="cursor-help">CC Xoay</span>
        </Tooltip>
      ),
      dataIndex: 'totalConsultantBonus',
      key: 'totalConsultantBonus',
      align: 'right' as const,
      width: 130,
      render: (_val: number, record: CcLeaderboardEntry) => {
        const daily = record.monthlyDailyBonus || 0;
        const wheel = record.monthlyWheelBonus || 0;
        const cap = calculateWheelBonusCap(daily, wheel);
        const isHardcapped = cap.capStatus === 'HARDCAPPED';
        const effective = cap.effectiveWheelBonus;
        const projectedBonus = isMonthMode
          ? calculateProjectedCcXoay(record.totalCheckins, cap.rawWheelBonus, ratio, daily)
          : 0;

        if (isHardcapped && cap.rawWheelBonus > cap.maxWheelBonusAllowed) {
          // Over cap: show raw amount crossed out + actual received amount
          return (
            <Tooltip
              title={
                <div className="text-xs">
                  <div className="text-rose-300 font-bold">⛔ Vượt trần 1.5×</div>
                  <div>Thưởng gốc: {fmtVnd(cap.rawWheelBonus)}&nbsp;đ</div>
                  <div className="text-emerald-300 font-bold">Chỉ nhận: {fmtVnd(effective)}&nbsp;đ</div>
                  {isMonthMode && !isPastPeriod && <div>Dự kiến về đích: {fmtVnd(projectedBonus)}&nbsp;đ</div>}
                </div>
              }
            >
              <div className="flex flex-col items-end cursor-help">
                <span className="tabular-nums text-[10px] text-rose-400 line-through opacity-60">
                  {fmtVnd(cap.rawWheelBonus)}&nbsp;đ
                </span>
                <span className="tabular-nums font-bold text-xs text-rose-500">{fmtVnd(effective)}&nbsp;đ</span>
                {isMonthMode && !isPastPeriod && (
                  <span className="tabular-nums font-semibold text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    🔮 ~{formatCompactVND(projectedBonus)}
                  </span>
                )}
              </div>
            </Tooltip>
          );
        }

        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-xs text-amber-700 dark:text-amber-400">
              {fmtVnd(cap.rawWheelBonus || 0)}&nbsp;đ
            </span>
            {isMonthMode && !isPastPeriod && (
              <span className="tabular-nums font-semibold text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                🔮 ~{formatCompactVND(projectedBonus)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip
          title={
            <div className="text-xs">
              <div className="font-bold mb-1">Tỷ lệ CC Xoay / CC Daily Bonus</div>
              <div>100% = CC Xoay bằng CC Daily Bonus</div>
              <div className="text-rose-300">150% = Trần tối đa (1.5×)</div>
            </div>
          }
        >
          <span className="cursor-help">Hardcap</span>
        </Tooltip>
      ),
      key: 'hardcapInline',
      width: 240,
      render: (_: unknown, record: CcLeaderboardEntry) => {
        const daily = record.monthlyDailyBonus || 0;
        const wheel = record.monthlyWheelBonus || 0;
        const cap = calculateWheelBonusCap(daily, wheel);

        const dailyBarW = maxBarValue > 0 ? (cap.monthlyDailyBonus / maxBarValue) * 100 : 0;
        const wheelBarW = maxBarValue > 0 ? (cap.rawWheelBonus / maxBarValue) * 100 : 0;
        const hardcapLinePos = maxBarValue > 0 ? (cap.maxWheelBonusAllowed / maxBarValue) * 100 : 0;

        const isHardcapped = cap.capStatus === 'HARDCAPPED';
        const isWarning = cap.capStatus === 'WARNING';
        const pct = cap.wheelCapPercent;
        const remaining = Math.max(0, cap.maxWheelBonusAllowed - cap.rawWheelBonus);

        return (
          <Tooltip
            placement="left"
            title={
              <div className="text-xs space-y-0.5">
                <div
                  className={`font-bold ${isHardcapped ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}
                >
                  {isHardcapped ? '⛔ Đạt trần 1.5×' : isWarning ? '⚠️ Sắp chạm trần' : '✅ An toàn'}
                </div>
                <div>
                  Daily Bonus: <strong>{fmtVnd(daily)}&nbsp;đ</strong>
                </div>
                <div>
                  Xoay Bonus: <strong>{fmtVnd(wheel)}&nbsp;đ</strong>
                </div>
                <div>
                  Trần 1.5×: <strong>{fmtVnd(cap.maxWheelBonusAllowed)}&nbsp;đ</strong>
                </div>
                {!isHardcapped && remaining > 0 && (
                  <div className="text-emerald-300">
                    Còn <strong>{fmtVnd(remaining)}&nbsp;đ</strong> trước trần
                  </div>
                )}
              </div>
            }
          >
            <div className="flex items-center gap-1 cursor-help h-[28px]">
              <div className="flex flex-col justify-between h-[26px] leading-none text-[9px] select-none">
                <Tooltip title="Daily Combo Sales Bonus" placement="top">
                  <span className="cursor-help">🅒</span>
                </Tooltip>
                <Tooltip title="Vòng Xoay Bonus" placement="bottom">
                  <span className="cursor-help">🅧</span>
                </Tooltip>
              </div>
              <div className="relative flex-1 h-[28px]">
                <svg
                  viewBox="0 0 100 28"
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                  aria-hidden="true"
                >
                  <rect
                    x={0}
                    y={1}
                    width={daily > 0 ? Math.max(dailyBarW, 1.5) : 0}
                    height={11}
                    rx={2}
                    className="fill-emerald-500/85"
                  />
                  <rect
                    x={0}
                    y={15}
                    width={wheel > 0 ? Math.max(wheelBarW, 1.5) : 0}
                    height={11}
                    rx={2}
                    className={isHardcapped ? 'fill-rose-500/85' : 'fill-amber-500/85'}
                  />
                  {cap.maxWheelBonusAllowed > 0 && (
                    <line
                      x1={Math.min(hardcapLinePos, 98)}
                      y1={0}
                      x2={Math.min(hardcapLinePos, 98)}
                      y2={28}
                      strokeWidth={1.5}
                      strokeDasharray="3 2"
                      vectorEffect="non-scaling-stroke"
                      className="stroke-rose-500/60"
                    />
                  )}
                </svg>
              </div>
              <span
                className={`tabular-nums font-bold text-[9px] whitespace-nowrap ${
                  isHardcapped ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500/80'
                }`}
              >
                {pct}%
              </span>
            </div>
          </Tooltip>
        );
      },
    },
  ];
}
