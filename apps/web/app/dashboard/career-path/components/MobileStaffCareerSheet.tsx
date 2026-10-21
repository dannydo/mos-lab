'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Avatar } from 'antd';
import {
  Search,
  X,
  Check,
  Eye,
  Bug,
  HandCoins,
  ShieldCheck,
  Heart,
  Banana,
  ChevronRight,
  UserCheck,
  HardHat,
  Feather,
  Gem,
  Wallet,
} from 'lucide-react';
import { StatusTag } from '../../../../components/ui';
import { WingRoleLabel, LashIcon } from './IslandGameIcon';
import type { CareerStaffSummary, CareerRole, CareerProgressionConfig } from '@mos-lab/shared';

export interface MobileStaffCareerSheetProps {
  staffList: CareerStaffSummary[];
  selectedStaffId: number | null;
  onSelectStaff: (staffId: number) => void;
  config?: CareerProgressionConfig;
  onClose: () => void;
}

type MetricStatus = 'passed' | 'near' | 'failed';

const ROLE_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'CV', label: 'CV' },
  { key: 'CV_PLUS', label: '🪶 CV' },
  { key: 'CV_PLUS_PLUS', label: '🪶 CV 🪶' },
  { key: 'KTV', label: 'KTV' },
];

export const MobileStaffCareerSheet: React.FC<MobileStaffCareerSheetProps> = ({
  staffList,
  selectedStaffId,
  onSelectStaff,
  config,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [highlightedId, setHighlightedId] = useState<number | null>(selectedStaffId);
  const selectedRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Benchmarks from config
  const cvReq = config?.cvToCvPlus || config?.cvToCc;
  const minOrdersConfig = cvReq?.minOrders ?? 330;
  const maxFixRateConfig = cvReq?.maxFixRate ?? 0.015;
  const minTipRatioAboveShop = cvReq?.minTipRatioAboveShop ?? 0.05;
  const minBananaConfig = cvReq?.minBananaCount ?? 20;
  const minComboConfig = cvReq?.minSelfComboRate ?? 0.2;
  const minQaAuditsConfig = cvReq?.minQaAudits ?? 4;
  const minHiConfig = cvReq?.minHappinessIndex ?? 0.7;

  const getStaffBenchmarkReq = (staff?: CareerStaffSummary) => {
    if (staff?.careerRole === 'CV_PLUS') {
      return config?.cvPlusToCvPlusPlus || config?.cvToCvPlus || config?.cvToCc;
    }
    return config?.cvToCvPlus || config?.cvToCc;
  };

  // Metric calculation helpers
  const getStaffTipPercent = (staff: CareerStaffSummary): number => {
    if (typeof staff.staffTipRate === 'number') {
      return Number((staff.staffTipRate * 100).toFixed(1));
    }
    if (staff.ordersCount && staff.totalTip) {
      const raw = Math.min(0.65, Math.max(0.2, (staff.totalTip / (staff.ordersCount * 38000)) * 0.45));
      return Number((raw * 100).toFixed(1));
    }
    return 0;
  };

  const getQaAuditsCount = (staff: CareerStaffSummary): number => {
    if (typeof staff.qaAuditsCount === 'number') return staff.qaAuditsCount;
    if (typeof staff.weeklyQaAuditRate === 'number') return Math.round(staff.weeklyQaAuditRate * 4);
    return 0;
  };

  const getBananaBalance = (staff: CareerStaffSummary): number => {
    return typeof staff.bananaBalance === 'number' ? staff.bananaBalance : 0;
  };

  const getStaffComboPercent = (staff: CareerStaffSummary): number => {
    return Number(((staff.selfComboRate || 0) * 100).toFixed(1));
  };

  const getOrdersStatus = (orders: number, targetOrders = minOrdersConfig): MetricStatus => {
    if (orders >= targetOrders) return 'passed';
    if (orders >= Math.round(targetOrders * 0.8)) return 'near';
    return 'failed';
  };

  const getFixStatus = (fixRate: number, targetMaxFix = maxFixRateConfig): MetricStatus => {
    const fixPct = Number(((fixRate || 0) * 100).toFixed(1));
    const maxFixPct = Number((targetMaxFix * 100).toFixed(1));
    if (fixPct <= maxFixPct) return 'passed';
    if (fixPct <= maxFixPct + 0.5) return 'near';
    return 'failed';
  };

  const getTipStatus = (staff: CareerStaffSummary, targetRatioAboveShop = minTipRatioAboveShop): MetricStatus => {
    const tipPct = getStaffTipPercent(staff);
    const branchTipRate = staff.shopTipRate || staff.branchTipRate || 0.45;
    const targetTipPct = Number((branchTipRate * (1 + targetRatioAboveShop) * 100).toFixed(1));
    const nearTipPct = Number((branchTipRate * (1 + targetRatioAboveShop * 0.5) * 100).toFixed(1));
    if (tipPct >= targetTipPct) return 'passed';
    if (tipPct >= nearTipPct) return 'near';
    return 'failed';
  };

  const getQaStatus = (staff: CareerStaffSummary, targetAudits = minQaAuditsConfig): MetricStatus => {
    if (staff.hasFailedQaAudit) return 'failed';
    const audits = getQaAuditsCount(staff);
    if (audits >= targetAudits) return 'passed';
    if (audits >= Math.max(1, targetAudits - 1)) return 'near';
    return 'failed';
  };

  const getComboStatus = (staff: CareerStaffSummary, targetCombo = minComboConfig): MetricStatus => {
    const comboPct = getStaffComboPercent(staff);
    const targetComboPct = Number((targetCombo * 100).toFixed(1));
    if (comboPct >= targetComboPct) return 'passed';
    if (comboPct >= targetComboPct * 0.7) return 'near';
    return 'failed';
  };

  const getBananaStatus = (count: number, targetBanana = minBananaConfig): MetricStatus => {
    if (count >= targetBanana) return 'passed';
    if (count >= Math.round(targetBanana * 0.75)) return 'near';
    return 'failed';
  };

  const getHiStatus = (hi: number, targetHi = minHiConfig): MetricStatus => {
    const hiPct = Math.round((hi || 0.75) * 100);
    const targetHiPct = Math.round(targetHi * 100);
    if (hiPct >= targetHiPct) return 'passed';
    if (hiPct >= targetHiPct - 5) return 'near';
    return 'failed';
  };

  const getStaffOverallStatus = (staff: CareerStaffSummary): MetricStatus => {
    if (['CV_PLUS', 'CV_PLUS_PLUS', 'MASTER_TECH'].includes(staff.careerRole)) {
      return 'passed';
    }

    const req = getStaffBenchmarkReq(staff);
    const targetOrders = req?.minOrders ?? minOrdersConfig;
    const targetFix = req?.maxFixRate ?? maxFixRateConfig;
    const targetTip = req?.minTipRatioAboveShop ?? minTipRatioAboveShop;
    const targetQa = req?.minQaAudits ?? minQaAuditsConfig;
    const targetBanana = req?.minBananaCount ?? minBananaConfig;
    const targetCombo = req?.minSelfComboRate ?? minComboConfig;

    const sOrders = getOrdersStatus(staff.ordersCount || 0, targetOrders);
    const sFix = getFixStatus(staff.fixRate || 0, targetFix);
    const sTip = getTipStatus(staff, targetTip);
    const sQa = getQaStatus(staff, targetQa);
    const sCombo = getComboStatus(staff, targetCombo);
    const sBanana = getBananaStatus(staff.bananaCount || 0, targetBanana);

    const list = [sOrders, sFix, sTip, sQa, sCombo, sBanana];
    const passed = list.filter((s) => s === 'passed').length;
    const failed = list.filter((s) => s === 'failed').length;

    if (passed >= 4 && failed <= 1) return 'passed';
    if (failed >= 4 || passed < 2) return 'failed';
    return 'near';
  };

  const getBadgeClass = (status: MetricStatus): string => {
    switch (status) {
      case 'passed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'near':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'failed':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
  };

  const getRoleBadge = (role: CareerRole) => {
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
            label={<WingRoleLabel text="🪶 CV" iconSize={11} />}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40"
          />
        );
      case 'CV_PLUS_PLUS':
        return (
          <StatusTag
            status="gold"
            label={<WingRoleLabel text="🪶 CV 🪶" iconSize={11} />}
            className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40"
          />
        );
      default:
        return (
          <StatusTag status="default" label={role} className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0" />
        );
    }
  };

  // Base CV/KTV filter (sắp xếp theo số bộ mi ordersCount giảm dần)
  const baseStaffList = useMemo(() => {
    const list = staffList.filter((s) => {
      const isCv =
        ['lt', 'technician', 'cv', 'ktv'].includes((s.role || '').toLowerCase()) ||
        ['KTV', 'CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(s.careerRole);
      return isCv;
    });
    return [...list].sort((a, b) => {
      const diff = (b.ordersCount || 0) - (a.ordersCount || 0);
      if (diff !== 0) return diff;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [staffList]);

  // Counts by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: baseStaffList.length,
      CV: 0,
      CV_PLUS: 0,
      CV_PLUS_PLUS: 0,
      KTV: 0,
    };
    baseStaffList.forEach((s) => {
      if (s.careerRole === 'CV') counts.CV++;
      else if (s.careerRole === 'CV_PLUS') counts.CV_PLUS++;
      else if (s.careerRole === 'CV_PLUS_PLUS') counts.CV_PLUS_PLUS++;
      else if (s.careerRole === 'KTV') counts.KTV++;
    });
    return counts;
  }, [baseStaffList]);

  // Filtered by Search & Role (bảo đảm luôn order by số bộ mi ordersCount giảm dần)
  const filteredStaff = useMemo(() => {
    let result = baseStaffList;

    if (activeRoleFilter !== 'ALL') {
      result = result.filter((s) => s.careerRole === activeRoleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => {
        const nameMatch = (s.displayName || '').toLowerCase().includes(q);
        const userMatch = (s.username || '').toLowerCase().includes(q);
        const branchMatch = (s.branchName || '').toLowerCase().includes(q);
        return nameMatch || userMatch || branchMatch;
      });
    }

    return [...result].sort((a, b) => {
      const diff = (b.ordersCount || 0) - (a.ordersCount || 0);
      if (diff !== 0) return diff;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [baseStaffList, activeRoleFilter, searchQuery]);

  // Auto-scroll to selected staff when sheet opens
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleCardClick = (staffId: number) => {
    setHighlightedId(staffId);
    onSelectStaff(staffId);
    // Smooth auto-close after 250ms feedback
    setTimeout(() => {
      onClose();
    }, 250);
  };

  return (
    <div className="flex flex-col h-full -mx-4 -mt-3 text-slate-800 dark:text-slate-100">
      {/* 📱 TOP CONTROLS (Search Bar & Role Filter Pills) */}
      <div className="px-4 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-20 backdrop-blur-md">
        {/* Search Bar */}
        <div className="relative mb-2.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên, @username hoặc chi nhánh..."
            className="w-full bg-slate-100/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 pl-9 pr-8 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:opacity-80"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Role Filter Tabs (Horizontal Pill Rail) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold py-0.5">
          {ROLE_TABS.map((tab) => {
            const isActive = activeRoleFilter === tab.key;
            const count = roleCounts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveRoleFilter(tab.key)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 tabular-nums ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-slate-700'
                }`}
              >
                {tab.key === 'KTV' && (
                  <span className="inline-flex items-center gap-1">
                    <HardHat className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>KTV</span>
                  </span>
                )}
                {tab.key === 'CV' && (
                  <span className="inline-flex items-center gap-1">
                    <LashIcon size={12} className="text-pink-400 shrink-0" />
                    <span>CV</span>
                  </span>
                )}
                {tab.key === 'CV_PLUS' && <WingRoleLabel text="🪶 CV" iconSize={11} />}
                {tab.key === 'CV_PLUS_PLUS' && <WingRoleLabel text="🪶 CV 🪶" iconSize={11} />}
                {tab.key === 'ALL' && <span>Tất cả</span>}
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 📜 SCROLLABLE VERTICAL CARDS LIST */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-2.5 pb-10"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filteredStaff.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 m-0">Không tìm thấy Chuyên Viên nào</p>
            <p className="text-[11px] text-slate-400 m-0 mt-1">Thử tìm kiếm với từ khóa khác hoặc chuyển tab cấp bậc</p>
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const isSelected = staff.id === selectedStaffId;
            const isHighlighted = staff.id === highlightedId;
            const overallStatus = getStaffOverallStatus(staff);
            const tipRate = getStaffTipPercent(staff);
            const fixRate = Number(((staff.fixRate || 0) * 100).toFixed(1));
            const qaAudits = getQaAuditsCount(staff);
            const comboRate = getStaffComboPercent(staff);
            const bananaBalance = getBananaBalance(staff);

            const req = getStaffBenchmarkReq(staff);
            const targetOrders = req?.minOrders ?? minOrdersConfig;
            const targetFix = req?.maxFixRate ?? maxFixRateConfig;
            const targetMaxFixPct = Number((targetFix * 100).toFixed(1));
            const targetTipRatio = req?.minTipRatioAboveShop ?? minTipRatioAboveShop;
            const targetQaAudits = req?.minQaAudits ?? minQaAuditsConfig;
            const targetCombo = req?.minSelfComboRate ?? minComboConfig;
            const targetComboPct = Number((targetCombo * 100).toFixed(1));
            const targetBanana = req?.minBananaCount ?? minBananaConfig;

            const sOrders = getOrdersStatus(staff.ordersCount || 0, targetOrders);
            const sFix = getFixStatus(staff.fixRate || 0, targetFix);
            const sTip = getTipStatus(staff, targetTipRatio);
            const sQa = getQaStatus(staff, targetQaAudits);
            const sCombo = getComboStatus(staff, targetCombo);
            const sBanana = getBananaStatus(staff.bananaCount || 0, targetBanana);

            return (
              <div
                key={staff.id}
                ref={isSelected ? selectedRef : undefined}
                data-staff-id={staff.id}
                onClick={() => handleCardClick(staff.id)}
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
                        {getRoleBadge(staff.careerRole)}
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
                    className={`rounded-lg py-1 border transition-all ${getBadgeClass(sOrders)}`}
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
                    className={`rounded-lg py-1 border transition-all ${getBadgeClass(sFix)}`}
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
                    className={`rounded-lg py-1 border transition-all ${getBadgeClass(sTip)}`}
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
                    className={`rounded-lg py-1 border transition-all ${getBadgeClass(sQa)}`}
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
                    className={`rounded-lg py-1 border transition-all ${getBadgeClass(sCombo)}`}
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
                    className={`rounded-lg py-1 border transition-all ${getBadgeClass(sBanana)}`}
                    title={`Số dư Chuối: ${bananaBalance.toLocaleString('vi-VN')} 🍌 (chuẩn không âm ≥ 0)`}
                  >
                    <div className="text-[8px] opacity-75 font-sans leading-none mb-0.5">Chuối</div>
                    <div className="flex items-center justify-center gap-0.5 truncate px-0.5">
                      <Banana className="w-2.5 h-2.5 shrink-0" />
                      <span>{bananaBalance}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
