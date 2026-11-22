'use client';

import React from 'react';
import { Avatar, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Banana, Bug, Eye, Gem, HandCoins, Heart, ShieldCheck } from 'lucide-react';
import type {
  BananaTransactionCategory,
  CareerPeriod,
  CareerProgressionConfig,
  CareerRole,
  CareerStaffSummary,
} from '@mos-lab/shared';
import { StaffRoleDropdown } from './StaffCareerRoleControls';
import {
  getBananaCountStatus,
  getComboStatus,
  getFixStatus,
  getHiStatus,
  getOrdersStatus,
  getPeriodLabel,
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

interface BuildStaffCareerColumnsParams {
  selectedStaffId: number | null;
  period: CareerPeriod;
  config?: CareerProgressionConfig;
  onSetRole?: (staffId: number, newRole: CareerRole) => Promise<void>;
  onOpenBananaDrawer?: (staffId: number, category: BananaTransactionCategory) => void;
}

export function buildStaffCareerColumns({
  selectedStaffId,
  period,
  config,
  onSetRole,
  onOpenBananaDrawer,
}: BuildStaffCareerColumnsParams): ColumnsType<CareerStaffSummary> {
  const {
    minOrdersConfig,
    maxFixRateConfig,
    minTipRatioAboveShop,
    minHiConfig,
    minBananaConfig,
    minComboConfig,
    minQaAuditsConfig,
  } = resolveCareerThresholds(config);
  const currentPeriodLabel = getPeriodLabel(period);

  return [
    {
      title: 'Chuyên Viên',
      key: 'staff',
      minWidth: 160,
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      render: (_, staff) => {
        const isSelected = staff.id === selectedStaffId;
        const overallStatus = getStaffOverallStatus(staff, config);
        return (
          <div className="flex items-center gap-2.5 py-0.5">
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
                    : 'ring-white/40 dark:ring-slate-800'
                }`}
                size={34}
              >
                {staff.displayName.slice(0, 1).toUpperCase()}
              </Avatar>
              {isSelected && (
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ring-2 shadow-xs transition-transform scale-105 ${
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-xs truncate ${
                    isSelected
                      ? overallStatus === 'passed'
                        ? 'font-black text-emerald-600 dark:text-emerald-400'
                        : overallStatus === 'near'
                          ? 'font-black text-amber-600 dark:text-amber-400'
                          : 'font-black text-rose-600 dark:text-rose-400'
                      : 'font-bold text-slate-800 dark:text-slate-100'
                  }`}
                  title={staff.displayName}
                >
                  {staff.displayName}
                </span>
                <StaffRoleDropdown staff={staff} compact onSetRole={onSetRole} />
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
        );
      },
    },
    {
      title: (
        <Tooltip title={`Bộ mi: Số ca hoàn thành trong 90 ngày qua (Chuẩn ≥ ${minOrdersConfig} bộ)`}>
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'ordersCount',
      dataIndex: 'ordersCount',
      width: 64,
      align: 'center',
      defaultSortOrder: 'descend',
      sorter: (a, b) => (a.ordersCount || 0) - (b.ordersCount || 0),
      render: (ordersCount: number, staff: CareerStaffSummary) => {
        const req = getStaffBenchmarkReq(staff, config);
        const targetOrders = req?.minOrders ?? minOrdersConfig;
        const count = ordersCount || 0;
        const status = getOrdersStatus(count, targetOrders);
        return (
          <Tooltip
            title={`${count}/${targetOrders} bộ mi (90 ngày qua, chuẩn ≥ ${targetOrders} bộ) · ${getStatusLabel(status)}`}
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {count}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip
          title={`Fix: Tỷ lệ sửa mi / bảo hành trong ${currentPeriodLabel.toLowerCase()} (Chuẩn ≤ ${(maxFixRateConfig * 100).toFixed(1)}%)`}
        >
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Bug className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'fixRate',
      dataIndex: 'fixRate',
      width: 64,
      align: 'center',
      sorter: (a, b) => (a.fixRate || 0) - (b.fixRate || 0),
      render: (fixRate: number, staff: CareerStaffSummary) => {
        const req = getStaffBenchmarkReq(staff, config);
        const targetMaxFix = req?.maxFixRate ?? maxFixRateConfig;
        const fixPct = Number(((fixRate || 0) * 100).toFixed(1));
        const maxFixPct = Number((targetMaxFix * 100).toFixed(1));
        const status = getFixStatus(fixRate || 0, targetMaxFix);
        return (
          <Tooltip
            title={`Tỷ lệ bảo hành / sửa: ${fixPct}% trong ${currentPeriodLabel.toLowerCase()} (chuẩn ≤ ${maxFixPct}%) · ${getStatusLabel(status)}`}
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {fixPct}%
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip
          title={`Tip: Tỷ lệ khách tip ≥ 20K trong ${currentPeriodLabel.toLowerCase()} (Chuẩn vượt ${(minTipRatioAboveShop * 100).toFixed(0)}% TB chi nhánh)`}
        >
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <HandCoins className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'tip',
      width: 66,
      align: 'center',
      sorter: (a, b) => getStaffTipPercent(a) - getStaffTipPercent(b),
      render: (_, staff) => {
        const req = getStaffBenchmarkReq(staff, config);
        const targetTipRatio = req?.minTipRatioAboveShop ?? minTipRatioAboveShop;
        const tipPct = getStaffTipPercent(staff);
        const status = getTipStatus(staff, targetTipRatio);
        const diffShop = Number(((staff.tipRatioAboveShop || 0) * 100).toFixed(0));
        const branchLabel = staff.branchName || 'Chi nhánh';
        const branchTipPct = ((staff.shopTipRate || staff.branchTipRate || 0.45) * 100).toFixed(1);
        const targetTipPct = Number(
          ((staff.shopTipRate || staff.branchTipRate || 0.45) * (1 + targetTipRatio) * 100).toFixed(1)
        );
        return (
          <Tooltip
            title={`Tip (${currentPeriodLabel}): ${tipPct}% (mục tiêu ≥ ${targetTipPct}% · TB ${branchLabel}: ${branchTipPct}%, vượt chuẩn ${
              diffShop >= 0 ? `+${diffShop}%` : `${diffShop}%`
            } so với TB) · ${getStatusLabel(status)}`}
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {tipPct}%
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip
          title={`QA & QC: Kiểm định định kỳ trong ${currentPeriodLabel.toLowerCase()} (Chuẩn ≥ ${minQaAuditsConfig} lần/tháng và không vi phạm FAILED)`}
        >
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'qaAudits',
      width: 68,
      align: 'center',
      sorter: (a, b) => getQaAuditsCount(a) - getQaAuditsCount(b),
      render: (_, staff) => {
        const req = getStaffBenchmarkReq(staff, config);
        const baseQa = req?.minQaAudits ?? minQaAuditsConfig;
        const targetQaAudits = period === 'last_3_months' ? baseQa * 3 : baseQa;
        const audits = getQaAuditsCount(staff);
        const status = getQaStatus(staff, targetQaAudits);
        return (
          <Tooltip
            title={
              staff.hasFailedQaAudit
                ? '✕ Có biên bản vi phạm QA'
                : `${audits}/${targetQaAudits} lần kiểm định tác phong & vệ sinh trong ${currentPeriodLabel.toLowerCase()} (chuẩn ≥ ${targetQaAudits} lần) · ${getStatusLabel(status)}`
            }
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {audits}/{targetQaAudits}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip
          title={`HI: Chỉ số Hạnh Phúc trong ${currentPeriodLabel.toLowerCase()} (Chuẩn ≥ ${(minHiConfig * 100).toFixed(0)}%)`}
        >
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Heart className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </span>
        </Tooltip>
      ),
      key: 'hi',
      dataIndex: 'happinessIndex',
      width: 62,
      align: 'center',
      sorter: (a, b) => (a.happinessIndex || 0) - (b.happinessIndex || 0),
      render: (happinessIndex: number, staff: CareerStaffSummary) => {
        const req = getStaffBenchmarkReq(staff, config);
        const targetHi = req?.minHappinessIndex ?? minHiConfig;
        const targetHiPct = Math.round(targetHi * 100);
        const hiPct = Math.round((happinessIndex || 0.75) * 100);
        const status = getHiStatus(happinessIndex || 0.75, targetHi);
        return (
          <Tooltip
            title={`Chỉ số Hạnh Phúc HI trong ${currentPeriodLabel.toLowerCase()}: ${hiPct}% (chuẩn ≥ ${targetHiPct}%) · ${getStatusLabel(status)}`}
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {hiPct}%
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip
          title={`Chuối yêu thương: Check-in nhận từ đồng đội trong ${currentPeriodLabel.toLowerCase()} (Chuẩn ≥ ${minBananaConfig} 🍌)`}
        >
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Banana className="w-4 h-4 text-amber-500" />
          </span>
        </Tooltip>
      ),
      key: 'bananaCount',
      dataIndex: 'bananaCount',
      width: 66,
      align: 'center',
      sorter: (a, b) => (a.bananaCount || 0) - (b.bananaCount || 0),
      render: (bananaCount: number, staff: CareerStaffSummary) => {
        const req = getStaffBenchmarkReq(staff, config);
        const baseBanana = req?.minBananaCount ?? minBananaConfig;
        const targetBanana = period === 'last_3_months' ? baseBanana * 3 : baseBanana;
        const count = bananaCount || 0;
        const status = getBananaCountStatus(count, targetBanana);
        return (
          <Tooltip
            title={`${count}/${targetBanana} chuối Check-in tính điểm (chuẩn ≥ ${targetBanana} 🍌) · ${getStatusLabel(status)} (Nhấn để xem danh sách)`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBananaDrawer?.(staff.id, 'CHECKIN');
              }}
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border hover:scale-105 active:scale-95 transition-transform cursor-pointer ${getStatusBadgeClass(
                status
              )}`}
            >
              {count}
            </button>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip
          title={`Combo: Tỷ lệ chốt Combo trên khách Not Combo Live (Ải Trùm Cuối · Chuẩn ≥ ${(minComboConfig * 100).toFixed(1)}%)`}
        >
          <span className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Gem className="w-4 h-4 text-pink-500 dark:text-pink-400" />
          </span>
        </Tooltip>
      ),
      key: 'comboRate',
      dataIndex: 'selfComboRate',
      width: 66,
      align: 'center',
      sorter: (a, b) => (a.selfComboRate || 0) - (b.selfComboRate || 0),
      render: (_, staff) => {
        const req = getStaffBenchmarkReq(staff, config);
        const targetCombo = req?.minSelfComboRate ?? minComboConfig;
        const targetComboPct = Number((targetCombo * 100).toFixed(1));
        const comboPct = getStaffComboPercent(staff);
        const status = getComboStatus(staff, targetCombo);
        return (
          <Tooltip
            title={`Tỷ lệ bán Combo: ${comboPct}% trên khách Not Combo Live (chuẩn ≥ ${targetComboPct}%) · ${getStatusLabel(status)}`}
          >
            <span
              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border ${getStatusBadgeClass(
                status
              )}`}
            >
              {comboPct}%
            </span>
          </Tooltip>
        );
      },
    },
  ];
}
