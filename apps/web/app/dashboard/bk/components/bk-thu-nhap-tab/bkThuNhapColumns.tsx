'use client';

import { Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Clock, Eye } from 'lucide-react';
import type { BkPaystubRecord, SafeAny } from '@mos-lab/shared';
import { TableIndexHeader } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import BkAvatar from '../BkAvatar';
import {
  formatBkIncomeCurrency,
  formatStoreCode,
  type BkIncomeForecastMeta,
  type BkProjectedRecord,
} from './bkThuNhapUtils';

interface BuildBkPaystubColumnsParams {
  forecastMeta: BkIncomeForecastMeta;
  getProjectedRecord: (record: BkPaystubRecord) => BkProjectedRecord;
  onOpenWorkLogs: (record: BkPaystubRecord) => void;
  onOpenBreakdownModal: (record: BkPaystubRecord) => void;
}

/** Builds desktop table column definitions for the Live Paystub Booker table. */
export function buildBkPaystubColumns({
  forecastMeta,
  getProjectedRecord,
  onOpenWorkLogs,
  onOpenBreakdownModal,
}: BuildBkPaystubColumnsParams): ColumnsType<BkPaystubRecord> {
  const { isDayMode, isPastPeriod, periodNoun } = forecastMeta;

  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: SafeAny, __: BkPaystubRecord, index: number) => (
        <span className="tabular-nums font-semibold text-slate-500 text-xs">#{index + 1}</span>
      ),
    },
    {
      title: 'Booker',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name: string, record: BkPaystubRecord) => (
        <Space className="whitespace-nowrap" size={8}>
          <BkAvatar name={name} src={record.avatar} size={32} />
          <div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-semibold text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">{name}</span>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                · {formatStoreCode(record.store)}
              </span>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số Ngày Công',
      dataIndex: 'actualWorkDays',
      key: 'actualWorkDays',
      align: 'center' as const,
      render: (val: number, r: BkPaystubRecord) => (
        <Tooltip title="Click để xem Báo Cáo Chi Tiết Ca Làm Việc (IN/OUT) từng ngày">
          <div
            className="flex flex-col items-center justify-center cursor-pointer hover:bg-blue-500/10 p-1 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
            role="button"
            tabIndex={0}
            onClick={() => onOpenWorkLogs(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenWorkLogs(r);
              }
            }}
          >
            <span className="tabular-nums text-xs text-blue-400 font-semibold whitespace-nowrap hover:underline underline-offset-2">
              {val} / {r.standardWorkDays} ngày
            </span>
            {r.actualCheckInDays !== undefined && r.actualCheckInDays !== val && (
              <span className="text-[10px] text-emerald-500 tabular-nums">
                ({r.actualCheckInDays} máy{' '}
                {r.workDaysAdjustment && r.workDaysAdjustment > 0 ? `+${r.workDaysAdjustment}` : r.workDaysAdjustment}{' '}
                duyệt)
              </span>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Lương Cứng',
      dataIndex: 'calculatedBaseSalary',
      key: 'calculatedBaseSalary',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <Tooltip title="Click để xem chi tiết chấm công & ca làm việc (IN/OUT)">
            <div
              className="cursor-pointer hover:bg-blue-500/10 p-1 rounded-lg transition-colors border border-transparent hover:border-blue-500/30 inline-block text-right"
              role="button"
              tabIndex={0}
              onClick={() => onOpenWorkLogs(r)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenWorkLogs(r);
                }
              }}
            >
              <span className="tabular-nums font-semibold text-xs text-blue-400 hover:underline underline-offset-2">
                {formatBkIncomeCurrency(val)}
              </span>
              {!isDayMode && !isPastPeriod && proj.projectedBaseSalary > 0 && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-blue-400/80 font-medium tabular-nums">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedBaseSalary)}</span>
                </div>
              )}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thưởng Done',
      dataIndex: 'doneBonus',
      key: 'doneBonus',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-emerald-400">+{formatBkIncomeCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && proj.projectedDoneBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedDoneBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng BK Tip',
      dataIndex: 'tipBonus',
      key: 'tipBonus',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-pink-400">+{formatBkIncomeCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && proj.projectedTipBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-pink-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedTipBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng Doanh Thu',
      dataIndex: 'revenueBonus',
      key: 'revenueBonus',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-purple-400">+{formatBkIncomeCurrency(val)}</span>
            <Tooltip
              title={
                r.totalRevenue && r.totalRevenue >= 50000000
                  ? `Doanh thu ghi nhận: ${formatBkIncomeCurrency(r.totalRevenue)} (Mức hoa hồng: ${r.revCommissionRate || 0}%)`
                  : `Doanh thu ghi nhận: ${formatBkIncomeCurrency(r.totalRevenue || 0)} (Chưa đạt mốc tối thiểu 50.000.000 đ để hưởng hoa hồng)`
              }
            >
              <span className="text-[10px] text-slate-400 font-medium tabular-nums cursor-help">
                Rev: {formatCompactVND(r.totalRevenue || 0)}
                {r.revCommissionRate ? ` (${r.revCommissionRate}%)` : ''}
              </span>
            </Tooltip>
            {!isDayMode && !isPastPeriod && (
              <Tooltip
                title={
                  proj.projectedRevenueBonus > 0
                    ? `Dự đoán doanh thu cuối ${periodNoun}: ~${formatBkIncomeCurrency(proj.projectedRevenue)} (Mức ${proj.projectedRevRate}%) → Thưởng: ~${formatBkIncomeCurrency(proj.projectedRevenueBonus)}`
                    : `Dự đoán doanh thu cuối ${periodNoun}: ~${formatBkIncomeCurrency(proj.projectedRevenue)} (dưới mốc 50M → thưởng ~0 đ)`
                }
              >
                <div className="flex items-center gap-1 text-[11px] text-purple-400/80 font-medium tabular-nums cursor-help">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedRevenueBonus)}</span>
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Phụ cấp lễ x3',
      dataIndex: 'holidayPremiumPay',
      key: 'holidayPremiumPay',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-rose-400">
              +{formatBkIncomeCurrency(val || 0)}
            </span>
            {!isDayMode && !isPastPeriod && (proj.projectedHolidayPay || 0) > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-rose-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedHolidayPay)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tổng Thu Nhập Tạm Tính',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right' as const,
      render: (val: number, record: BkPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-sm text-emerald-400">{formatBkIncomeCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && proj.projectedTotalIncome > 0 && (
              <Tooltip
                title={`Dự đoán tổng thu nhập về đích cuối ${periodNoun}: ~${formatBkIncomeCurrency(proj.projectedTotalIncome)}`}
              >
                <div className="flex items-center gap-1 text-[11px] text-emerald-500/80 font-medium tabular-nums cursor-help">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedTotalIncome)}</span>
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: SafeAny, record: BkPaystubRecord) => (
        <Space size={6}>
          <Button
            type="default"
            size="small"
            icon={<Clock className="w-3.5 h-3.5 text-blue-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-blue-400 hover:text-blue-400 px-2"
            onClick={() => onOpenWorkLogs(record)}
          >
            Chấm công
          </Button>
          <Button
            type="default"
            size="small"
            icon={<Eye className="w-3.5 h-3.5 text-amber-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
            onClick={() => onOpenBreakdownModal(record)}
          >
            Phiếu lương
          </Button>
        </Space>
      ),
    },
  ];
}
