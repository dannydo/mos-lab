'use client';

import React from 'react';
import { Zap, Check, Sparkles, RotateCw } from 'lucide-react';
import type { ComboPurchaseExpiryResult, ComboTodayUsageMode, MatchedComboPackageOption } from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import { ComboSessionBadge } from '../../ui-kit/ComboSessionBadge';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import { CvFeather1Badge } from '../../ui-kit/CvFeatherLabels';
import {
  formatComboName,
  UNDER_MINK_PREP_SPEC,
  parseUnderMinkLengthMm,
  parseUnderMinkCountFibers,
  stepUnderMinkLength,
  stepUnderMinkCount,
  type LashMaterialSpec,
  type LashPricingAndCvPointResult,
} from '../LashMaterialConstraintMatrix';
import { ConsultationComboSelectorSection } from './ConsultationComboSelectorSection';

interface ConsultationServiceAndUpgradeCardProps {
  isDark: boolean;
  isComboLive: boolean;
  comboName: string;
  daysSinceLastVisit: number | null;
  isWithin25Days: boolean;
  comboNormalRemaining: number;
  comboRetainRemaining: number;
  comboRemainingSessions: number;
  hasComboNormalRemaining: boolean;
  hasComboRetainRemaining: boolean;
  currentMaterialSpec: LashMaterialSpec;
  isAlwaysFullSet: boolean;
  selectedVolume: string;
  selectedCount: string;
  lastVisitDate: string | null;
  selectedStyle: string;
  selectedCurl: string;
  selectedThickness: string;
  selectedLength: string;
  hasUnderMink: boolean;
  setHasUnderMink: React.Dispatch<React.SetStateAction<boolean>>;
  underMinkCurl: 'B' | 'C';
  setUnderMinkCurl: React.Dispatch<React.SetStateAction<'B' | 'C'>>;
  underMinkLength: string;
  setUnderMinkLength: React.Dispatch<React.SetStateAction<string>>;
  underMinkCount: string;
  setUnderMinkCount: React.Dispatch<React.SetStateAction<string>>;
  underMinkServiceType: 'Normal' | 'Retain';
  setUnderMinkServiceType: React.Dispatch<React.SetStateAction<'Normal' | 'Retain'>>;
  hasUnderMinkCombo: boolean;
  underComboNormalRemaining: number;
  underComboRetainRemaining: number;
  isOverridden: boolean;
  overrideReason: string;
  handleRestoreAutoRule: () => void;
  serviceType: 'Normal' | 'Retain';
  handleRequestServiceTypeChange: (targetType: 'Normal' | 'Retain') => void;
  totalUpgradeAmount: number;
  comboBaseServicePrice: number;
  comboBaseRetainPrice: number;
  upgradeScope: 'SINGLE' | 'ALL';
  setUpgradeScope: React.Dispatch<React.SetStateAction<'SINGLE' | 'ALL'>>;
  retainUpgradeMode: 'DEDUCT_NORMAL' | 'PAY_DIFF';
  setRetainUpgradeMode: React.Dispatch<React.SetStateAction<'DEDUCT_NORMAL' | 'PAY_DIFF'>>;
  cleanServiceName: string;
  livePricingAndCvPoints: LashPricingAndCvPointResult;
  normalUpgradeDiff: number;
  retainUpgradeDiff: number;
  comboPurchaseTotal: number;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  setSelectedNewComboPkg: (pkg: MatchedComboPackageOption | null) => void;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  setSelectedUnderComboPkg: (pkg: MatchedComboPackageOption | null) => void;
  comboLiveStatus?: BookingItem['comboLiveStatus'];
  onOpenWalletModal?: () => void;
  upperTodayUsageMode?: ComboTodayUsageMode;
  setUpperTodayUsageMode?: (mode: ComboTodayUsageMode) => void;
  underTodayUsageMode?: ComboTodayUsageMode;
  setUnderTodayUsageMode?: (mode: ComboTodayUsageMode) => void;
  selectedUpperExpiry?: ComboPurchaseExpiryResult | null;
  selectedUnderExpiry?: ComboPurchaseExpiryResult | null;
  showStaffRewards: boolean;
  setShowStaffRewards: (show: boolean) => void;
  handleOpenComboModal: (target: 'upper' | 'under') => void;
  handleSubmit: () => void;
}

