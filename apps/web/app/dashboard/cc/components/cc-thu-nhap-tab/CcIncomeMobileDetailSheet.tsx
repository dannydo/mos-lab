'use client';

import React from 'react';
import { Button, Progress, theme } from 'antd';
import { ChevronRight } from 'lucide-react';
import { type CcPaystubRecord, calculateWheelBonusCap } from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, StatusTag } from '~/components/ui';
import { formatCompactVND, formatStoreCode, formatVND } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import type { ProjectedCcIncomeRecord } from './cc-thu-nhap-utils';

interface CcIncomeMobileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  record: CcPaystubRecord | null;
  projected: ProjectedCcIncomeRecord | null;
  showForecast: boolean;
  onOpenDetailModal: (record: CcPaystubRecord) => void;
  onOpenWorkLogModal: (record: CcPaystubRecord) => void;
  onOpenCcXoayModal: (record: CcPaystubRecord) => void;
  onOpenComboModal: (record: CcPaystubRecord) => void;
  onOpenTipModal: (record: CcPaystubRecord) => void;
  onOpenDiamondModal: (record: CcPaystubRecord) => void;
}

export const CcIncomeMobileDetailSheet: React.FC<CcIncomeMobileDetailSheetProps> = ({
  open,
  onClose,
  record,
  projected,
  showForecast,
  onOpenDetailModal,
  onOpenWorkLogModal,
  onOpenCcXoayModal,
  onOpenComboModal,
  onOpenTipModal,
  onOpenDiamondModal,
}) => {
  const { token } = theme.useToken();

  const greenVisits = record?.greenVisits || 0;
  const comboCount = record?.comboCount || 0;
  const comboRate =
    record?.greenComboConversionRate ??
    (greenVisits > 0 ? Math.min(100, Math.round((comboCount / greenVisits) * 100)) : 0);

  const cap = record
    ? calculateWheelBonusCap(
        record.monthlyDailyBonus ?? record.comboProductBonus ?? 0,
        record.rawCcXoayBonus ?? record.ccXoayBonus ?? 0
      )
    : null;
  const wheelCapPercent = record?.wheelCapPercent ?? cap?.wheelCapPercent ?? 0;
  const capStatus = record?.capStatus ?? cap?.capStatus ?? 'NORMAL';
  const maxWheelAllowed = record?.maxWheelBonusAllowed ?? cap?.maxWheelBonusAllowed ?? 0;
  const rawWheelBonus = record?.rawCcXoayBonus ?? cap?.rawWheelBonus ?? 0;
  const holdBonus = record?.ccXoayHoldBonus ?? Math.max(0, rawWheelBonus - (record?.ccXoayBonus || 0));
  const capProgress = Math.min(100, Math.max(0, Math.round((wheelCapPercent / 150) * 100)));
  const remainingBeforeCap = Math.max(0, maxWheelAllowed - rawWheelBonus);

  const rows = record
    ? [
        {
          key: 'wage',
          label: 'Lương giờ',
          value: record.hourlyWage || 0,
          projected: projected?.projectedHourlyWage || 0,
          colorClass: 'text-sky-600 dark:text-sky-400',
          onTap: () => onOpenWorkLogModal(record),
        },
        {
          key: 'combo',
          label: 'Thưởng Combo & SP',
          value: record.comboProductBonus || 0,
          projected: projected?.projectedComboProductBonus || 0,
          colorClass: 'text-emerald-600 dark:text-emerald-400',
          onTap: () => onOpenComboModal(record),
        },
        {
          key: 'tip',
          label: 'Thưởng Tip',
          value: record.ccTipBonus || 0,
          projected: projected?.projectedCcTipBonus || 0,
          colorClass: 'text-amber-600 dark:text-amber-300',
          onTap: () => onOpenTipModal(record),
        },
        {
          key: 'xoay',
          label: 'Thưởng Xoay',
          value: record.ccXoayBonus || 0,
          projected: projected?.projectedCcXoayBonus || 0,
          colorClass: 'text-purple-600 dark:text-purple-400',
          onTap: () => onOpenCcXoayModal(record),
        },
        {
          key: 'diamond',
          label: 'Thưởng Kim Cương',
          value: record.diamondBonus || 0,
          projected: projected?.projectedDiamondBonus || 0,
          colorClass: 'text-cyan-600 dark:text-cyan-300',
          onTap: () => onOpenDiamondModal(record),
        },
        {
          key: 'minigame',
          label: 'Minigame',
          value: record.minigameBonus || 0,
          projected: projected?.projectedMinigameBonus || 0,
          colorClass: 'text-yellow-600 dark:text-yellow-300',
        },
        {
          key: 'holiday',
          label: 'Phụ cấp lễ x3',
          value: record.holidayPremiumPay || 0,
          projected: projected?.projectedHolidayPay || 0,
          colorClass: 'text-rose-600 dark:text-rose-300',
        },
      ]
    : [];

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="82dvh"
      zIndex={990}
      title={
        record ? (
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <CcAvatar name={record.displayName} src={record.avatar} size={32} />
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                {record.displayName}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {formatStoreCode(record.store)} · Phiếu thu nhập CC
              </div>
            </div>
          </div>
        ) : (
          'Phiếu thu nhập CC'
        )
      }
    >
      {record && (
        <div data-testid="cc-income-mobile-detail-sheet" className="space-y-3 pb-4">
          <div className="rounded-2xl p-3.5 bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                ∑ Tổng thu nhập
              </div>
              <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-amber-600 dark:text-amber-300">
                {formatVND(record.totalIncome || 0)}
              </div>
              {showForecast && (projected?.projectedTotalIncome || 0) > 0 && (
                <div className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Dự kiến kỳ: ~{formatCompactVND(projected?.projectedTotalIncome || 0)}
                </div>
              )}
            </div>
            <Button
              type="primary"
              size="small"
              onClick={() => onOpenDetailModal(record)}
              className="shrink-0 font-semibold"
            >
              Phiếu đầy đủ
            </Button>
          </div>

          {/* Apple Insight Card: % Bán Combo -> Trần Thưởng Vòng Xoay 1.5x */}
          <div
            data-testid="cc-income-combo-wheel-impact"
            className="rounded-2xl p-3 bg-slate-100/85 border border-slate-200/80 dark:bg-white/[0.045] dark:border-white/[0.08] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">
                % Bán Combo → Trần Xoay 1.5×
              </div>
              <StatusTag
                status={capStatus === 'HARDCAPPED' ? 'error' : capStatus === 'WARNING' ? 'gold' : 'success'}
                label={
                  capStatus === 'HARDCAPPED'
                    ? '⛔ Đạt trần 1.5×'
                    : capStatus === 'WARNING'
                      ? `⚠️ Sắp chạm trần (${wheelCapPercent}%)`
                      : `An toàn (${wheelCapPercent}%)`
                }
                className="text-[10px] font-bold py-0 px-1.5 m-0"
              />
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08] pt-1">
              <div className="pr-2 min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">% Bán Combo</div>
                <div
                  className={`text-[15px] font-bold tabular-nums ${
                    comboRate >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {comboRate}%
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                  {comboCount}/{greenVisits} VX
                </div>
              </div>

              <div className="px-2 min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Trần Xoay (1.5×)</div>
                <div className="text-[15px] font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate">
                  {formatCompactVND(maxWheelAllowed)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Từ {formatCompactVND(record.comboProductBonus)} Combo
                </div>
              </div>

              <div className="pl-2 min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Xoay thực nhận</div>
                <div className="text-[15px] font-bold tabular-nums text-purple-600 dark:text-purple-400 truncate">
                  {formatCompactVND(record.ccXoayBonus || 0)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                  Gốc {formatCompactVND(rawWheelBonus)}
                </div>
              </div>
            </div>

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
              className="m-0 block leading-none [&_.ant-progress-inner]:!h-[4px] [&_.ant-progress-bg]:!h-[4px]"
            />

            {holdBonus > 0 ? (
              <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 leading-snug">
                Đang tạm giữ {formatVND(holdBonus)} do vượt trần 1.5× Daily Bonus — tăng % bán Combo để mở khóa thêm
                thưởng Xoay.
              </div>
            ) : capStatus === 'WARNING' ? (
              <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 leading-snug">
                Còn {formatVND(remainingBeforeCap)} trước trần 1.5× — bán thêm Combo để nới trần thưởng Xoay.
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Thưởng Xoay tối đa = 1.5× Daily Bonus ({formatCompactVND(maxWheelAllowed)}).
              </div>
            )}
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
            Chi tiết từng khoản thu nhập
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] divide-y divide-slate-200/75 dark:divide-white/[0.07]">
            {rows.map((row) => {
              const interactive = Boolean(row.onTap);
              const content = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{row.label}</div>
                    {showForecast && row.projected > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        Dự kiến: ~{formatCompactVND(row.projected)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[14px] font-bold tabular-nums ${row.colorClass}`}>
                      +{formatVND(row.value)}
                    </span>
                    {interactive && <AppIcon icon={ChevronRight} size={15} className="text-slate-400" aria-hidden />}
                  </div>
                </>
              );

              if (!interactive) {
                return (
                  <div key={row.key} className="px-3.5 py-3 flex items-center justify-between gap-2">
                    {content}
                  </div>
                );
              }

              return (
                <button
                  key={row.key}
                  type="button"
                  onClick={row.onTap}
                  className="w-full px-3.5 py-3 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] active:bg-slate-100 dark:active:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </AdaptiveDrawer>
  );
};
