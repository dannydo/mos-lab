'use client';

import React from 'react';
import { Avatar } from 'antd';
import {
  Banana,
  Bug,
  Check,
  ChevronRight,
  Eye,
  Gauge,
  HandCoins,
  HardHat,
  Heart,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { CareerRole, CareerStaffSummary } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { LashIcon, WingRoleLabel } from '../IslandGameIcon';
import { type MobileStaffCardComputedMetrics, getMobileBadgeClass } from './mobileStaffSheetTypesAndHelpers';

const MobileStaffRoleBadge: React.FC<{ role: CareerRole }> = ({ role }) => {
  switch (role) {
    case 'KTV':
      return (
        <StatusTag
          status="default"
          label={
            <span className="inline-flex items-center gap-1">
              <HardHat className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>KTV</span>
            </span>
          }
          className="tabular-nums font-semibold m-0 text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        />
      );
    case 'CV':
      return (
        <StatusTag
          status="processing"
          label={
            <span className="inline-flex items-center gap-1">
              <LashIcon size={12} className="text-pink-600 dark:text-pink-400 shrink-0 inline-block" />
              <span>CV</span>
            </span>
          }
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/40"
        />
      );
    case 'CV_PLUS':
      return (
        <StatusTag
          status="purple"
          label={<WingRoleLabel text="CVL" iconSize={11} />}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40"
        />
      );
    case 'CV_PLUS_PLUS':
      return (
        <StatusTag
          status="gold"
          label={<WingRoleLabel text="CVLL" iconSize={11} />}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40"
        />
      );
    default:
      return <StatusTag status="default" label={role} className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0" />;
  }
};

interface MobileStaffCareerCardProps {
  staff: CareerStaffSummary;
  metrics: MobileStaffCardComputedMetrics;
  isSelected: boolean;
  isHighlighted: boolean;
  selectedRef?: React.RefObject<HTMLDivElement | null>;
  onClick: (staffId: number) => void;
}

export const MobileStaffCareerCard: React.FC<MobileStaffCareerCardProps> = ({
  staff,
  metrics,
  isSelected,
  isHighlighted,
  selectedRef,
  onClick,
}) => {
  const {
    overallStatus,
    tipRate,
    fixRate,
    qaAudits,
    comboRate,
    targetOrders,
    targetMaxFixPct,
    targetTipRatio,
    targetQaAudits,
    targetComboPct,
    targetBanana,
    sOrders,
    sFix,
    sTip,
    sQa,
    sCombo,
    sBanana,
  } = metrics;

  return (
    <div
      ref={isSelected ? selectedRef : undefined}
      data-staff-id={staff.id}
      onClick={() => onClick(staff.id)}
      className={`group relative p-3 rounded-2xl transition-all duration-200 select-none cursor-pointer active:scale-[0.98] ${
        isSelected || isHighlighted
          ? 'border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40 ring-2 ring-emerald-500/25 shadow-md shadow-emerald-500/15'
          : 'border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
      }`}
    >
      {/* Header: Avatar, Name, Role, Branch & Selected Status */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0">
            <Avatar
              src={staff.avatarUrl || undefined}
              className={`bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-black text-xs ring-2 transition-all ${
                isSelected
                  ? 'ring-emerald-500 shadow-sm shadow-emerald-500/30'
                  : overallStatus === 'passed'
                    ? 'ring-emerald-500'
                    : overallStatus === 'near'
                      ? 'ring-amber-500'
                      : 'ring-rose-500'
              }`}
              size={42}
            >
              {staff.displayName.slice(0, 1).toUpperCase()}
            </Avatar>

            {isSelected ? (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-black shadow-xs">
                ✓
              </span>
            ) : (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  overallStatus === 'passed'
                    ? 'bg-emerald-500'
                    : overallStatus === 'near'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
              />
            )}
          </div>

          {/* Name & Branch */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-xs truncate ${
                  isSelected
                    ? 'font-black text-emerald-700 dark:text-emerald-300'
                    : 'font-extrabold text-slate-900 dark:text-white'
                }`}
              >
                {staff.displayName}
              </span>
              <MobileStaffRoleBadge role={staff.careerRole} />
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <span>@{staff.username.split('@')[0]}</span>
              {staff.branchName && (
                <>
                  <span>·</span>
                  <span className="text-slate-500 dark:text-slate-300 font-medium">{staff.branchName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Status Badge */}
        <div className="shrink-0">
          {isSelected ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-black shadow-xs tracking-tight">
              <Check className="w-3 h-3" />
              <span>ĐANG CHỌN</span>
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors flex items-center gap-0.5">
              <span>Chọn</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* 6-Metrics Mini Grid with Lucide Icons */}
      <div className="grid grid-cols-6 gap-1 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-center font-bold tabular-nums">
        {/* 1. Bộ mi */}
        <div
          className={`rounded-lg py-1 border transition-all ${getMobileBadgeClass(sOrders)}`}
          title={`Bộ mi: ${staff.ordersCount || 0}/${targetOrders} (90 ngày qua, chuẩn ≥ ${targetOrders} bộ)`}
        >
          <div className="text-[8px] opacity-75 font-sans leading-none mb-0.5">Bộ mi</div>
          <div className="flex items-center justify-center gap-0.5 truncate px-0.5">
            <Eye className="w-2.5 h-2.5 shrink-0" />
            <span>{staff.ordersCount || 0}</span>
          </div>
        </div>

        {/* 2. Sửa / Bảo hành */}
        <div
          className={`rounded-lg py-1 border transition-all ${getMobileBadgeClass(sFix)}`}
          title={`Tỷ lệ sửa mi: ${fixRate}% (chuẩn ≤ ${targetMaxFixPct}%)`}
        >
          <div className="text-[8px] opacity-75 font-sans leading-none mb-0.5">Fix</div>
          <div className="flex items-center justify-center gap-0.5 truncate px-0.5">
            <Bug className="w-2.5 h-2.5 shrink-0" />
            <span>{fixRate}%</span>
          </div>
        </div>

        {/* 3. Tip ≥ 20K */}
        <div
          className={`rounded-lg py-1 border transition-all ${getMobileBadgeClass(sTip)}`}
          title={`Tỷ lệ tip ≥ 20K: ${tipRate}% (chuẩn vượt ${(targetTipRatio * 100).toFixed(0)}% TB chi nhánh)`}
        >
          <div className="text-[8px] opacity-75 font-sans leading-none mb-0.5">Tip</div>
          <div className="flex items-center justify-center gap-0.5 truncate px-0.5">
            <HandCoins className="w-2.5 h-2.5 shrink-0" />
            <span>{tipRate}%</span>
          </div>
        </div>

        {/* 4. Audit QA */}
        <div
          className={`rounded-lg py-1 border transition-all ${getMobileBadgeClass(sQa)}`}
          title={`Audit QA hàng tuần: ${qaAudits}/${targetQaAudits} (chuẩn ≥ ${targetQaAudits} lần/tháng)`}
        >
          <div className="text-[8px] opacity-75 font-sans leading-none mb-0.5">QA</div>
          <div className="flex items-center justify-center gap-0.5 truncate px-0.5">
            <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
            <span>
              {qaAudits}/{targetQaAudits}
            </span>
          </div>
        </div>

        {/* 5. Combo & SP */}
        <div
          className={`rounded-lg py-1 border transition-all ${getMobileBadgeClass(sCombo)}`}
          title={`Tỷ lệ Combo & SP: ${comboRate}% (chuẩn ≥ ${targetComboPct}%)`}
        >
          <div className="text-[8px] opacity-75 font-sans leading-none mb-0.5">Combo</div>
          <div className="flex items-center justify-center gap-0.5 truncate px-0.5">
            <Heart className="w-2.5 h-2.5 shrink-0" />
            <span>{comboRate}%</span>
          </div>
        </div>

        {/* 6. Chuối */}
        <div
          className={`rounded-lg py-1 border transition-all ${getMobileBadgeClass(sBanana)}`}
          title={`Chuối Check-in: ${staff.bananaCount || 0}/${targetBanana} 🍌 (chuẩn ≥ ${targetBanana})`}
        >
          <div className="text-[8px] opacity-75 font-sans leading-none mb-0.5">Chuối</div>
          <div className="flex items-center justify-center gap-0.5 truncate px-0.5">
            <Banana className="w-2.5 h-2.5 shrink-0" />
            <span>{staff.bananaCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Hourly Productivity Strip (SPH & Revenue/Hour) */}
      {(staff.actualWorkingHours ?? staff.productivity?.actualWorkingHours ?? 0) > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2 text-[10px] tabular-nums">
          <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300 font-bold">
            <Gauge className="w-3 h-3 text-sky-500 shrink-0" />
            <span>SPH: {(staff.servicesPerHour ?? staff.productivity?.servicesPerHour ?? 0).toFixed(2)} lượt/h</span>
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold">
            <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>
              DT/h:{' '}
              {Math.round((staff.revenuePerHour ?? staff.productivity?.revenuePerHour ?? 0) / 1000).toLocaleString(
                'vi-VN'
              )}
              K
            </span>
          </span>
        </div>
      )}
    </div>
  );
};
