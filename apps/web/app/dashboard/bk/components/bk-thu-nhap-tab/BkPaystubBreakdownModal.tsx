'use client';

import { Button } from 'antd';
import { Clock, Wallet } from 'lucide-react';
import type { BkPaystubRecord } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';
import { formatBkIncomeCurrency, type BkIncomeForecastMeta, type BkProjectedRecord } from './bkThuNhapUtils';

interface BkPaystubBreakdownModalProps {
  open: boolean;
  activePaystub: BkPaystubRecord | null;
  forecastMeta: BkIncomeForecastMeta;
  getProjectedRecord: (record: BkPaystubRecord) => BkProjectedRecord;
  onClose: () => void;
  onOpenWorkLogs: (record: BkPaystubRecord) => void;
}

/** Displays the itemized paystub breakdown modal for a single Booker. */
export function BkPaystubBreakdownModal({
  open,
  activePaystub,
  forecastMeta,
  getProjectedRecord,
  onClose,
  onOpenWorkLogs,
}: BkPaystubBreakdownModalProps) {
  if (!activePaystub) return null;

  const { isDayMode, isPastPeriod, periodNoun } = forecastMeta;
  const projected = !isDayMode && !isPastPeriod ? getProjectedRecord(activePaystub) : null;

  return (
    <AdaptiveModal
      intent="detail"
      title={
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>
            Phiếu Lương Chi Tiết - Booker: <strong className="text-emerald-600">{activePaystub.staffName}</strong>
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
      destroyOnHidden
    >
      <div className="space-y-4 py-3 tabular-nums">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Lương Cứng Tính Theo Ngày Công</div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {formatBkIncomeCurrency(activePaystub.monthlyBaseSalary)} / {activePaystub.standardWorkDays} ngày x{' '}
              {activePaystub.actualWorkDays} ngày thực tế
              {activePaystub.actualCheckInDays !== undefined &&
                activePaystub.actualCheckInDays !== activePaystub.actualWorkDays && (
                  <span className="text-xs text-emerald-500 ml-1.5 font-normal">
                    ({activePaystub.actualCheckInDays} ngày máy{' '}
                    {activePaystub.workDaysAdjustment && activePaystub.workDaysAdjustment > 0
                      ? `+${activePaystub.workDaysAdjustment}`
                      : activePaystub.workDaysAdjustment}{' '}
                    ngày duyệt bù)
                  </span>
                )}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <Button
                type="link"
                size="small"
                icon={<Clock className="w-3.5 h-3.5" />}
                className="text-xs text-blue-500 p-0 h-auto font-medium inline-flex items-center gap-1"
                onClick={() => {
                  onClose();
                  onOpenWorkLogs(activePaystub);
                }}
              >
                Xem chi tiết chấm công IN/OUT từng ngày →
              </Button>
            </div>
          </div>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
            {formatBkIncomeCurrency(activePaystub.calculatedBaseSalary)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Thưởng Đơn Completed (Done)</div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Gồm thưởng lượt Done, Promo &amp; Mốc thưởng
            </div>
          </div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            +{formatBkIncomeCurrency(activePaystub.doneBonus)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase">Thưởng BK Tip (% Share)</div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Phần % thưởng Tip khách cho trên các đơn book
            </div>
          </div>
          <div className="text-base font-bold text-pink-600 dark:text-pink-400 whitespace-nowrap">
            +{formatBkIncomeCurrency(activePaystub.tipBonus)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex justify-between items-center gap-4">
          <div>
            <div className="text-xs text-purple-600 dark:text-purple-300 font-semibold uppercase">
              Thưởng Hoa Hồng Doanh Thu
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Doanh thu ghi nhận:{' '}
              <strong className="text-purple-600 dark:text-purple-300 tabular-nums">
                {formatBkIncomeCurrency(activePaystub.totalRevenue || 0)}
              </strong>
              {activePaystub.revCommissionRate ? (
                <span className="ml-1 text-xs text-purple-500 font-semibold">({activePaystub.revCommissionRate}%)</span>
              ) : (
                <span className="ml-1 text-xs text-slate-400 font-normal">
                  (Chưa đạt mốc tối thiểu 50.000.000 đ để hưởng hoa hồng)
                </span>
              )}
            </div>
            {projected && (
              <div className="text-xs text-purple-400/90 mt-0.5">
                🔮 Dự đoán cuối {periodNoun}: Doanh thu ~{formatBkIncomeCurrency(projected.projectedRevenue)} (
                {projected.projectedRevRate}%) → Thưởng: ~{formatBkIncomeCurrency(projected.projectedRevenueBonus)}
              </div>
            )}
          </div>
          <div className="text-right whitespace-nowrap">
            <div className="text-base font-bold text-purple-600 dark:text-purple-400">
              +{formatBkIncomeCurrency(activePaystub.revenueBonus)}
            </div>
            {projected && projected.projectedRevenueBonus > 0 && (
              <div className="text-xs text-purple-400/80 font-medium tabular-nums">
                ~{formatBkIncomeCurrency(projected.projectedRevenueBonus)}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex justify-between items-center gap-4">
          <div>
            <div className="text-xs text-rose-600 dark:text-rose-300 font-semibold uppercase">Lương ngày lễ 1x</div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {activePaystub.holidayWorkedHours || 0} giờ làm + {activePaystub.holidayPaidLeaveHours || 0} giờ nghỉ lễ;
              1x đã nằm trong lương tháng
            </div>
          </div>
          <div className="text-base font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
            {formatBkIncomeCurrency(activePaystub.holidayBasePay || 0)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex justify-between items-center gap-4">
          <div>
            <div className="text-xs text-rose-600 dark:text-rose-300 font-semibold uppercase">Phụ cấp đi làm lễ x3</div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {activePaystub.holidayWorkedDays || 0} ngày có roster và chấm công hợp lệ
            </div>
          </div>
          <div className="text-base font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
            +{formatBkIncomeCurrency(activePaystub.holidayPremiumPay || 0)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center mt-6">
          <div className="font-bold text-base text-emerald-700 dark:text-emerald-300">∑ THU NHẬP TẠM TÍNH</div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            {formatBkIncomeCurrency(activePaystub.totalIncome)}
          </div>
        </div>
      </div>
    </AdaptiveModal>
  );
}
