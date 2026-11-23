'use client';

import React from 'react';
import { Zap, Check, Sparkles, RotateCw } from 'lucide-react';
import type {
  ComboPurchaseExpiryResult,
  ComboTodayUsageMode,
  MatchedComboPackageOption,
  ResolveActiveBookingComboWalletsResult,
} from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import { ComboSessionBadge } from '../../ui-kit/ComboSessionBadge';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import { ComboWalletSelectorList } from '../../ui-kit/ComboWalletSelectorList';
import {
  formatComboName,
  type LashMaterialSpec,
  type LashPricingAndCvPointResult,
} from '../LashMaterialConstraintMatrix';
import { ConsultationComboSelectorSection } from './ConsultationComboSelectorSection';
import { ConsultationComboUpgradeBox } from './ConsultationComboUpgradeBox';
import { ConsultationUnderMinkStrip } from './ConsultationUnderMinkStrip';

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
  resolvedWallets?: ResolveActiveBookingComboWalletsResult;
  onSelectComboWallet?: (params: {
    targetBookingId?: number;
    selectedUpperComboBalanceId?: number | null;
    selectedUnderComboBalanceId?: number | null;
    skipUpperCombo?: boolean;
    skipUnderCombo?: boolean;
  }) => void;
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
  resolvedWallets,
  onSelectComboWallet,
}: ConsultationServiceAndUpgradeCardProps) {
  const isOldComboExpired = Boolean(comboLiveStatus?.isExpired && (comboLiveStatus?.remainingSessions || 0) > 0);
  const isSkipUpperWithLiveWallet = Boolean(
    resolvedWallets?.skipUpperCombo && (resolvedWallets?.liveUpperWallets?.length ?? 0) > 0
  );
  return (
    <div
      className={`rounded-2xl p-3 shadow-xs border space-y-2 transition-colors ${'bg-[var(--mos-surface)] border-[var(--mos-surface-border)]'}`}
    >
      {/* Header gọn: Tên gói / Single + Badge Ngày ghé cuối & Tổng lượt */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-5 h-5 rounded-full text-white inline-flex items-center justify-center shrink-0 ${
              isOldComboExpired ? 'bg-rose-600' : isSkipUpperWithLiveWallet ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
          >
            <Zap className="w-3 h-3 fill-current" />
          </span>
          <span className={`text-[12px] font-extrabold truncate text-[var(--mos-text)]`}>
            {isComboLive || isOldComboExpired
              ? formatComboName(comboName)
              : isSkipUpperWithLiveWallet
                ? 'Đi Lẻ Lần Này (Giữ Gói)'
                : 'Khách Lẻ'}
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
                theme={isDark ? 'dark' : 'light'}
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

      {resolvedWallets && resolvedWallets.upperWallets.length > 0 && (
        <ComboWalletSelectorList
          wallets={resolvedWallets.upperWallets}
          selectedBalanceId={resolvedWallets.selectedUpperComboBalanceId}
          skipCombo={resolvedWallets.skipUpperCombo}
          serviceGroup="upper"
          compact
          onSelectWallet={(wallet) =>
            onSelectComboWallet?.({
              selectedUpperComboBalanceId: wallet.balanceId,
              skipUpperCombo: false,
            })
          }
          onSelectSkipCombo={() =>
            onSelectComboWallet?.({
              selectedUpperComboBalanceId: null,
              skipUpperCombo: true,
            })
          }
        />
      )}

      {/* Khối Thông số Mi Trên + Nút +Mi dưới & 1 dòng thông số Mi Dưới tối giản */}
      <div
        className={`rounded-xl p-2.5 border space-y-2 transition-colors ${
          isDark ? 'bg-[#141416] border-neutral-800' : 'bg-neutral-50/80 border-neutral-200/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[12px] font-extrabold truncate text-[var(--mos-text)]`}>
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
          <ConsultationUnderMinkStrip
            isDark={isDark}
            underMinkCurl={underMinkCurl}
            setUnderMinkCurl={setUnderMinkCurl}
            underMinkLength={underMinkLength}
            setUnderMinkLength={setUnderMinkLength}
            underMinkCount={underMinkCount}
            setUnderMinkCount={setUnderMinkCount}
            underMinkServiceType={underMinkServiceType}
            setUnderMinkServiceType={setUnderMinkServiceType}
            hasUnderMinkCombo={hasUnderMinkCombo}
            underComboNormalRemaining={underComboNormalRemaining}
            underComboRetainRemaining={underComboRetainRemaining}
          />
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
          aria-pressed={serviceType === 'Normal'}
          onClick={() => handleRequestServiceTypeChange('Normal')}
          className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
            serviceType === 'Normal'
              ? 'bg-[#FFB400] text-black shadow-xs'
              : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{isAlwaysFullSet || !isComboLive ? 'Mới' : `Mới (${comboNormalRemaining})`}</span>
        </button>

        <button
          type="button"
          aria-pressed={serviceType === 'Retain'}
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
          <span>{isAlwaysFullSet || !isComboLive ? 'Dặm' : `Dặm (${comboRetainRemaining})`}</span>
        </button>
      </div>

      {/* Card Nâng Cấp Dịch Vụ Từ Gói Combo */}
      {isComboLive && totalUpgradeAmount > 0 && (
        <ConsultationComboUpgradeBox
          serviceType={serviceType}
          comboBaseServicePrice={comboBaseServicePrice}
          comboBaseRetainPrice={comboBaseRetainPrice}
          upgradeScope={upgradeScope}
          setUpgradeScope={setUpgradeScope}
          retainUpgradeMode={retainUpgradeMode}
          setRetainUpgradeMode={setRetainUpgradeMode}
          isComboLive={isComboLive}
          hasComboNormalRemaining={hasComboNormalRemaining}
          hasComboRetainRemaining={hasComboRetainRemaining}
          comboNormalRemaining={comboNormalRemaining}
          comboRetainRemaining={comboRetainRemaining}
          cleanServiceName={cleanServiceName}
          livePricingAndCvPoints={livePricingAndCvPoints}
          normalUpgradeDiff={normalUpgradeDiff}
          retainUpgradeDiff={retainUpgradeDiff}
          totalUpgradeAmount={totalUpgradeAmount}
          showStaffRewards={showStaffRewards}
        />
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