export function ConsultationServiceAndUpgradeCard({
  isDark,
  isComboLive,
  comboName,
  daysSinceLastVisit,
  isWithin25Days,
  comboNormalRemaining,
  comboRetainRemaining,
  comboRemainingSessions,
  hasComboNormalRemaining,
  hasComboRetainRemaining,
  currentMaterialSpec,
  isAlwaysFullSet,
  selectedVolume,
  selectedCount,
  lastVisitDate,
  selectedStyle,
  selectedCurl,
  selectedThickness,
  selectedLength,
  hasUnderMink,
  setHasUnderMink,
  underMinkCurl,
  setUnderMinkCurl,
  underMinkLength,
  setUnderMinkLength,
  underMinkCount,
  setUnderMinkCount,
  underMinkServiceType,
  setUnderMinkServiceType,
  hasUnderMinkCombo,
  underComboNormalRemaining,
  underComboRetainRemaining,
  isOverridden,
  overrideReason,
  handleRestoreAutoRule,
  serviceType,
  handleRequestServiceTypeChange,
  totalUpgradeAmount,
  comboBaseServicePrice,
  comboBaseRetainPrice,
  upgradeScope,
  setUpgradeScope,
  retainUpgradeMode,
  setRetainUpgradeMode,
  cleanServiceName,
  livePricingAndCvPoints,
  normalUpgradeDiff,
  retainUpgradeDiff,
  comboPurchaseTotal,
  selectedNewComboPkg,
  setSelectedNewComboPkg,
  selectedUnderComboPkg,
  setSelectedUnderComboPkg,
  comboLiveStatus,
  onOpenWalletModal,
  upperTodayUsageMode,
  setUpperTodayUsageMode,
  underTodayUsageMode,
  setUnderTodayUsageMode,
  selectedUpperExpiry,
  selectedUnderExpiry,
  showStaffRewards,
  setShowStaffRewards,
  handleOpenComboModal,
  handleSubmit,
}: ConsultationServiceAndUpgradeCardProps) {
  const isOldComboExpired = Boolean(comboLiveStatus?.isExpired && (comboLiveStatus?.remainingSessions || 0) > 0);
  return (
    <div
      className={`rounded-2xl p-3 shadow-xs border space-y-2 transition-colors ${
        isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'
      }`}
    >
      {/* Header gọn: Tên gói / Single + Badge Ngày ghé cuối & Tổng lượt */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-5 h-5 rounded-full text-white inline-flex items-center justify-center shrink-0 ${
              isOldComboExpired ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            <Zap className="w-3 h-3 fill-current" />
          </span>
          <span className={`text-[12px] font-extrabold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            {isComboLive || isOldComboExpired ? formatComboName(comboName) : 'Khách Lẻ'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 tabular-nums">
          {daysSinceLastVisit !== null && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isWithin25Days
                  ? isDark
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : 'bg-emerald-100/90 text-emerald-800'
                  : isDark
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    : 'bg-amber-100 text-amber-900'
              }`}
            >
              {daysSinceLastVisit}N
            </span>
          )}
          {isComboLive && (
            <button
              type="button"
              onClick={onOpenWalletModal}
              className="inline-flex items-center cursor-pointer bg-transparent border-0 p-0"
              title="Xem chi tiết Gói Combo & Hạn sử dụng"
            >
              <ComboSessionBadge
                normalRemaining={comboNormalRemaining}
                retainRemaining={comboRetainRemaining}
                remainingSessions={comboRemainingSessions}
                comboName={comboName}
                size="xs"
              />
            </button>
          )}
          <ComboExpiryStatusBadge
            status={comboLiveStatus}
            compact
            theme={isDark ? 'dark' : 'light'}
            onClick={onOpenWalletModal ? () => onOpenWalletModal() : undefined}
          />
        </div>
      </div>

      {/* Khối Thông số Mi Trên + Nút +Mi dưới & 1 dòng thông số Mi Dưới tối giản */}
      <div
        className={`rounded-xl p-2.5 border space-y-2 transition-colors ${
          isDark ? 'bg-[#141416] border-neutral-800' : 'bg-neutral-50/80 border-neutral-200/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[12px] font-extrabold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                {currentMaterialSpec.shortLabel} · {selectedVolume} · {selectedCount}
              </span>
              {lastVisitDate && (
                <span
                  className={`text-[10px] font-medium tabular-nums shrink-0 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
                >
                  ({lastVisitDate.slice(0, 5)})
                </span>
              )}
            </div>
            <div
              className={`text-[11px] font-semibold truncate mt-0.5 tabular-nums ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}
            >
              {selectedStyle.replace(/sexy\s*\/?\s*cat|cat\s*\/?\s*sexy/gi, 'Natural')} ·{' '}
              {selectedCurl.replace(/^Cong\s+/i, '')} · {selectedThickness.replace(/\s*mm/gi, '').replace(/\s+/g, '')} ·{' '}
              {selectedLength.replace(/\s*mm/gi, '').replace(/\s+/g, '')}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHasUnderMink((prev) => !prev)}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
              hasUnderMink
                ? 'bg-purple-600 border-purple-600 text-white shadow-2xs'
                : isDark
                  ? 'bg-[#1C1C1E] border-neutral-700 text-neutral-300 hover:border-purple-400'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-purple-300'
            }`}
          >
            {hasUnderMink && <Check className="w-3 h-3 stroke-[3]" />}
            <span>+Mi dưới</span>
          </button>
        </div>

        {hasUnderMink && (
          <div
            className={`pt-2 border-t flex items-center justify-between gap-1 text-[10px] tabular-nums whitespace-nowrap ${
              isDark ? 'border-neutral-800' : 'border-neutral-200/70'
            }`}
          >
            <div className="flex items-center gap-1">
              <div
                className={`inline-flex items-center p-0.5 rounded-lg border ${
                  isDark ? 'bg-[#1C1C1E] border-neutral-700' : 'bg-white border-neutral-200'
                }`}
              >
                {(['B', 'C'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setUnderMinkCurl(c)}
                    className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                      underMinkCurl === c
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : isDark
                          ? 'text-neutral-400 hover:text-white'
                          : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div
                className={`inline-flex items-center p-0.5 rounded-lg border tabular-nums ${
                  isDark ? 'bg-[#1C1C1E] border-neutral-700' : 'bg-white border-neutral-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, -1))}
                  disabled={parseUnderMinkLengthMm(underMinkLength) <= UNDER_MINK_PREP_SPEC.minLengthMm}
                  className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  −
                </button>
                <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[20px] text-center shadow-2xs">
                  {parseUnderMinkLengthMm(underMinkLength)}
                </span>
                <button
                  type="button"
                  onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, 1))}
                  disabled={parseUnderMinkLengthMm(underMinkLength) >= UNDER_MINK_PREP_SPEC.maxLengthMm}
                  className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  +
                </button>
              </div>

              <div
                className={`inline-flex items-center p-0.5 rounded-lg border tabular-nums ${
                  isDark ? 'bg-[#1C1C1E] border-neutral-700' : 'bg-white border-neutral-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, -10))}
                  disabled={parseUnderMinkCountFibers(underMinkCount) <= UNDER_MINK_PREP_SPEC.minCountFibers}
                  className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  −
                </button>
                <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[22px] text-center shadow-2xs">
                  {parseUnderMinkCountFibers(underMinkCount)}
                </span>
                <button
                  type="button"
                  onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, 10))}
                  disabled={parseUnderMinkCountFibers(underMinkCount) >= UNDER_MINK_PREP_SPEC.maxCountFibers}
                  className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            <div
              className={`inline-flex items-center p-0.5 rounded-lg border shrink-0 ${
                isDark ? 'bg-[#1C1C1E] border-purple-800' : 'bg-white border-purple-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setUnderMinkServiceType('Normal')}
                className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                  underMinkServiceType === 'Normal'
                    ? 'bg-[#FFB400] text-black shadow-2xs'
                    : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-500 hover:text-black'
                }`}
              >
                {hasUnderMinkCombo ? `Mới (${underComboNormalRemaining})` : 'Mới'}
              </button>
              <button
                type="button"
                onClick={() => setUnderMinkServiceType('Retain')}
                className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                  underMinkServiceType === 'Retain'
                    ? 'bg-[#34C759] text-white shadow-2xs'
                    : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-500 hover:text-black'
                }`}
              >
                {hasUnderMinkCombo ? `Dặm (${underComboRetainRemaining})` : 'Dặm'}
              </button>
            </div>
          </div>
        )}
      </div>

      {isOverridden && (
        <div
          className={`px-2.5 py-1 rounded-lg border flex items-center justify-between gap-2 text-[10px] font-semibold ${
            isDark ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span className="truncate">⚠️ {overrideReason}</span>
          <button
            type="button"
            onClick={handleRestoreAutoRule}
            className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 cursor-pointer ${
              isDark
                ? 'bg-rose-900/80 text-rose-200 border-rose-700 hover:bg-rose-800'
                : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
            }`}
          >
            Hoàn tác ↺
          </button>
        </div>
      )}

      {/* 2 Nút chọn chế độ tối giản */}
      <div className="bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] p-1 rounded-xl grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => handleRequestServiceTypeChange('Normal')}
          className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
            serviceType === 'Normal' ? 'bg-[#FFB400] text-black shadow-xs' : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{isAlwaysFullSet ? 'Mới' : isComboLive ? comboNormalRemaining : 'Mới'}</span>
        </button>

        <button
          type="button"
          disabled={isComboLive && !hasComboRetainRemaining}
          onClick={() => handleRequestServiceTypeChange('Retain')}
          className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all tabular-nums ${
            serviceType === 'Retain'
              ? 'bg-[#34C759] text-white shadow-xs'
              : isComboLive && !hasComboRetainRemaining
                ? 'text-[var(--mos-text-muted)] opacity-30 cursor-not-allowed'
                : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer'
          }`}
          title={isComboLive && !hasComboRetainRemaining ? 'Gói đã hết lần Dặm' : undefined}
        >
          <RotateCw className="w-3.5 h-3.5 shrink-0" />
          <span>{isAlwaysFullSet ? 'Dặm' : isComboLive ? comboRetainRemaining : 'Dặm'}</span>
        </button>
      </div>

      {/* Card Nâng Cấp Dịch Vụ Từ Gói Combo */}
      {isComboLive && totalUpgradeAmount > 0 && (
        <div className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] rounded-xl p-3 border border-sky-500/40 text-white space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" /> NÂNG CẤP TỪ GÓI COMBO
            </span>
            <span className="text-[10px] font-bold text-sky-200 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
              Gói: {(serviceType === 'Retain' ? comboBaseRetainPrice : comboBaseServicePrice).toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="bg-black/40 p-1 rounded-lg grid grid-cols-2 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setUpgradeScope('SINGLE')}
              className={`py-1.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                upgradeScope === 'SINGLE' ? 'bg-sky-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>{serviceType === 'Normal' ? '✦ 1' : '↻ 1'}</span>
            </button>
            <button
              type="button"
              onClick={() => setUpgradeScope('ALL')}
              className={`py-1.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                upgradeScope === 'ALL' ? 'bg-sky-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>
                ✦ {comboNormalRemaining} · ↻ {comboRetainRemaining}
              </span>
            </button>
          </div>

          {serviceType === 'Normal' && isComboLive && hasComboRetainRemaining && (
            <div className="space-y-1.5 bg-black/30 p-2 rounded-lg border border-white/5 text-[11px]">
              <div className="text-[10.5px] font-semibold text-neutral-300">
                {!hasComboNormalRemaining ? '⚠️ Hết ✦ (0) · Phương án làm ✦:' : 'Khách nối Mới:'}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={!hasComboNormalRemaining}
                  onClick={() => setRetainUpgradeMode('DEDUCT_NORMAL')}
                  className={`p-1.5 rounded-md text-left transition-all border ${
                    retainUpgradeMode === 'DEDUCT_NORMAL' && hasComboNormalRemaining
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="text-[10.5px] font-black">✦ 1</div>
                  <div className="text-[9.5px] text-neutral-300">
                    {hasComboNormalRemaining ? `✦ ${comboNormalRemaining} (0đ)` : '❌ 0'}
                  </div>
                </button>
                <button
                  type="button"
                  disabled={!hasComboRetainRemaining}
                  onClick={() => setRetainUpgradeMode('PAY_DIFF')}
                  className={`p-1.5 rounded-md text-left transition-all border ${
                    (retainUpgradeMode === 'PAY_DIFF' || !hasComboNormalRemaining) && hasComboRetainRemaining
                      ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold'
                      : 'bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="text-[10.5px] font-black">↻ 1 + bù</div>
                  <div className="text-[9.5px] text-neutral-300">
                    {hasComboRetainRemaining
                      ? `+${(comboBaseServicePrice - comboBaseRetainPrice).toLocaleString('vi-VN')} đ (↻ ${comboRetainRemaining})`
                      : '❌ 0'}
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="bg-black/50 rounded-lg p-2.5 border border-white/10 space-y-1.5 text-[11.5px]">
            <div className="flex items-center justify-between text-neutral-300">
              <span>Dịch vụ:</span>
              <span className="font-bold text-white truncate max-w-[210px]">
                {cleanServiceName} ({livePricingAndCvPoints.skuPrice.toLocaleString('vi-VN')} đ)
              </span>
            </div>
            {upgradeScope === 'ALL' ? (
              <div className="pt-1.5 border-t border-white/10 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-neutral-300">
                  <span>
                    ✦ {comboNormalRemaining} (+{normalUpgradeDiff.toLocaleString('vi-VN')} đ):
                  </span>
                  <span className="font-bold text-white tabular-nums">
                    +{(normalUpgradeDiff * comboNormalRemaining).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {comboRetainRemaining > 0 && (
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>
                      ↻ {comboRetainRemaining} (+{retainUpgradeDiff.toLocaleString('vi-VN')} đ):
                    </span>
                    <span className="font-bold text-white tabular-nums">
                      +{(retainUpgradeDiff * comboRetainRemaining).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-emerald-400 font-bold pt-1 border-t border-white/5">
                  <span>
                    Phụ thu (✦ {comboNormalRemaining} · ↻ {comboRetainRemaining}):
                  </span>
                  <span className="text-[13px] font-black tabular-nums">
                    +{totalUpgradeAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-neutral-300">
                <span>Phụ thu ({serviceType === 'Normal' ? '✦ 1' : '↻ 1'}):</span>
                <span
                  className={`font-black tabular-nums text-[13px] ${
                    totalUpgradeAmount > 0 ? 'text-emerald-400' : 'text-sky-300'
                  }`}
                >
                  {totalUpgradeAmount > 0 ? `+${totalUpgradeAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-neutral-400 text-[10.5px] pt-1 border-t border-white/10">
              <span className="inline-flex items-center gap-1">
                <span>↻</span>
                <CvFeather1Badge />:
              </span>
              <span className="font-bold text-amber-300 tabular-nums">+{livePricingAndCvPoints.totalPoints} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo xanh khi khách dùng đúng dịch vụ trong gói Combo */}
      {isComboLive && totalUpgradeAmount === 0 && (
        <div
          className={`border rounded-xl p-2.5 flex items-center justify-between text-[11.5px] shadow-2xs ${
            isDark
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-emerald-50/90 border-emerald-300/80 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                isDark ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-200 text-emerald-800'
              }`}
            >
              ✓
            </span>
            <span className="font-semibold">
              Dịch vụ trong gói Combo ·{' '}
              <strong className={`font-black ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>
                Miễn phụ thu (0đ)
              </strong>
            </span>
          </div>
          <span
            className={`font-mono text-[10.5px] font-bold px-2 py-0.5 rounded border shadow-2xs shrink-0 ${
              isDark
                ? 'bg-[#18181A] text-emerald-300 border-emerald-800'
                : 'bg-white text-emerald-800 border-emerald-200'
            }`}
          >
            Trừ 1 suất {serviceType === 'Retain' ? 'Dặm' : 'Mới'}
          </span>
        </div>
      )}

      <ConsultationComboSelectorSection
        isDark={isDark}
        isComboLive={isComboLive}
        hasUnderMinkCombo={hasUnderMinkCombo}
        comboLiveStatus={comboLiveStatus}
        onOpenWalletModal={onOpenWalletModal}
        upperTodayUsageMode={upperTodayUsageMode}
        setUpperTodayUsageMode={setUpperTodayUsageMode}
        underTodayUsageMode={underTodayUsageMode}
        setUnderTodayUsageMode={setUnderTodayUsageMode}
        selectedUpperExpiry={selectedUpperExpiry}
        selectedUnderExpiry={selectedUnderExpiry}
        totalUpgradeAmount={totalUpgradeAmount}
        comboPurchaseTotal={comboPurchaseTotal}
        selectedNewComboPkg={selectedNewComboPkg}
        setSelectedNewComboPkg={setSelectedNewComboPkg}
        selectedUnderComboPkg={selectedUnderComboPkg}
        setSelectedUnderComboPkg={setSelectedUnderComboPkg}
        showStaffRewards={showStaffRewards}
        setShowStaffRewards={setShowStaffRewards}
        handleOpenComboModal={handleOpenComboModal}
        handleSubmit={handleSubmit}
      />
    </div>
  );
}
