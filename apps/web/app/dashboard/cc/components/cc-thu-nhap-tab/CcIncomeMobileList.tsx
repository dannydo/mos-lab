'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { Clock, Eye } from 'lucide-react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import { AppIcon, MobileRecordList } from '~/components/ui';
import { formatCompactVND, formatStoreCode, formatVND } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { ProjectedCcIncomeRecord, formatCcRankBadge } from './cc-thu-nhap-utils';

interface CcIncomeMobileListProps {
  records: CcPaystubRecord[];
  loading: boolean;
  isDayMode: boolean;
  isPastPeriod: boolean;
  getProjectedRecord: (record: CcPaystubRecord) => ProjectedCcIncomeRecord;
  onOpenDetailModal: (record: CcPaystubRecord) => void;
  onOpenWorkLogModal: (record: CcPaystubRecord) => void;
  onOpenCcXoayModal: (record: CcPaystubRecord) => void;
  onOpenComboModal: (record: CcPaystubRecord) => void;
  onOpenTipModal: (record: CcPaystubRecord) => void;
  onOpenDiamondModal: (record: CcPaystubRecord) => void;
}

export function CcIncomeMobileList({
  records,
  loading,
  isDayMode,
  isPastPeriod,
  getProjectedRecord,
  onOpenDetailModal,
  onOpenWorkLogModal,
  onOpenCcXoayModal,
  onOpenComboModal,
  onOpenTipModal,
  onOpenDiamondModal,
}: CcIncomeMobileListProps) {
  const showForecast = !isDayMode && !isPastPeriod;

  return (
    <div className="p-2 sm:p-3">
      <MobileRecordList
        records={records}
        loading={loading}
        getKey={(record) => String(record.consultantId)}
        emptyDescription="Không tìm thấy dữ liệu thu nhập CC"
        className="cc-income-mobile-record-list"
        renderRecord={(record, index) => {
          const proj = getProjectedRecord(record);
          const incomeSources = [
            {
              label: 'Lương giờ',
              value: record.hourlyWage || 0,
              projected: proj.projectedHourlyWage,
              color: 'text-sky-500 dark:text-sky-400',
              onClick: () => onOpenWorkLogModal(record),
            },
            {
              label: 'Xoay',
              value: record.ccXoayBonus || 0,
              projected: proj.projectedCcXoayBonus,
              color: 'text-purple-500 dark:text-purple-400',
              onClick: () => onOpenCcXoayModal(record),
            },
            {
              label: 'Combo & SP',
              value: record.comboProductBonus || 0,
              projected: proj.projectedComboProductBonus,
              color: 'text-emerald-500 dark:text-emerald-400',
              onClick: () => onOpenComboModal(record),
            },
            {
              label: 'Tip',
              value: record.ccTipBonus || 0,
              projected: proj.projectedCcTipBonus,
              color: 'text-amber-600 dark:text-amber-300',
              onClick: () => onOpenTipModal(record),
            },
            {
              label: 'Kim cương',
              value: record.diamondBonus || 0,
              projected: proj.projectedDiamondBonus,
              color: 'text-cyan-500 dark:text-cyan-300',
              onClick: () => onOpenDiamondModal(record),
            },
            {
              label: 'Minigame',
              value: record.minigameBonus || 0,
              projected: proj.projectedMinigameBonus,
              color: 'text-yellow-600 dark:text-yellow-300',
            },
            {
              label: 'Phụ cấp lễ x3',
              value: record.holidayPremiumPay || 0,
              projected: proj.projectedHolidayPay,
              color: 'text-rose-500 dark:text-rose-300',
            },
          ];

          return (
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                  {formatCcRankBadge(index)}
                </span>
                <CcAvatar name={record.displayName} src={record.avatar} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {record.displayName}
                  </div>
                  <div className="text-xs text-slate-400">{formatStoreCode(record.store)}</div>
                </div>
                <Tooltip title={`Xem giờ làm của ${record.displayName}`}>
                  <Button
                    aria-label={`Xem giờ làm của ${record.displayName}`}
                    className="flex h-8 w-8 min-w-8 shrink-0 items-center justify-center rounded-lg"
                    icon={<AppIcon icon={Clock} size={15} />}
                    size="small"
                    type="text"
                    onClick={() => onOpenWorkLogModal(record)}
                  />
                </Tooltip>
              </div>

              <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                {incomeSources.map((income) => (
                  <div
                    className={`min-w-0 ${income.onClick ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : ''}`}
                    key={income.label}
                    onClick={income.onClick}
                  >
                    <dt
                      className="truncate text-[10px] leading-4 text-slate-500 flex items-center justify-between"
                      title={income.label}
                    >
                      <span>{income.label}</span>
                      {income.onClick && <AppIcon icon={Eye} size={10} className="opacity-60 shrink-0" />}
                    </dt>
                    <Tooltip title={`${income.label}: +${formatVND(income.value)}`}>
                      <dd className={`truncate whitespace-nowrap text-xs font-bold tabular-nums ${income.color}`}>
                        +{formatCompactVND(income.value)}
                      </dd>
                    </Tooltip>
                    {showForecast && (income.projected || 0) > 0 && (
                      <div className="text-[10px] text-emerald-500/80 font-medium tabular-nums">
                        🔮 ~{formatCompactVND(income.projected)}
                      </div>
                    )}
                  </div>
                ))}
              </dl>

              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-slate-500">∑ Thu nhập</div>
                  <Tooltip title={`Thu nhập: ${formatVND(record.totalIncome || 0)}`}>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold tabular-nums text-amber-600 dark:text-amber-300">
                      {formatCompactVND(record.totalIncome || 0)}
                    </div>
                  </Tooltip>
                  {showForecast && (proj.projectedTotalIncome || 0) > 0 && (
                    <div className="text-[11px] font-semibold text-emerald-500/90 tabular-nums">
                      🔮 ~{formatCompactVND(proj.projectedTotalIncome)}
                    </div>
                  )}
                </div>
                <Button
                  icon={<AppIcon icon={Eye} size={14} />}
                  size="small"
                  type="primary"
                  onClick={() => onOpenDetailModal(record)}
                >
                  Chi tiết
                </Button>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
