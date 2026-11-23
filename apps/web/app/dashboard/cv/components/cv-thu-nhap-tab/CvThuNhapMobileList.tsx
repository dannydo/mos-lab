'use client';

import { Button } from 'antd';
import { Eye } from 'lucide-react';
import type { CvPaystubRecord } from '@mos-lab/shared';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { MobileRecordList } from '~/components/ui';
import { formatCompactVND, formatVND } from '~/lib/format-utils';
import { CvSelfManagedSubRow } from './CvSelfManagedSubRow';
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
  onOpenWorkLogs: (record: CvPaystubRecord) => void;
  onOpenPaystubModal: (record: CvPaystubRecord) => void;
  onNavigateCareerPath: (staffId: number) => void;
}

/** Mobile card layout for CV Paystub breakdown records. */
export function CvThuNhapMobileList({
  records,
  loading,
  forecastMeta,
  getProjectedRecord,
  onOpenWorkLogs,
  onOpenPaystubModal,
  onNavigateCareerPath,
}: CvThuNhapMobileListProps) {
  const { isDayMode, isPastPeriod } = forecastMeta;

  return (
    <div className="p-2 sm:p-3">
      <MobileRecordList
        records={records}
        loading={loading}
        getKey={(record) => String(record.staffId)}
        emptyDescription="Không tìm thấy dữ liệu thu nhập CV"
        getRecordClassName={(record) =>
          record.isCvPlus
            ? '!border-amber-500/40 !bg-gradient-to-b !from-amber-500/[0.04] !to-transparent dark:!from-slate-900 dark:!to-slate-900/95 !rounded-2xl !p-3 sm:!p-3.5 shadow-md relative overflow-hidden'
            : '!border-slate-200 dark:!border-slate-800 !bg-white dark:!bg-slate-900/80 !rounded-2xl !p-3 sm:!p-3.5 shadow-sm'
        }
        renderRecord={(record, index) => (
          <div className="min-w-0">
            {/* Rank & Profile Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-4 shrink-0 text-center text-xs font-bold tabular-nums">
                  {index === 0 ? (
                    '🥇'
                  ) : index === 1 ? (
                    '🥈'
                  ) : index === 2 ? (
                    '🥉'
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold">#{index + 1}</span>
                  )}
                </span>
                <div className="shrink-0">
                  <CcAvatar
                    name={record.staffName}
                    src={record.avatar}
                    size={36}
                    className={
                      record.isCvPlus
                        ? 'ring-2 ring-amber-400/80 rounded-full'
                        : 'border border-slate-300 dark:border-slate-700 rounded-full'
                    }
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      {record.staffName}
                    </span>
                    {record.isCvPlus ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 inline-flex items-center gap-0.5 shrink-0">
                        <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateCareerPath(record.staffId);
                          }}
                          className="cursor-pointer hover:scale-125 active:scale-95 transition-transform inline-flex items-center text-xs p-0 bg-transparent border-0 shrink-0 opacity-90 hover:opacity-100"
                          title={`Xem lộ trình thăng tiến của ${record.staffName}`}
                        >
                          🌱
                        </button>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">L{record.techLevel || 1}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {formatStoreCode(record.store)} · {formatHoursToHoursMinutes(record.totalWorkHours, true)} (
                    {record.activeDays ?? 0} ngày)
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block leading-tight">
                  {record.netIncome != null && (record.socialSecurityAmount || 0) > 0 ? 'Thực Lãnh' : 'Thu nhập'}
                </span>
                <span className="text-xs sm:text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 block leading-tight">
                  {formatVND(record.netIncome || record.totalIncome)}
                </span>
                {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedTotalIncome || 0) > 0 && (
                  <div className="text-[9px] text-emerald-500/80 font-medium tabular-nums">
                    🔮 ~{formatCompactVND(getProjectedRecord(record).projectedTotalIncome)}
                  </div>
                )}
              </div>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[9px]">Lương giờ</span>
                <span className="font-bold tabular-nums text-sky-600 dark:text-sky-400 text-xs block">
                  +{formatCompactVND(record.hourlyWage || 0)}
                </span>
                {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedHourlyWage || 0) > 0 && (
                  <div className="text-[9px] text-sky-500/80 dark:text-sky-400/80 font-medium tabular-nums">
                    🔮 ~{formatCompactVND(getProjectedRecord(record).projectedHourlyWage)}
                  </div>
                )}
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[9px]">CV Xoay</span>
                <span className="font-bold tabular-nums text-purple-600 dark:text-purple-400 text-xs block">
                  +{formatCompactVND(record.cvXoayBonus || 0)}
                </span>
                {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedCvXoayBonus || 0) > 0 && (
                  <div className="text-[9px] text-purple-500/80 dark:text-purple-400/80 font-medium tabular-nums">
                    🔮 ~{formatCompactVND(getProjectedRecord(record).projectedCvXoayBonus)}
                  </div>
                )}
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[9px]">
                  CV Tip ({record.isCvPlus ? '90%' : '70%'})
                </span>
                <span className="font-bold tabular-nums text-pink-600 dark:text-pink-400 text-xs block">
                  +{formatCompactVND(record.cvTipBonus || 0)}
                </span>
              </div>
              {(record.holidayPremiumPay || 0) > 0 && (
                <div className="col-span-3 mt-1 text-[9px] text-rose-500 dark:text-rose-400 font-medium flex items-center justify-between bg-rose-500/10 px-2 py-0.5 rounded">
                  <span>Phụ cấp lễ x3:</span>
                  <span className="font-bold tabular-nums">+{formatVND(record.holidayPremiumPay)}</span>
                </div>
              )}
            </div>

            {/* SPECIAL CVL 2-TIER SUB-ROW */}
            {record.isCvPlus && record.cvPlusBreakdown && (
              <div className="mt-2">
                <CvSelfManagedSubRow record={record} onOpenPaystubModal={onOpenPaystubModal} />
              </div>
            )}

            {/* Footer & Action Buttons */}
            {record.isCvPlus ? (
              <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-0.5">
                <Button
                  size="small"
                  onClick={() => onOpenWorkLogs(record)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 h-6 text-[10px] px-2"
                >
                  Giờ làm
                </Button>
                <Button
                  size="small"
                  icon={<Eye className="w-3 h-3 text-amber-500 dark:text-amber-400" />}
                  onClick={() => onOpenPaystubModal(record)}
                  className="bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border-amber-400/60 dark:border-amber-500/40 h-6 text-[10px] px-2 font-semibold inline-flex items-center"
                >
                  Phiếu lương
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onNavigateCareerPath(record.staffId)}
                  className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-left"
                >
                  <span>🌱 Bấm lá để xem điều kiện lên</span>
                  <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-500" />
                </button>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="small"
                    onClick={() => onOpenWorkLogs(record)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 h-6 text-[10px] px-2"
                  >
                    Giờ làm
                  </Button>
                  <Button
                    size="small"
                    icon={<Eye className="w-3 h-3 text-slate-400" />}
                    onClick={() => onOpenPaystubModal(record)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 h-6 text-[10px] px-2 inline-flex items-center"
                  >
                    Phiếu lương
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
