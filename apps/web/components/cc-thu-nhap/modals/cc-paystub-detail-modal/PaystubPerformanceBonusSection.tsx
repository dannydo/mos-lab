'use client';

import React from 'react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { formatVND } from '~/lib/format-utils';
import { formatRoundedVnd } from './paystubHelpers';

export interface PaystubPerformanceBonusSectionProps {
  record: CcPaystubRecord;
}

export function PaystubPerformanceBonusSection({ record }: PaystubPerformanceBonusSectionProps) {
  return (
    <>
      <tr className="bg-purple-500/10 dark:bg-purple-950/25 border-y border-purple-500/30">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-purple-800 dark:text-purple-200 uppercase tracking-wider text-[11px]"
        >
          ⭐ III. Thưởng hiệu suất tư vấn, Bán hàng & Tips
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          12
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Lượt check-in xoay ca</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {record.checkinCount || 0} lượt check-in phục vụ
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{record.checkinCount || 0}</td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
          13
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
          Thưởng CC Xoay (Được nhận)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-[11px] font-normal">
          {(record.ccXoayHoldBonus || 0) > 0
            ? `Thưởng gốc ${formatVND(record.rawCcXoayBonus || 0)}đ từ ${record.checkinCount} lượt; cap 150% Daily Bonus, on hold ${formatVND(record.ccXoayHoldBonus || 0)}đ`
            : `Bóc tách ${record.checkinCount} lượt check-in`}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
          +{formatRoundedVnd(record.ccXoayBonus)}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-emerald-500/5 dark:bg-emerald-950/10">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-mono">
          14
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-emerald-700 dark:text-emerald-300">
          Thưởng Bán Combo & Sản Phẩm
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 text-[11px] font-normal">
          {record.comboCount || 0} combo + {record.productCount || 0} sản phẩm
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
          +{formatRoundedVnd(record.comboProductBonus)}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
          15
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
          Thưởng CC Tip (20% Tip Share)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 text-[11px]">
          Thực nhận 20% tip từ {record.tippedVisitsCount || 0} lượt khách cho (ngưỡng &ge; 20k)
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
          +{formatRoundedVnd(record.ccTipBonus)}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-sky-600 dark:text-sky-400 font-mono">
          16
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
          Thưởng CT Kim Cương (Giới thiệu KH)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          Giới thiệu {record.diamondCount || 0} khách hàng mới
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-sky-600 dark:text-sky-400">
          +{formatRoundedVnd(record.diamondBonus)}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          17
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Thưởng Nóng Minigame & Points</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          Vượt mốc minigame tuần & vòng quay
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">+{formatRoundedVnd(record.minigameBonus)}</td>
      </tr>

      {record.trainingMentorshipDetails &&
        record.trainingMentorshipDetails.length > 0 &&
        record.trainingMentorshipDetails.map((detail, idx) => {
          const comboPct = (detail.actualComboRate * 100).toFixed(1);
          const thresholdPct = Math.round(detail.minComboRateThreshold * 100);
          const sharePct = Math.round(detail.menteeBonusShareRate * 100);
          return (
            <tr
              key={detail.pairId || idx}
              className={
                detail.isUnlocked
                  ? 'bg-amber-500/10 dark:bg-amber-950/25 font-semibold'
                  : 'bg-rose-500/5 dark:bg-rose-950/15'
              }
            >
              <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                17.{idx + 1}
              </td>
              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-amber-800 dark:text-amber-200">
                <div className="flex flex-wrap items-center gap-1">
                  <span>Thưởng Đào Tạo</span>
                  <CvFeather1Badge className="text-[11px] text-amber-500" />
                  <span>{detail.menteeDisplayName}</span>
                </div>
                <div className="text-[10px] font-normal tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                  Kỳ: {detail.startDate} &rarr; {detail.endDate}
                </div>
              </td>
              <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px] font-normal">
                <div className="space-y-0.5">
                  <div
                    className={
                      detail.isUnlocked
                        ? 'font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums'
                        : 'font-semibold text-rose-600 dark:text-rose-400 tabular-nums'
                    }
                  >
                    Tỷ lệ Combo Mentee: {comboPct}% ({detail.combosSoldCount}/{detail.notComboLiveOrders} khách Not
                    Live) &bull;{' '}
                    {detail.isUnlocked ? `Đạt chuẩn >= ${thresholdPct}%` : `Chưa đạt ${thresholdPct}% (Nhận 0đ)`}
                  </div>
                  <div className="text-[10.5px] text-slate-600 dark:text-slate-300 tabular-nums">
                    Thu nhập tăng thêm của {detail.menteeDisplayName}:{' '}
                    <strong>+{formatVND(detail.menteeTotalAdditionalIncome)}đ</strong> (+2k/h:{' '}
                    {formatVND(detail.menteeDeltaHourlyWage)}đ &bull; +20% Tip: {formatVND(detail.menteeDeltaTipBonus)}đ
                    &bull; Combo: {formatVND(detail.menteeComboBonusTotal)}đ &bull; Dưỡng mi:{' '}
                    {formatVND(detail.menteeSerumBonusTotal)}đ)
                  </div>
                  {detail.isUnlocked ? (
                    <div className="text-[10.5px] text-amber-700 dark:text-amber-300 tabular-nums font-medium">
                      Công thức Mentor: {formatVND(detail.mentorFixedEarned)}đ cứng + {sharePct}% &times;{' '}
                      {formatVND(detail.menteeTotalAdditionalIncome)}đ = +{formatVND(detail.mentorTotalBonus)}đ
                    </div>
                  ) : (
                    <div className="text-[10px] text-rose-600/90 dark:text-rose-400/90">
                      Mentee dưới ngưỡng {thresholdPct}% bán gói: Mentor không nhận 1M cứng và 50% thưởng
                    </div>
                  )}
                </div>
              </td>
              <td
                className={`py-2 px-3 text-right tabular-nums font-bold ${
                  detail.isUnlocked ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {detail.isUnlocked ? `+${formatRoundedVnd(detail.mentorTotalBonus)}` : '0đ'}
              </td>
            </tr>
          );
        })}
    </>
  );
}
