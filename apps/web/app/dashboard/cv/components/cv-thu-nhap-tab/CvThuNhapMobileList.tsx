'use client';

import { Progress, theme } from 'antd';
import { ChevronRight } from 'lucide-react';
import type { CvPaystubRecord } from '@mos-lab/shared';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { AppIcon, MobileRecordList } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import {
  formatHoursToHoursMinutes,
  formatStoreCode,
  type CvIncomeForecastMeta,
  type CvProjectedRecord,
} from './cvThuNhapUtils';

interface CvThuNhapMobileListProps {
  records: CvPaystubRecord[];
  loading: boolean;
  forecastMeta: CvIncomeForecastMeta;
  getProjectedRecord: (record: CvPaystubRecord) => CvProjectedRecord;
  onSelectCard?: (record: CvPaystubRecord) => void;
  onOpenWorkLogs: (record: CvPaystubRecord) => void;
  onOpenPaystubModal: (record: CvPaystubRecord) => void;
  onNavigateCareerPath: (staffId: number) => void;
}

/** Apple Fitness card layout for CV Paystub breakdown records on iPhone Portrait. */
export function CvThuNhapMobileList({
  records,
  loading,
  forecastMeta,
  getProjectedRecord,
  onSelectCard,
  onOpenPaystubModal,
}: CvThuNhapMobileListProps) {
  const { token } = theme.useToken();
  const { isDayMode, isPastPeriod } = forecastMeta;
  const showForecast = !isDayMode && !isPastPeriod;

  return (
    <MobileRecordList
      records={records}
      loading={loading}
      getKey={(record) => String(record.staffId)}
      emptyDescription="Không tìm thấy dữ liệu thu nhập CV"
      className="cv-income-mobile-record-list space-y-2"
      recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
      getRecordClassName={(record) => (record.isCvPlus ? '!border-amber-500/35' : '')}
      renderRecord={(record, index) => {
        const proj = getProjectedRecord(record);
        const breakdown = record.isCvPlus ? record.cvPlusBreakdown : null;
        const actualPct = breakdown ? Number((breakdown.actualComboRate * 100).toFixed(1)) : 0;
        const targetPct = breakdown ? Number((breakdown.targetComboRate * 100).toFixed(0)) : 0;
        const neededCombos = breakdown
          ? Math.max(1, Math.ceil(breakdown.notComboLiveOrders * breakdown.targetComboRate) - breakdown.combosSoldCount)
          : 0;
        const comboProgress =
          breakdown && targetPct > 0 ? Math.min(100, Math.max(0, Math.round((actualPct / targetPct) * 100))) : 0;

        const coreStreams = [
          { label: 'Lương giờ', value: record.hourlyWage || 0, color: 'text-sky-600 dark:text-sky-400' },
          { label: 'Xoay', value: record.cvXoayBonus || 0, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Tip', value: record.cvTipBonus || 0, color: 'text-pink-600 dark:text-pink-400' },
          { label: 'Thâm niên', value: record.seniorityBonus || 0, color: 'text-amber-600 dark:text-amber-400' },
        ];

        const displayIncome = record.netIncome || record.totalIncome || 0;

        return (
          <button
            type="button"
            className="w-full min-w-0 text-left cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => (onSelectCard ? onSelectCard(record) : onOpenPaystubModal(record))}
          >
            {/* Top Row: Rank + Avatar + Name/Store/Hours on Left | Hero Thực lãnh + Forecast + Chevron on Right */}
            <div className="flex items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <CcAvatar name={record.staffName} src={record.avatar} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {record.staffName}
                    </span>
                    {record.isCvPlus ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 inline-flex items-center shrink-0">
                        <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">L{record.techLevel || 1}</span>
                    )}
                  </div>
                  <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 truncate tabular-nums">
                    {formatStoreCode(record.store)} · {formatHoursToHoursMinutes(record.totalWorkHours, true)} (
                    {record.activeDays ?? 0}d)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="text-right">
                  <div className="text-[17px] font-bold leading-none tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCompactVND(displayIncome)}
                  </div>
                  {showForecast && (proj.projectedTotalIncome || 0) > 0 && (
                    <div className="mt-0.5 text-[10.5px] font-medium text-emerald-600/85 dark:text-emerald-400 tabular-nums">
                      ~{formatCompactVND(proj.projectedTotalIncome)}
                    </div>
                  )}
                </div>
                <AppIcon icon={ChevronRight} size={16} className="text-slate-400/75 shrink-0" aria-hidden />
              </div>
            </div>

            {/* Slim CVL Combo Unlock Strip */}
            {breakdown && (
              <div className="mt-2.5 rounded-xl px-2.5 py-2 bg-amber-500/[0.06] dark:bg-amber-500/[0.08] border border-amber-500/25">
                <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200 min-w-0 truncate">
                    <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    <span>Combo</span>
                    <strong
                      data-cvl-combo-rate={actualPct}
                      className={
                        breakdown.isUnlocked
                          ? 'font-bold text-emerald-600 dark:text-emerald-400'
                          : 'font-bold text-amber-600 dark:text-amber-400'
                      }
                    >
                      {actualPct}%/{targetPct}%
                    </strong>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      ({breakdown.combosSoldCount}/{breakdown.notComboLiveOrders})
                    </span>
                  </span>

                  <span
                    className={`shrink-0 font-semibold ${
                      breakdown.isUnlocked
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {breakdown.isUnlocked ? '✓ Mở khóa +2k/h & gói' : `🔒 Thiếu ${neededCombos} combo`}
                  </span>
                </div>

                <div className="mt-1.5">
                  <Progress
                    percent={comboProgress}
                    size="small"
                    showInfo={false}
                    strokeColor={breakdown.isUnlocked ? token.colorSuccess : token.colorWarning}
                    className="m-0 block leading-none [&_.ant-progress-inner]:!h-[3px] [&_.ant-progress-bg]:!h-[3px]"
                  />
                </div>
              </div>
            )}

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

            {(record.holidayPremiumPay || 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-300 tabular-nums">
                  Lễ x3 +{formatCompactVND(record.holidayPremiumPay || 0)}
                </span>
              </div>
            )}
          </button>
        );
      }}
    />
  );
}
