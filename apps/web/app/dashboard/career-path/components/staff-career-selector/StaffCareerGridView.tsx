'use client';

import React from 'react';
import { Avatar } from 'antd';
import { Banana, Bug, Eye, Gem, HandCoins, Heart, ShieldCheck, Wallet } from 'lucide-react';
import type {
  BananaTransactionCategory,
  CareerProgressionConfig,
  CareerRole,
  CareerStaffSummary,
} from '@mos-lab/shared';
import { StaffRoleDropdown } from './StaffCareerRoleControls';
import {
  getBananaBalance,
  getBananaBalanceStatus,
  getBananaCountStatus,
  getComboStatus,
  getFixStatus,
  getHiStatus,
  getOrdersStatus,
  getQaAuditsCount,
  getQaStatus,
  getStaffBenchmarkReq,
  getStaffComboPercent,
  getStaffOverallStatus,
  getStaffTipPercent,
  getStatusBadgeClass,
  getStatusLabel,
  getTipStatus,
  resolveCareerThresholds,
} from './staffCareerMetrics';

interface StaffCareerGridViewProps {
  filteredStaff: CareerStaffSummary[];
  selectedStaffId: number | null;
  onSelectStaff: (staffId: number) => void;
  config?: CareerProgressionConfig;
  onSetRole?: (staffId: number, newRole: CareerRole) => Promise<void>;
  onOpenBananaDrawer?: (staffId: number, category: BananaTransactionCategory) => void;
}

