'use client';

import { Button, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye } from 'lucide-react';
import type { CvPaystubRecord } from '@mos-lab/shared';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { formatCompactVND, formatVND } from '~/lib/format-utils';
import {
  formatHoursToHoursMinutes,
  formatStoreCode,
  getSeniorityColorClass,
  type CvIncomeForecastMeta,
  type CvProjectedRecord,
} from './cvThuNhapUtils';

interface BuildCvThuNhapColumnsParams {
  forecastMeta: CvIncomeForecastMeta;
  getProjectedRecord: (record: CvPaystubRecord) => CvProjectedRecord;
  onOpenWorkLogs: (record: CvPaystubRecord) => void;
  onOpenPaystubModal: (record: CvPaystubRecord) => void;
  onNavigateCareerPath: (staffId: number) => void;
}

/** Builds desktop table column definitions for the CV Paystub breakdown table. */
export function buildCvThuNhapColumns({
  forecastMeta,
  getProjectedRecord,
  onOpenWorkLogs,
  onOpenPaystubModal,
  onNavigateCareerPath,
}: BuildCvThuNhapColumnsParams): ColumnsType<CvPaystubRecord> {
  const { isDayMode, isPastPeriod, periodNoun } = forecastMeta;

  return [
    {
      title: 'CV',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 160,
      render: (text: string, record: CvPaystubRecord, index: number) => {
        const rank = index + 1;
        let rankBadge = null;
        if (rank === 1) {
          rankBadge = <span className="text-sm shrink-0 w-5 text-center">🥇</span>;
        } else if (rank === 2) {
          rankBadge = <span className="text-sm shrink-0 w-5 text-center">🥈</span>;
        } else if (rank === 3) {
          rankBadge = <span className="text-sm shrink-0 w-5 text-center">🥉</span>;
        } else {
          rankBadge = <span className="text-xs font-semibold text-slate-500 w-5 text-center shrink-0">#{rank}</span>;
        }

        const isSelfManaged = record.isCvPlus || Boolean(record.cvPlusBreakdown);

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {rankBadge}
            <CcAvatar name={text} src={record.avatar} size={26} />
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">{text}</span>
              {isSelfManaged ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-500" />
                </span>
              ) : (
                <Tooltip title={`🌱 Lộ trình thăng tiến: Xem Career Path của ${text}`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateCareerPath(record.staffId);
                    }}
                    className="cursor-pointer hover:scale-125 active:scale-95 transition-transform inline-flex items-center text-xs p-0 bg-transparent border-0 opacity-80 hover:opacity-100"
                    title={`Xem lộ trình thăng tiến của ${text}`}
                  >
                    🌱
                  </button>
                </Tooltip>
              )}
              <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">L{record.techLevel || 1}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Store',
      dataIndex: 'store',
      key: 'store',
      width: 60,
      align: 'center' as const,
      render: (text: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{formatStoreCode(text)}</span>
      ),
    },
    {
      title: 'Công & Giờ Làm',
      key: 'workTime',
      width: 110,
      align: 'right' as const,
      render: (_: unknown, record: CvPaystubRecord) => {
        const val = record.totalWorkHours || 0;
        const days = record.activeDays || 0;
        const offDays = record.offDaysWorked || 0;
        const offMonthDays = record.offMonthDays || 0;
        const regularDays = Math.max(0, days - offDays);
        const hasOffWork = offDays > 0;

        const monthOffBadge =
          offMonthDays > 0 ? (
            <Tooltip
              title={`Đã nghỉ ${offMonthDays} ngày phép tháng có hưởng 100% lương (+${(record.offMonthWage || 0).toLocaleString('vi-VN')}đ)`}
            >
              <span className="text-emerald-400 font-semibold text-[11px] ml-1">+{offMonthDays}p</span>
            </Tooltip>
          ) : null;

        const daysContent =
          days === 0 ? (
            <span className="text-slate-600 font-medium text-[11px]">0 ngày{monthOffBadge}</span>
          ) : hasOffWork ? (
            <Tooltip title={`Có ${offDays} ngày đi làm vào ngày nghỉ tuần (Được tính x2 lương giờ)`}>
              <span className="cursor-help text-amber-400 font-semibold text-[11px]">
                {regularDays}+{offDays} ngày{monthOffBadge}
              </span>
            </Tooltip>
          ) : (
            <span className="text-slate-400 font-medium text-[11px]">
              {days} ngày{monthOffBadge}
            </span>
          );

        return (
          <div className="flex flex-col items-end w-full text-right leading-tight">
            {val > 0 ? (
              <Button
                type="link"
                size="small"
                onClick={() => onOpenWorkLogs(record)}
                className="p-0 font-bold text-xs text-sky-400 hover:text-sky-300 hover:underline flex justify-end items-center h-auto"
              >
                <span className="tabular-nums font-mono text-xs">{formatHoursToHoursMinutes(val, true)}</span>
              </Button>
            ) : (
              <span className="tabular-nums font-mono text-xs text-slate-500 font-medium">0h</span>
            )}
            <div className="tabular-nums mt-0.5 whitespace-nowrap">{daysContent}</div>
          </div>
        );
      },
    },
    {
      title: 'Lương Giờ',
      dataIndex: 'hourlyWage',
      key: 'hourlyWage',
      width: 95,
      align: 'right' as const,
      render: (val: number, r: CvPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-medium text-xs text-slate-600 dark:text-slate-300">
              {val.toLocaleString('vi-VN')}đ
            </span>
            {!isDayMode && !isPastPeriod && proj.projectedHourlyWage > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-blue-400/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedHourlyWage)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'CV Xoay',
      dataIndex: 'cvXoayBonus',
      key: 'cvXoayBonus',
      width: 100,
      align: 'right' as const,
      render: (val: number, r: CvPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-blue-400">+{val.toLocaleString('vi-VN')}đ</span>
            {!isDayMode && !isPastPeriod && proj.projectedCvXoayBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-blue-400/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedCvXoayBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng Thâm Niên',
      key: 'seniorityBonus',
      width: 125,
      align: 'right' as const,
      render: (_: unknown, record: CvPaystubRecord) => {
        const months = record.seniorityMonths || 0;
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        const seniorityStr = years > 0 ? `${years}y ${remainingMonths}m` : `${months}m`;
        const bonus = record.seniorityBonus || 0;
        const percent = record.seniorityBonusPercent || 0;
        const proj = getProjectedRecord(record);
        const colorClass = getSeniorityColorClass(percent);

        return (
          <div className="flex flex-col items-end">
            <span className={`tabular-nums font-semibold text-xs block ${colorClass}`}>
              +{bonus.toLocaleString('vi-VN')}đ
            </span>
            <span className="block text-[10px] font-medium tabular-nums text-slate-500">
              {seniorityStr} {percent > 0 ? `[+${percent}%]` : '[0%]'}
            </span>
            {!isDayMode && !isPastPeriod && proj.projectedSeniorityBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-amber-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedSeniorityBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'CV Tip',
      dataIndex: 'cvTipBonus',
      key: 'cvTipBonus',
      width: 100,
      align: 'right' as const,
      render: (val: number, r: CvPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-purple-400">+{val.toLocaleString('vi-VN')}đ</span>
            {!isDayMode && !isPastPeriod && proj.projectedCvTipBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-purple-400/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedCvTipBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tổng Thu Nhập',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      width: 120,
      align: 'right' as const,
      render: (val: number, r: CvPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-slate-700 dark:text-slate-200 text-sm">
              {Math.round(val).toLocaleString('vi-VN')}đ
            </span>
            {!isDayMode && !isPastPeriod && proj.projectedTotalIncome > 0 && (
              <Tooltip
                title={`Dự đoán tổng thu nhập về đích cuối ${periodNoun}: ~${formatVND(proj.projectedTotalIncome)}đ`}
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
      title: 'Khấu trừ BHXH',
      dataIndex: 'socialSecurityAmount',
      key: 'socialSecurityAmount',
      width: 115,
      align: 'right' as const,
      render: (val: number | undefined) => (
        <span className="tabular-nums font-medium text-xs text-rose-500">
          {val && val > 0 ? `-${val.toLocaleString('vi-VN')}đ` : '0đ'}
        </span>
      ),
    },
    {
      title: 'Lương Thực Lãnh',
      dataIndex: 'netIncome',
      key: 'netIncome',
      width: 130,
      align: 'right' as const,
      render: (val: number | undefined, r: CvPaystubRecord) => {
        const net = Math.round(val ?? r.totalIncome - (r.socialSecurityAmount || 0));
        return <span className="tabular-nums font-bold text-emerald-500 text-sm">{net.toLocaleString('vi-VN')}đ</span>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      align: 'center' as const,
      render: (_: unknown, record: CvPaystubRecord) => (
        <Button
          type="default"
          size="small"
          icon={<Eye className="w-3.5 h-3.5 text-amber-400" />}
          className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2 inline-flex items-center"
          onClick={() => onOpenPaystubModal(record)}
        >
          Phiếu Lương
        </Button>
      ),
    },
  ];
}
