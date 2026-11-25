'use client';

import React from 'react';
import { Button, Progress, theme } from 'antd';
import { ChevronRight } from 'lucide-react';
import type { CvPaystubRecord } from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, StatusTag } from '~/components/ui';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { formatCompactVND, formatVND } from '~/lib/format-utils';
import { formatChipAmount, formatHoursToHoursMinutes, formatStoreCode, type CvProjectedRecord } from './cvThuNhapUtils';

interface CvThuNhapMobileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  record: CvPaystubRecord | null;
  projected: CvProjectedRecord | null;
  showForecast: boolean;
  onOpenPaystubModal: (record: CvPaystubRecord) => void;
  onOpenWorkLogs: (record: CvPaystubRecord) => void;
  onNavigateCareerPath: (staffId: number) => void;
}

/** Apple iOS Bottom Sheet for CV Income breakdown, CVL Combo unlock card, and quick actions. */
export const CvThuNhapMobileDetailSheet: React.FC<CvThuNhapMobileDetailSheetProps> = ({
  open,
  onClose,
  record,
  projected,
  showForecast,
  onOpenPaystubModal,
  onOpenWorkLogs,
  onNavigateCareerPath,
}) => {
  const { token } = theme.useToken();
  const breakdown = record?.isCvPlus ? record.cvPlusBreakdown : null;
  const actualPct = breakdown ? Number((breakdown.actualComboRate * 100).toFixed(1)) : 0;
  const targetPct = breakdown ? Number((breakdown.targetComboRate * 100).toFixed(0)) : 0;
  const neededCombos = breakdown
    ? Math.max(1, Math.ceil(breakdown.notComboLiveOrders * breakdown.targetComboRate) - breakdown.combosSoldCount)
    : 0;
  const comboProgress =
    breakdown && targetPct > 0 ? Math.min(100, Math.max(0, Math.round((actualPct / targetPct) * 100))) : 0;

  const displayTotal = record ? record.netIncome || record.totalIncome || 0 : 0;
  const totalLabel =
    record && record.netIncome != null && (record.socialSecurityAmount || 0) > 0 ? 'Thực lãnh' : '∑ Tổng thu nhập';

  const rows = record
    ? [
        {
          key: 'wage',
          label: 'Lương giờ',
          value: record.hourlyWage || 0,
          projected: projected?.projectedHourlyWage || 0,
          colorClass: 'text-sky-600 dark:text-sky-400',
          onTap: () => onOpenWorkLogs(record),
        },
        {
          key: 'xoay',
          label: 'CV Xoay',
          value: record.cvXoayBonus || 0,
          projected: projected?.projectedCvXoayBonus || 0,
          colorClass: 'text-purple-600 dark:text-purple-400',
        },
        {
          key: 'tip',
          label: `CV Tip (${record.isCvPlus ? '90%' : '70%'})`,
          value: record.cvTipBonus || 0,
          projected: projected?.projectedCvTipBonus || 0,
          colorClass: 'text-pink-600 dark:text-pink-400',
        },
        {
          key: 'seniority',
          label: 'Thưởng Thâm Niên',
          value: record.seniorityBonus || 0,
          projected: projected?.projectedSeniorityBonus || 0,
          colorClass: 'text-amber-600 dark:text-amber-400',
        },
        ...((record.holidayPremiumPay || 0) > 0
          ? [
              {
                key: 'holiday',
                label: 'Phụ cấp lễ x3',
                value: record.holidayPremiumPay || 0,
                projected: 0,
                colorClass: 'text-rose-600 dark:text-rose-400',
              },
            ]
          : []),
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
            <CcAvatar name={record.staffName} src={record.avatar} size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                <span className="truncate">{record.staffName}</span>
                {record.isCvPlus && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
                    <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-500" />
                  </span>
                )}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate tabular-nums">
                {formatStoreCode(record.store)} · {formatHoursToHoursMinutes(record.totalWorkHours, true)} (
                {record.activeDays ?? 0} ngày)
              </div>
            </div>
          </div>
        ) : (
          'Phiếu thu nhập CV'
        )
      }
    >
      {record && (
        <div data-testid="cv-income-mobile-detail-sheet" className="space-y-3 pb-4">
          {/* Hero Card */}
          <div className="rounded-2xl p-3.5 bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                {totalLabel}
              </div>
              <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-300">
                {formatVND(displayTotal)}
              </div>
              {showForecast && (projected?.projectedTotalIncome || 0) > 0 && (
                <div className="mt-0.5 text-xs font-medium text-emerald-600/85 dark:text-emerald-400 tabular-nums">
                  Dự kiến kỳ: ~{formatCompactVND(projected?.projectedTotalIncome || 0)}
                </div>
              )}
            </div>
          </div>

          {/* 3 Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="primary"
              size="middle"
              onClick={() => onOpenPaystubModal(record)}
              className="font-semibold rounded-xl"
            >
              Phiếu lương
            </Button>
            <Button size="middle" onClick={() => onOpenWorkLogs(record)} className="font-semibold rounded-xl">
              Giờ làm
            </Button>
            <Button
              size="middle"
              onClick={() => onNavigateCareerPath(record.staffId)}
              className="font-semibold rounded-xl inline-flex items-center justify-center gap-1"
            >
              <span>Lộ trình</span>
              <CvFeather1Badge featherClass="w-3 h-3 text-amber-500" />
            </Button>
          </div>

          {/* CVL Combo Unlock Card */}
          {breakdown && (
            <div
              data-testid="cv-income-cvl-combo-card"
              className="rounded-2xl p-3 bg-amber-500/[0.06] border border-amber-500/25 dark:bg-amber-500/[0.08] space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-800 dark:text-slate-100">
                  <CvFeather1Badge featherClass="w-3 h-3 text-amber-500" />
                  <span>% Combo → Mở khóa +2k/h &amp; Gói</span>
                </div>
                <StatusTag
                  status={breakdown.isUnlocked ? 'success' : 'gold'}
                  label={breakdown.isUnlocked ? '🎯 Đã mở khóa' : '⚠️ Chưa đạt chuẩn'}
                  className="text-[10px] font-bold py-0 px-1.5 m-0"
                />
              </div>

              <div className="grid grid-cols-3 divide-x divide-amber-500/20 pt-1">
                <div className="pr-2 min-w-0">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">% Combo</div>
                  <div
                    className={`text-[15px] font-bold tabular-nums ${
                      breakdown.isUnlocked
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {actualPct}% / {targetPct}%
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                    {breakdown.combosSoldCount}/{breakdown.notComboLiveOrders} khách
                  </div>
                </div>

                <div className="px-2 min-w-0">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Thưởng thêm</div>
                  <div className="text-[15px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                    +{formatCompactVND(breakdown.totalAdditionalIncome || 0)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Quyền lợi CVL</div>
                </div>

                <div className="pl-2 min-w-0">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Tip 90% / Gói</div>
                  <div className="text-[13px] font-bold tabular-nums text-purple-600 dark:text-purple-400 truncate">
                    {formatChipAmount(breakdown.deltaTipBonus)} ·{' '}
                    {breakdown.isUnlocked ? formatChipAmount(breakdown.comboBonusTotal) : '0đ'}
                  </div>
                  <div className="text-[10px] text-sky-600 dark:text-sky-400 tabular-nums truncate">
                    Giờ: {breakdown.isUnlocked ? formatChipAmount(breakdown.deltaHourlyWage) : '0đ'}
                  </div>
                </div>
              </div>

              <Progress
                percent={comboProgress}
                size="small"
                showInfo={false}
                strokeColor={breakdown.isUnlocked ? token.colorSuccess : token.colorWarning}
                className="m-0 block leading-none [&_.ant-progress-inner]:!h-[4px] [&_.ant-progress-bg]:!h-[4px]"
              />

              <div
                className={`text-[11px] font-medium leading-snug ${
                  breakdown.isUnlocked ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {breakdown.isUnlocked
                  ? 'Đã mở khóa +2k/h lương giờ và 100% thưởng combo bậc thang.'
                  : `Cần thêm ${neededCombos} combo để mở khóa +2k/h và thưởng gói.`}
              </div>
            </div>
          )}

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

            {(record.socialSecurityAmount || 0) > 0 && (
              <div className="px-3.5 py-3 flex items-center justify-between gap-2">
                <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Khấu trừ BHXH</div>
                <div className="text-[14px] font-bold tabular-nums text-slate-600 dark:text-slate-300">
                  -{formatVND(record.socialSecurityAmount || 0)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdaptiveDrawer>
  );
};