export const StaffCareerGridView: React.FC<StaffCareerGridViewProps> = ({
  filteredStaff,
  selectedStaffId,
  onSelectStaff,
  config,
  onSetRole,
  onOpenBananaDrawer,
}) => {
  const {
    minOrdersConfig,
    maxFixRateConfig,
    minTipRatioAboveShop,
    minHiConfig,
    minBananaConfig,
    minComboConfig,
    minQaAuditsConfig,
  } = resolveCareerThresholds(config);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
      {filteredStaff.length === 0 ? (
        <div className="col-span-full py-6 text-center text-xs text-slate-400">
          Không tìm thấy nhân viên nào phù hợp
        </div>
      ) : (
        filteredStaff.map((staff) => {
          const isSelected = staff.id === selectedStaffId;
          const overallStatus = getStaffOverallStatus(staff, config);
          const tipPct = getStaffTipPercent(staff);
          const fixPct = Number(((staff.fixRate || 0) * 100).toFixed(1));
          const audits = getQaAuditsCount(staff);
          const hiPct = Math.round((staff.happinessIndex || 0.75) * 100);
          const balance = getBananaBalance(staff);

          const req = getStaffBenchmarkReq(staff, config);
          const targetOrders = req?.minOrders ?? minOrdersConfig;
          const targetFix = req?.maxFixRate ?? maxFixRateConfig;
          const targetMaxFixPct = Number((targetFix * 100).toFixed(1));
          const targetTipRatio = req?.minTipRatioAboveShop ?? minTipRatioAboveShop;
          const targetQaAudits = req?.minQaAudits ?? minQaAuditsConfig;
          const targetHi = req?.minHappinessIndex ?? minHiConfig;
          const targetHiPct = Math.round(targetHi * 100);
          const targetBanana = req?.minBananaCount ?? minBananaConfig;
          const targetCombo = req?.minSelfComboRate ?? minComboConfig;
          const targetComboPct = Number((targetCombo * 100).toFixed(1));
          const branchTipPct = ((staff.shopTipRate || staff.branchTipRate || 0.45) * 100).toFixed(1);
          const targetTipPct = Number(
            ((staff.shopTipRate || staff.branchTipRate || 0.45) * (1 + targetTipRatio) * 100).toFixed(1)
          );

          const sOrders = getOrdersStatus(staff.ordersCount || 0, targetOrders);
          const sFix = getFixStatus(staff.fixRate || 0, targetFix);
          const sTip = getTipStatus(staff, targetTipRatio);
          const sQa = getQaStatus(staff, targetQaAudits);
          const sHi = getHiStatus(staff.happinessIndex || 0.75, targetHi);
          const sBanana = getBananaCountStatus(staff.bananaCount || 0, targetBanana);
          const sCombo = getComboStatus(staff, targetCombo);

          return (
            <div
              key={staff.id}
              onClick={() => onSelectStaff(staff.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? overallStatus === 'passed'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/70 shadow-xs ring-2 ring-emerald-400/30'
                    : overallStatus === 'near'
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/70 shadow-xs ring-2 ring-amber-400/30'
                      : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-500/70 shadow-xs ring-2 ring-rose-400/30'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50/60 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar
                      src={staff.avatarUrl || undefined}
                      className={`bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-xs ring-2 transition-all ${
                        isSelected
                          ? overallStatus === 'passed'
                            ? 'ring-emerald-500 shadow-sm shadow-emerald-500/20'
                            : overallStatus === 'near'
                              ? 'ring-amber-500 shadow-sm shadow-amber-500/20'
                              : 'ring-rose-500 shadow-sm shadow-rose-500/20'
                          : 'ring-transparent'
                      }`}
                      size={32}
                    >
                      {staff.displayName.slice(0, 1).toUpperCase()}
                    </Avatar>
                    {isSelected && (
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ring-1 shadow-xs ${
                          overallStatus === 'passed'
                            ? 'bg-emerald-500 text-white ring-white dark:ring-slate-900'
                            : overallStatus === 'near'
                              ? 'bg-amber-500 text-white ring-white dark:ring-slate-900'
                              : 'bg-rose-500 text-white ring-white dark:ring-slate-900'
                        }`}
                        title={`Đang chọn · ${getStatusLabel(overallStatus)}`}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                      title={staff.displayName}
                    >
                      {staff.displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                      <span>@{staff.username.split('@')[0]}</span>
                      {staff.branchName && (
                        <>
                          <span>·</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">{staff.branchName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <StaffRoleDropdown staff={staff} compact onSetRole={onSetRole} />
              </div>

              {/* 7 Indicator Badges */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[10px]">
                <div
                  className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                    sOrders
                  )}`}
                  title={`Bộ mi: ${staff.ordersCount || 0}/${targetOrders} (90 ngày qua, chuẩn ≥ ${targetOrders} bộ) · ${getStatusLabel(sOrders)}`}
                >
                  <Eye className="w-2.5 h-2.5" />
                  <span>{staff.ordersCount || 0}</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                    sFix
                  )}`}
                  title={`Tỷ lệ sửa mi: ${fixPct}% (chuẩn ≤ ${targetMaxFixPct}%) · ${getStatusLabel(sFix)}`}
                >
                  <Bug className="w-2.5 h-2.5" />
                  <span>{fixPct}%</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                    sTip
                  )}`}
                  title={`Tỷ lệ tip ≥ 20K: ${tipPct}% (mục tiêu ≥ ${targetTipPct}% · TB: ${branchTipPct}%) · ${getStatusLabel(sTip)}`}
                >
                  <HandCoins className="w-2.5 h-2.5" />
                  <span>{tipPct}%</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                    sQa
                  )}`}
                  title={`Kiểm định QA: ${audits}/${targetQaAudits} lần/tháng (chuẩn ≥ ${targetQaAudits} lần) · ${getStatusLabel(sQa)}`}
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>
                    {audits}/{targetQaAudits}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                    sHi
                  )}`}
                  title={`Chỉ số Hạnh Phúc HI: ${hiPct}% (chuẩn ≥ ${targetHiPct}%) · ${getStatusLabel(sHi)}`}
                >
                  <Heart className="w-2.5 h-2.5" />
                  <span>{hiPct}%</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBananaDrawer?.(staff.id, 'CHECKIN');
                  }}
                  className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold hover:scale-105 active:scale-95 transition-transform cursor-pointer ${getStatusBadgeClass(
                    sBanana
                  )}`}
                  title={`${staff.bananaCount || 0}/${targetBanana} chuối Check-in (chuẩn ≥ ${targetBanana} 🍌) · ${getStatusLabel(sBanana)}`}
                >
                  <Banana className="w-2.5 h-2.5" />
                  <span>{staff.bananaCount || 0}</span>
                </button>
                <div
                  className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full border tabular-nums font-bold ${getStatusBadgeClass(
                    sCombo
                  )}`}
                  title={`Tỷ lệ bán Combo: ${getStaffComboPercent(staff)}% trên khách Not Combo Live (chuẩn ≥ ${targetComboPct}%) · ${getStatusLabel(sCombo)}`}
                >
                  <Gem className="w-2.5 h-2.5 text-pink-500 dark:text-pink-400" />
                  <span>{getStaffComboPercent(staff)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                <span className="text-slate-400">Ví chuối:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBananaDrawer?.(staff.id, 'ALL');
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold tabular-nums hover:scale-105 active:scale-95 transition-transform cursor-pointer ${getStatusBadgeClass(
                    getBananaBalanceStatus(balance)
                  )}`}
                  title="Bấm để xem sao kê ví chuối"
                >
                  <Wallet className="w-2.5 h-2.5" />
                  <span>{balance.toLocaleString('vi-VN')}</span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
