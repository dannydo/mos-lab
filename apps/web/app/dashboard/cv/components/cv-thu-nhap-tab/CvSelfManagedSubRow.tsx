'use client';

import { Tooltip } from 'antd';
import type { CvPaystubRecord } from '@mos-lab/shared';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { formatVND } from '~/lib/format-utils';
import { formatChipAmount } from './cvThuNhapUtils';

interface CvSelfManagedSubRowProps {
  record: CvPaystubRecord;
  onOpenPaystubModal: (record: CvPaystubRecord) => void;
}

/** Expandable 2-tier breakdown banner highlighting self-managed CVL additional earnings. */
export function CvSelfManagedSubRow({ record, onOpenPaystubModal }: CvSelfManagedSubRowProps) {
  const breakdown = record.cvPlusBreakdown;
  if (!breakdown) return null;

  const actualPct = (breakdown.actualComboRate * 100).toFixed(1);
  const targetPct = (breakdown.targetComboRate * 100).toFixed(0);
  const neededCombos = Math.max(
    1,
    Math.ceil(breakdown.notComboLiveOrders * breakdown.targetComboRate) - breakdown.combosSoldCount
  );

  const hasSerum = (breakdown.serumsSoldCount || 0) > 0 || (breakdown.serumBonusTotal || 0) > 0;
  const hasDebt = (breakdown.debtCollectionCount || 0) > 0 || (breakdown.debtCollectionBonusTotal || 0) > 0;
  const chipColsClass = hasSerum && hasDebt ? 'grid-cols-5' : hasSerum || hasDebt ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenPaystubModal(record)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenPaystubModal(record);
        }
      }}
      className="my-1.5 p-2 rounded-lg border border-amber-500/20 hover:border-amber-500/35 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] active:bg-amber-500/[0.12] dark:bg-amber-500/[0.06] dark:hover:bg-amber-500/[0.10] dark:active:bg-amber-500/[0.15] dark:border-amber-500/25 transition-all cursor-pointer flex flex-col gap-1.5 select-none group active:scale-[0.99] shadow-xs"
      title="Nhấp để xem bảng kê chi tiết và phiếu lương CVL"
    >
      {/* TẦNG 1: Tiêu đề + Tổng tiền thực nhận thêm + Tỷ lệ + Bảng kê */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
            <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
          </span>

          <span className="font-bold text-xs sm:text-sm tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
            +{formatVND(breakdown.totalAdditionalIncome)}
          </span>

          {breakdown.isUnlocked ? (
            <Tooltip
              title={`Đạt chuẩn: ${actualPct}% / ${targetPct}% Combo (${breakdown.combosSoldCount}/${breakdown.notComboLiveOrders} khách chưa combo) · Đã mở khóa 100% thưởng`}
            >
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                <span>🎯</span>
                <span className="tabular-nums">{actualPct}%</span>
              </span>
            </Tooltip>
          ) : (
            <Tooltip
              title={`Đang đạt: ${actualPct}% / ${targetPct}% Combo (${breakdown.combosSoldCount}/${breakdown.notComboLiveOrders} khách chưa combo) · Cần thêm ${neededCombos} combo để mở khóa thưởng`}
            >
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                <span>⚠️</span>
                <span className="tabular-nums">
                  {actualPct}% / {targetPct}%
                </span>
              </span>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 group-hover:text-amber-500 transition-colors shrink-0">
          <span className="hidden sm:inline">Bảng kê</span>
          <span className="text-xs transition-transform group-hover:translate-x-0.5">↗</span>
        </div>
      </div>

      {/* TẦNG 2: Lưới chip mini đều tăm tắp, không tràn viền */}
      <div className={`grid ${chipColsClass} gap-1.5 w-full`}>
        {/* 1. Lương giờ tăng +2k/h */}
        <Tooltip
          title={`Lương giờ (+2k/h): ${breakdown.isUnlocked ? `${record.regularHours || 0}h × 2.000đ = +${formatVND(breakdown.deltaHourlyWage)}` : 'Tạm khóa (chưa đạt chuẩn combo)'}`}
        >
          <div className="py-1 px-1 rounded-lg text-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25">
            <span className="text-[9px] text-sky-600 dark:text-sky-300 block leading-tight">🕒 Giờ</span>
            <span className="font-bold text-sky-600 dark:text-sky-400 tabular-nums text-[10px] sm:text-[11px] block leading-tight">
              {breakdown.isUnlocked ? formatChipAmount(breakdown.deltaHourlyWage) : '0đ'}
            </span>
          </div>
        </Tooltip>

        {/* 2. Tip tự tư vấn 90% */}
        <Tooltip
          title={`Tip tự tư vấn (90% Tip): Bảo lưu 90% (+20% phần tự tư vấn) = +${formatVND(breakdown.deltaTipBonus)}`}
        >
          <div className="py-1 px-1 rounded-lg text-center bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
            <span className="text-[9px] text-rose-600 dark:text-rose-300 block leading-tight">🧧 Tip</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums text-[10px] sm:text-[11px] block leading-tight">
              {formatChipAmount(breakdown.deltaTipBonus)}
            </span>
          </div>
        </Tooltip>

        {/* 3. Thưởng combo bậc thang */}
        <Tooltip
          title={`Thưởng Combo (${breakdown.combosSoldCount} gói bậc thang): ${breakdown.isUnlocked ? `+${formatVND(breakdown.comboBonusTotal)}` : 'Tạm khóa (chưa đạt chuẩn combo)'}`}
        >
          <div className="py-1 px-1 rounded-lg text-center bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
            <span className="text-[9px] text-purple-600 dark:text-purple-300 block leading-tight">📦 Gói</span>
            <span className="font-bold text-purple-600 dark:text-purple-400 tabular-nums text-[10px] sm:text-[11px] block leading-tight">
              {breakdown.isUnlocked ? formatChipAmount(breakdown.comboBonusTotal) : '0đ'}
            </span>
          </div>
        </Tooltip>

        {/* 4. Thưởng Serum Yeppeum (nếu có) */}
        {hasSerum && (
          <Tooltip
            title={`Thưởng Dưỡng Mi Yeppeum (${breakdown.serumsSoldCount || 0} cây): ${breakdown.isUnlocked ? `+${formatVND(breakdown.serumBonusTotal)}` : 'Tạm khóa (chưa đạt chuẩn combo)'}`}
          >
            <div className="py-1 px-1 rounded-lg text-center bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25">
              <span className="text-[9px] text-teal-600 dark:text-teal-300 block leading-tight">🧴 Serum</span>
              <span className="font-bold text-teal-600 dark:text-teal-400 tabular-nums text-[10px] sm:text-[11px] block leading-tight">
                {breakdown.isUnlocked ? formatChipAmount(breakdown.serumBonusTotal) : '0đ'}
              </span>
            </div>
          </Tooltip>
        )}

        {/* 5. Thưởng Thu nợ Combo (nếu có) */}
        {hasDebt && (
          <Tooltip
            title={`Thưởng Thu Nợ Combo (${breakdown.debtCollectionCount || 0} ca · ${formatVND(breakdown.debtCollectedAmount || 0)}): ${breakdown.isUnlocked ? `+${formatVND(breakdown.debtCollectionBonusTotal || 0)}` : 'Tạm khóa (chưa đạt chuẩn combo)'}`}
          >
            <div className="py-1 px-1 rounded-lg text-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="text-[9px] text-emerald-600 dark:text-emerald-300 block leading-tight">💳 Thu nợ</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-[10px] sm:text-[11px] block leading-tight">
                {breakdown.isUnlocked ? formatChipAmount(breakdown.debtCollectionBonusTotal || 0) : '0đ'}
              </span>
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
