'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { type CcPaystubRecord, calculateWheelBonusCap } from '@mos-lab/shared';
import { AppIcon, MobileRecordList } from '~/components/ui';
import { formatCompactVND, formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { ProjectedCcIncomeRecord, formatCcRankBadge } from './cc-thu-nhap-utils';

interface CcIncomeMobileListProps {
  records: CcPaystubRecord[];
  loading: boolean;
  isDayMode: boolean;
  isPastPeriod: boolean;
  getProjectedRecord: (record: CcPaystubRecord) => ProjectedCcIncomeRecord;
  onSelectCard?: (record: CcPaystubRecord) => void;
  onOpenDetailModal: (record: CcPaystubRecord) => void;
}

const formatCount = (value: number) =>
  Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 1,
  });

export function CcIncomeMobileList({
  records,
  loading,
  isDayMode,
  isPastPeriod,
  getProjectedRecord,
  onSelectCard,
  onOpenDetailModal,
}: CcIncomeMobileListProps) {
  const { token } = theme.useToken();
  const showForecast = !isDayMode && !isPastPeriod;

  return (
    <MobileRecordList
      records={records}
      loading={loading}
      getKey={(record) => String(record.consultantId)}
      emptyDescription="Không tìm thấy dữ liệu thu nhập CC"
      className="cc-income-mobile-record-list space-y-2"
      recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
      renderRecord={(record, index) => {
        const proj = getProjectedRecord(record);
        const greenVisits = record.greenVisits || 0;
        const comboCount = record.comboCount || 0;
        const comboRate =
          record.greenComboConversionRate ??
          (greenVisits > 0 ? Math.min(100, Math.round((comboCount / greenVisits) * 100)) : 0);

        const cap = calculateWheelBonusCap(
          record.monthlyDailyBonus ?? record.comboProductBonus ?? 0,
          record.rawCcXoayBonus ?? record.ccXoayBonus ?? 0
        );
        const wheelCapPercent = record.wheelCapPercent ?? cap.wheelCapPercent;
        const capStatus = record.capStatus ?? cap.capStatus;
        const holdBonus = record.ccXoayHoldBonus ?? Math.max(0, cap.rawWheelBonus - cap.effectiveWheelBonus);
        const capProgress = Math.min(100, Math.max(0, Math.round((wheelCapPercent / 150) * 100)));

        const coreStreams = [
          { label: 'Lương giờ', value: record.hourlyWage || 0, color: 'text-sky-600 dark:text-sky-400' },
          { label: 'Tip', value: record.ccTipBonus || 0, color: 'text-amber-600 dark:text-amber-300' },
          { label: 'Xoay', value: record.ccXoayBonus || 0, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Combo/SP', value: record.comboProductBonus || 0, color: 'text-emerald-600 dark:text-emerald-400' },
        ];

        const extraStreams = [
          { label: 'Kim cương', value: record.diamondBonus || 0 },
          { label: 'Minigame', value: record.minigameBonus || 0 },
          { label: 'Lễ x3', value: record.holidayPremiumPay || 0 },
        ].filter((item) => item.value > 0);

        return (
          <button
            type="button"
            className="w-full min-w-0 text-left cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => (onSelectCard ? onSelectCard(record) : onOpenDetailModal(record))}
          >
            {/* Top Row: Rank + Avatar + Name/Store on Left | Hero ∑ Thu nhập + Forecast + Chevron on Right */}
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">
                  {formatCcRankBadge(index)}
                </span>
                <CcAvatar name={record.displayName} src={record.avatar} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {record.displayName}
                  </div>
                  <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                    {formatStoreCode(record.store)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="text-right">
                  <div className="text-[17px] font-bold leading-none tabular-nums text-amber-600 dark:text-amber-400">
                    {formatCompactVND(record.totalIncome || 0)}
                  </div>
                  {showForecast && (proj.projectedTotalIncome || 0) > 0 && (
                    <div className="mt-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ~{formatCompactVND(proj.projectedTotalIncome)}
                    </div>
                  )}
                </div>
                <AppIcon icon={ChevronRight} size={16} className="text-slate-400/75 shrink-0" aria-hidden />
              </div>
            </div>

            {/* Apple Combo -> Wheel Bonus (1.5x Cap) Impact Strip */}
            <div className="mt-2.5 rounded-xl px-2.5 py-2 bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06]">
              <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 min-w-0 truncate">
                  <AppIcon icon={RefreshCw} size={11} className="text-emerald-500 shrink-0" aria-hidden />
                  <span>Combo</span>
                  <strong
                    data-cc-income-combo-rate={comboRate}
                    className={
                      comboRate >= 15
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : 'font-bold text-amber-600 dark:text-amber-400'
                    }
                  >
                    {comboRate}%
                  </strong>
                  {greenVisits > 0 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      ({formatCount(comboCount)}/{formatCount(greenVisits)} VX)
                    </span>
                  )}
                </span>

                <span
                  data-cc-income-wheel-cap={capStatus}
                  className={`shrink-0 font-semibold ${
                    capStatus === 'HARDCAPPED'
                      ? 'text-rose-600 dark:text-rose-400'
                      : capStatus === 'WARNING'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {capStatus === 'HARDCAPPED'
                    ? holdBonus > 0
                      ? `→ Xoay: Trần 1.5× (-${formatCompactVND(holdBonus)})`
                      : '→ Xoay: Trần 1.5×'
                    : capStatus === 'WARNING'
                      ? `→ Xoay: ⚠️ ${wheelCapPercent}%/150%`
                      : `→ Xoay: ${wheelCapPercent}%/150%`}
                </span>
              </div>

              <div className="mt-1.5">
                <Progress
                  percent={capProgress}
                  size="small"
                  showInfo={false}
                  strokeColor={
                    capStatus === 'HARDCAPPED'
                      ? token.colorError
                      : capStatus === 'WARNING'
                        ? token.colorWarning
                        : token.colorSuccess
                  }
                  className="m-0 block leading-none [&_.ant-progress-inner]:!h-[3px] [&_.ant-progress-bg]:!h-[3px]"
                />
              </div>
            </div>

            {/* Bottom Row: 4 compact core streams */}
            <dl className="mt-2.5 pt-2 border-t border-slate-200/75 dark:border-white/[0.07] grid grid-cols-4 gap-1.5">
              {coreStreams.map((stream) => (
                <div key={stream.label} className="min-w-0">
                  <dt className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{stream.label}</dt>
                  <dd className={`truncate text-[12.5px] font-bold tabular-nums ${stream.color}`}>
                    {stream.value > 0 ? `+${formatCompactVND(stream.value)}` : '0 đ'}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Optional extra positive streams (hides all 0 đ clutter) */}
            {extraStreams.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {extraStreams.map((extra) => (
                  <span
                    key={extra.label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 tabular-nums"
                  >
                    {extra.label} +{formatCompactVND(extra.value)}
                  </span>
                ))}
              </div>
            )}
          </button>
        );
      }}
    />
  );
}
