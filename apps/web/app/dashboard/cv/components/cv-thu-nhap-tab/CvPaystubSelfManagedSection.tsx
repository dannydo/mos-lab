'use client';

import { Progress, Tooltip, theme } from 'antd';
import dayjs from 'dayjs';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatComboTierBracketLabel, type CvPlusPaystubBreakdown } from '@mos-lab/shared';
import { CvFeather1Badge, FeatherSvg } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { StatusTag } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';

interface CvPaystubSelfManagedSectionProps {
  breakdown: CvPlusPaystubBreakdown;
}

/** Renders the self-managed CVL perks, combo conversion progress, and combo commission table inside the payslip modal. */
export function CvPaystubSelfManagedSection({ breakdown }: CvPaystubSelfManagedSectionProps) {
  const { token } = theme.useToken();
  const targetRate = breakdown.targetComboRate || 0.2;
  const progressPercent = Math.min(100, Math.round(((breakdown.actualComboRate || 0) / targetRate) * 100));

  return (
    <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-amber-950/15 dark:to-transparent space-y-4">
      {/* Header with Title and Eligibility Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/60 pb-3">
        <div className="flex items-center gap-2">
          <FeatherSvg className="w-6 h-6 text-amber-500" />
          <div>
            <div className="font-bold text-sm text-amber-900 dark:text-amber-200 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 flex-wrap">
                <span>ĐÃI NGỘ DÀNH RIÊNG CHO CHUYÊN VIÊN TỰ CHỦ (</span>
                <CvFeather1Badge featherClass="w-3 h-3 text-amber-500" />
                <span>)</span>
              </span>
              <StatusTag
                status="gold"
                label="Quyền Lợi Độc Quyền"
                className="font-bold uppercase tracking-wider text-[10px] border-amber-400"
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Chính sách đãi ngộ thăng tiến tự chủ theo Bộ quy tắc Kinh Thánh mOS (Điều răn CV-002)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {breakdown.isUnlocked ? (
            <StatusTag
              status="success"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label={
                <span className="inline-flex items-center gap-1">
                  <span>ĐÃ MỞ KHÓA 100% THƯỞNG</span>
                  <CvFeather1Badge featherClass="w-3 h-3 text-amber-500" />
                </span>
              }
              className="font-bold text-xs py-1 px-2.5 border-emerald-500"
            />
          ) : (
            <StatusTag
              status="warning"
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              label="CHƯA ĐẠT NGƯỠNG CHUYỂN ĐỔI COMBO"
              className="font-bold text-xs py-1 px-2.5 border-amber-500"
            />
          )}
        </div>
      </div>

      {/* Conversion Target & Progress Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-amber-200/70 dark:border-amber-900/40">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
          <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span>Tỷ lệ tự chốt Combo cá nhân:</span>
            <strong className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">
              {((breakdown.actualComboRate || 0) * 100).toFixed(1)}%
            </strong>
            <Tooltip title="Mẫu số chỉ đếm khách hàng không phải combo live. Combo bán cho khách combo live vẫn được cộng dồn vào số bán được (Ví dụ: 10 khách không combo bán được 2, 90 khách combo live bán được 1 => tỷ lệ 3/10 = 30%).">
              <span className="text-slate-400 cursor-help border-b border-dashed border-slate-400/50">
                {breakdown.notComboLiveOrders > 0
                  ? `(${breakdown.combosSoldCount || 0}/${breakdown.notComboLiveOrders} khách chưa có combo)`
                  : `(${breakdown.combosSoldCount || 0} combo / 0 khách chưa có combo)`}
              </span>
            </Tooltip>
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            Ngưỡng tối thiểu duy trì đãi ngộ:{' '}
            <strong className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              {(targetRate * 100).toFixed(0)}%
            </strong>
          </div>
        </div>

        <Progress
          percent={progressPercent}
          status={breakdown.isUnlocked ? 'success' : 'active'}
          strokeColor={breakdown.isUnlocked ? token.colorSuccess : token.colorWarning}
          format={() => (
            <span className="text-xs font-bold tabular-nums">
              {((breakdown.actualComboRate || 0) * 100).toFixed(1)}% / {(targetRate * 100).toFixed(0)}%
            </span>
          )}
        />
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 1. Lương giờ tăng +2k */}
        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Lương giờ (+2k/h)</span>
            <span className="text-amber-500 font-bold">🕒</span>
          </div>
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
            +{formatVND(breakdown.deltaHourlyWage || 0)}
          </div>
          <div className="text-[10px] text-slate-400">
            {breakdown.isUnlocked ? '27.5k/h vs 25.5k/h' : 'Chế tài: Về 25.5k/h'}
          </div>
        </div>

        {/* 2. Tip tự tư vấn (+20%) */}
        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Tip tự tư vấn (+20%)</span>
            <span className="text-emerald-500 font-bold">🧧</span>
          </div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            +{formatVND(breakdown.deltaTipBonus || 0)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 flex-wrap">
            <span>Hưởng trọn 90% tip (70% CV + 20%</span>
            <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-500" />
            <span>)</span>
          </div>
        </div>

        {/* 3. Thưởng Combo Bậc Thang */}
        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Thưởng Combo</span>
            <span className="text-blue-500 font-bold">📦</span>
          </div>
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums mt-1">
            +{formatVND(breakdown.comboBonusTotal || 0)}
          </div>
          <div className="text-[10px] text-slate-400">
            {breakdown.combosSoldCount || breakdown.comboDetails?.length || 0} đơn combo đã chốt
          </div>
        </div>

        {/* 4. Thưởng Dưỡng Mi Yeppeum */}
        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Thưởng Serum Yeppeum</span>
            <span className="text-purple-500 font-bold">🧴</span>
          </div>
          <div className="text-sm font-bold text-purple-600 dark:text-purple-400 tabular-nums mt-1">
            +{formatVND(breakdown.serumBonusTotal || 0)}
          </div>
          <div className="text-[10px] text-slate-400">{breakdown.serumsSoldCount || 0} chai (50k KM / 100k Gốc)</div>
        </div>
      </div>

      {/* Total Extra Received Banner */}
      <div className="flex items-center justify-between px-3 py-2 bg-amber-500/15 dark:bg-amber-950/40 rounded-lg border border-amber-400/40">
        <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 inline-flex items-center gap-1">
          <span>💰 Tổng thu nhập tăng thêm từ đãi ngộ</span>
          <FeatherSvg flip className="w-3.5 h-3.5 text-amber-500" />
          <span>CV:</span>
        </div>
        <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
          +{formatVND(breakdown.totalAdditionalIncome || 0)}
        </div>
      </div>

      {/* Combo Details Table if available */}
      {breakdown.comboDetails && breakdown.comboDetails.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            📋 Chi tiết các gói Combo tự tư vấn &amp; chốt thành công:
          </div>
          <div className="overflow-x-auto border border-amber-200/70 dark:border-amber-900/40 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-amber-100/60 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="py-1.5 px-2 text-center w-10">#</th>
                  <th className="py-1.5 px-2 text-left">Ngày</th>
                  <th className="py-1.5 px-2 text-left">Khách hàng</th>
                  <th className="py-1.5 px-3 text-left">Tên gói Combo</th>
                  <th className="py-1.5 px-2 text-right">Giá trị gói</th>
                  <th className="py-1.5 px-2 text-center">Bậc thang</th>
                  <th className="py-1.5 px-3 text-right">Tiền thưởng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/50 dark:divide-amber-900/30">
                {breakdown.comboDetails.map((item, idx) => {
                  const ladderTier = formatComboTierBracketLabel(item.price);
                  const isMultiComboOrder =
                    (item.comboCount ?? 1) > 1 && Array.isArray(item.comboItems) && item.comboItems.length > 1;
                  return (
                    <tr key={item.orderId || idx} className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20">
                      <td className="py-1 px-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-1 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap text-[11px]">
                        {item.orderDate ? dayjs(item.orderDate).format('DD/MM/YYYY') : '—'}
                      </td>
                      <td className="py-1 px-2 font-medium text-slate-800 dark:text-slate-200 text-[11px] whitespace-nowrap">
                        {item.customerName || 'Khách vãng lai'}
                      </td>
                      <td className="py-1 px-3 text-slate-700 dark:text-slate-300 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{item.comboName}</span>
                          {isMultiComboOrder && (
                            <span className="inline-flex items-center justify-center leading-none py-0.5 px-1.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              Gộp {item.comboCount} gói cùng lúc
                            </span>
                          )}
                        </div>
                        {isMultiComboOrder && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                            {item.comboItems!.map((sub) => `${sub.comboName} (${formatVND(sub.price)})`).join(' + ')}
                          </div>
                        )}
                      </td>
                      <td className="py-1 px-2 text-right tabular-nums text-slate-600 dark:text-slate-400 text-[11px]">
                        {formatVND(item.price)}
                      </td>
                      <td className="py-1 px-2 text-center">
                        <span className="inline-flex items-center justify-center leading-none py-1 px-2 rounded text-[10px] font-bold tabular-nums bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          {ladderTier}
                        </span>
                      </td>
                      <td className="py-1 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                        +{formatVND(item.bonus)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
