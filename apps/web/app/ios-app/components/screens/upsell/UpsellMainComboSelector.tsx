'use client';

import React from 'react';
import { Sparkles, CheckCircle2, BookOpen, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import {
  WingsComboCategoryId,
  MatchedComboPackageOption,
  getWingsComboCategory,
  getVolumeFiberMeta,
  getLashFamilyInfo,
  calculateComboPurchaseAccounting,
  type ComboPurchaseExpiryResult,
  type ComboTodayUsageMode,
} from '@mos-lab/shared';
import { BookingItem } from '../../../state/mockData';
import { WingsUnifiedComboCard, type ComboExpiryPreviewItem } from '../../ui-kit/WingsUnifiedComboCard';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import { UpsellComboWalletAccountingCard } from './UpsellComboWalletAccountingCard';

type CategoryInfo = ReturnType<typeof getWingsComboCategory>;
type FamilyInfo = ReturnType<typeof getLashFamilyInfo>;
type PurchaseAccountingResult = ReturnType<typeof calculateComboPurchaseAccounting>;

export interface UpsellMainComboSelectorProps {
  isDark: boolean;
  booking?: BookingItem;
  customerName: string;
  isExistingComboLive: boolean;
  remainingSessions: number;
  showNewComboSection: boolean;
  onExpandNewComboSection: () => void;
  onCollapseNewComboSection: () => void;
  isUpTierPackage: boolean;
  currentCategory: CategoryInfo;
  activeCategoryId: WingsComboCategoryId;
  activeVolume: number | 'under';
  autoMatchedCategoryId: WingsComboCategoryId;
  autoMatchedVolume: number | 'under';
  familyInfo: FamilyInfo;
  onSelectFamilyCategory: (catId: WingsComboCategoryId) => void;
  onSelectVolume: (vol: number) => void;
  onOpenConsultModal: () => void;
  servicePrice: number;
  matchedPackages: MatchedComboPackageOption[];
  selectedNewComboId: string;
  onSetSelectedNewComboId: React.Dispatch<React.SetStateAction<string>>;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  purchaseAccounting: PurchaseAccountingResult | null;
  deductTodayIntoCombo: boolean;
  onSetDeductTodayIntoCombo: (deduct: boolean) => void;
  upperExpiryPreviewMap?: Record<string, ComboExpiryPreviewItem>;
  upperTodayUsageMode?: ComboTodayUsageMode;
  onSetUpperTodayUsageMode?: (mode: ComboTodayUsageMode) => void;
  selectedUpperExpiry?: ComboPurchaseExpiryResult | null;
  showStaffRewards: boolean;
  actorName: string;
  onOpenLockedWelcomeModal: () => void;
}

export function UpsellMainComboSelector({
  isDark,
  booking,
  customerName,
  isExistingComboLive,
  remainingSessions,
  showNewComboSection,
  onExpandNewComboSection,
  onCollapseNewComboSection,
  isUpTierPackage,
  currentCategory,
  activeCategoryId,
  activeVolume,
  autoMatchedCategoryId,
  autoMatchedVolume,
  familyInfo,
  onSelectFamilyCategory,
  onSelectVolume,
  onOpenConsultModal,
  servicePrice,
  matchedPackages,
  selectedNewComboId,
  onSetSelectedNewComboId,
  selectedNewComboPkg,
  purchaseAccounting,
  deductTodayIntoCombo,
  onSetDeductTodayIntoCombo,
  upperExpiryPreviewMap,
  upperTodayUsageMode,
  onSetUpperTodayUsageMode,
  selectedUpperExpiry,
  showStaffRewards,
  actorName,
  onOpenLockedWelcomeModal,
}: UpsellMainComboSelectorProps) {
  return (
    <div>
      <div
        className={`text-[11px] font-extrabold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between`}
      >
        <span>
          {isExistingComboLive ? '2. MUA THÊM GÓI ❖ (GỐI ĐẦU / RENEW)' : '1. GÓI ❖ ĐÚNG DÒNG MI & HẠN SỬ DỤNG'}
        </span>
        <div className="flex items-center gap-1.5">
          {isExistingComboLive && showNewComboSection && (
            <button
              type="button"
              onClick={onCollapseNewComboSection}
              className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
            >
              <span>Thu gọn</span>
              <ChevronUp className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Khi khách có gói còn > 2 lần và đang ẩn, hiển thị Bar thu gọn (chỉ 1 nút duy nhất) */}
      {isExistingComboLive && !showNewComboSection ? (
        <div
          onClick={onExpandNewComboSection}
          className={`${isDark ? 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/40' : 'bg-white border-neutral-200/80 hover:border-amber-300'} rounded-2xl p-3 shadow-xs border flex items-center justify-between gap-3 cursor-pointer active:scale-99 transition-all select-none`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-full ${isDark ? 'bg-amber-400/15 border-amber-400/30 text-amber-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-600'} border flex items-center justify-center shrink-0 font-black text-sm`}
            >
              ❖
            </div>
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <div className={`text-[13px] font-extrabold text-[var(--mos-text)] truncate`}>
                Khách còn {remainingSessions} lượt
              </div>
              <ComboExpiryStatusBadge status={booking?.comboLiveStatus} compact theme={isDark ? 'dark' : 'light'} />
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>+ Mua thêm</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3 shadow-sm border space-y-2.5`}
        >
          {/* Smart-Matched Header & Open Full 13-Category Consult Modal Button */}
          <div className="bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border border-[var(--mos-surface-border)] rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-[#FFB400]' : 'text-amber-700'}`}>
                {isUpTierPackage ? (
                  <>
                    <Sparkles className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>Nâng cấp gói</span>
                  </>
                ) : (
                  <>
                    <Sparkles className={`w-3 h-3 ${isDark ? 'text-[#FFB400]' : 'text-amber-600'}`} />
                    <span>Dịch vụ hôm nay</span>
                  </>
                )}
              </div>
              <div className="text-[13px] font-black text-[var(--mos-text)] leading-snug">
                {currentCategory.name} {activeVolume === 'under' ? 'Mi Dưới 390' : activeVolume}
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold leading-none ${
                    booking?.serviceType === 'Retain'
                      ? 'bg-purple-500/25 text-purple-300 border border-purple-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }`}
                >
                  {booking?.serviceType === 'Retain' ? 'Dặm' : 'Nối Mới'}
                </span>
                <span className="text-neutral-300 text-[10px] font-semibold tabular-nums">
                  {getVolumeFiberMeta(activeCategoryId, activeVolume).countPerEye} sợi
                </span>
                {(booking?.attributes?.curl || booking?.attributes?.thickness || booking?.attributes?.length) && (
                  <span className="text-neutral-400 text-[10px] font-medium">
                    {[
                      booking?.attributes?.curl?.replace(/^Cong\s+/i, ''),
                      booking?.attributes?.thickness?.replace(/\s*mm/gi, ''),
                      booking?.attributes?.length?.replace(/\s*mm/gi, ''),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </div>
              {isUpTierPackage && (
                <div className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">
                  Gốc làm hôm nay: {getWingsComboCategory(autoMatchedCategoryId).name} · Mã {autoMatchedVolume}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenConsultModal}
              className="shrink-0 px-2.5 py-1.5 rounded-xl bg-[#FFB400] text-black text-[11px] font-extrabold flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>❖ Menu</span>
            </button>
          </div>

          {/* Family Level Quick Switcher (2X, 3X, 4X, 5X | 3ℓ, 4ℓ, 5ℓ | 3D, 4D, 5D) */}
          {familyInfo.siblings.length > 1 && (
            <div className="space-y-1">
              <div
                className={`flex items-center justify-between text-[10px] font-extrabold ${isDark ? 'text-neutral-400' : 'text-neutral-600'} uppercase px-0.5`}
              >
                <span>Cấp độ {familyInfo.familyName}:</span>
                {isUpTierPackage && (
                  <span className="text-amber-500 font-extrabold flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Nâng cấp gói
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {familyInfo.siblings.map((sib) => {
                  const active = activeCategoryId === sib.categoryId;
                  const isTodayDone = autoMatchedCategoryId === sib.categoryId;
                  return (
                    <button
                      key={sib.categoryId}
                      type="button"
                      onClick={() => onSelectFamilyCategory(sib.categoryId)}
                      className={`py-1.5 px-2 rounded-xl text-center border transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                        active
                          ? 'bg-[#1C1C1E] text-[#FFB400] border-[#FFB400] shadow-xs'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                            : 'bg-[#F2F2F7] text-neutral-700 border-transparent hover:bg-neutral-200/80'
                      }`}
                    >
                      <span className="text-[13.5px] font-black tracking-tight">{sib.shortLabel}</span>
                      <span className="text-[9px] font-semibold opacity-90 truncate max-w-full">
                        {sib.fiberDensityLabel}
                      </span>
                      {isTodayDone ? (
                        <span
                          className={`text-[8px] font-black px-1 rounded-sm mt-0.5 ${
                            active
                              ? 'bg-[#FFB400] text-black'
                              : isDark
                                ? 'bg-neutral-700 text-neutral-300'
                                : 'bg-neutral-300 text-neutral-800'
                          }`}
                        >
                          Đang làm
                        </span>
                      ) : (
                        active && (
                          <span className="text-[8px] font-black px-1 rounded-sm mt-0.5 bg-emerald-500 text-white">
                            Nâng cấp
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Up-Tier Upsell Privilege Banner — Minimalist Bedside Pitch */}
          {isUpTierPackage && (
            <div
              className={`rounded-xl px-2.5 py-2 ${isDark ? 'bg-amber-950/40 border border-amber-500/40' : 'bg-amber-50/90 border border-amber-300'} flex items-center justify-between gap-2 shadow-xs`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#FFB400] text-black flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4 text-black" />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[12px] font-black ${isDark ? 'text-amber-200' : 'text-amber-950'} flex items-center gap-1.5 flex-wrap leading-tight`}
                  >
                    <span>Nâng cấp gói: {currentCategory.name}</span>
                  </div>
                  <div
                    className={`text-[10.5px] ${isDark ? 'text-neutral-300' : 'text-neutral-600'} leading-tight mt-0.5`}
                  >
                    Trừ thẳng vào Buổi Nối Mới #1 · 0đ thu lẻ hôm nay
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-flex items-center bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full tabular-nums shadow-xs whitespace-nowrap">
                  Tiết kiệm {servicePrice.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          )}

          {/* Quick Volume Pills for Current Category — Density Only & No Scrollbar */}
          {currentCategory.unitPrices.filter((u) => !u.isUnderLash).length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              <div
                className={`w-7 h-7 rounded-lg ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-[#F2F2F7] text-neutral-600'} flex items-center justify-center shrink-0`}
                title="Số trụ/sợi mi trên mắt"
              >
                <Eye className={`w-3.5 h-3.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
              </div>
              <div
                className="flex-1 flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {currentCategory.unitPrices
                  .filter((u) => !u.isUnderLash)
                  .map((u) => {
                    const volKey = Number(u.volume);
                    const active = activeVolume === volKey;
                    const meta = getVolumeFiberMeta(currentCategory.id, volKey);
                    const label = `${meta.countPerEye} ${meta.unitWord}`;
                    const compactPrice = `${Math.round(u.newPrice / 1000)}K`;
                    return (
                      <button
                        key={String(u.volume)}
                        type="button"
                        onClick={() => onSelectVolume(volKey)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black shrink-0 border transition-all cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'bg-[#1C1C1E] text-[#FFB400] border-[#FFB400] shadow-xs'
                            : isDark
                              ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                              : 'bg-[#F2F2F7] text-neutral-700 border-transparent hover:bg-neutral-200'
                        }`}
                      >
                        <span>{label}</span>
                        <span
                          className={`text-[9.5px] font-bold tabular-nums ${active ? 'text-amber-200' : isDark ? 'text-neutral-400' : 'text-neutral-500'}`}
                        >
                          {compactPrice}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Segmented Mode Selector: Chỉ làm lẻ ca này (Không mua gói) vs Mua gói Combo */}
          {!isExistingComboLive && (
            <div
              className={`p-1 rounded-xl grid grid-cols-2 gap-1 text-[11.5px] font-bold ${isDark ? 'bg-neutral-800' : 'bg-slate-200/90'}`}
            >
              <button
                type="button"
                onClick={() => onSetSelectedNewComboId('NONE')}
                className={`py-2 px-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedNewComboId === 'NONE'
                    ? isDark
                      ? 'bg-neutral-900 text-emerald-400 border border-emerald-500/40 shadow-xs font-black'
                      : 'bg-white text-emerald-800 shadow-xs font-black'
                    : isDark
                      ? 'text-neutral-400 hover:text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                {selectedNewComboId === 'NONE' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>Chỉ làm lẻ ca này</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedNewComboId === 'NONE') {
                    const firstPkg =
                      matchedPackages.find((p) => !p.isLocked && p.ruleName === '4 tặng 1') ||
                      matchedPackages.find((p) => !p.isLocked);
                    if (firstPkg) onSetSelectedNewComboId(firstPkg.id);
                  }
                }}
                className={`py-2 px-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedNewComboId !== 'NONE'
                    ? 'bg-amber-400 text-black shadow-xs font-black'
                    : isDark
                      ? 'text-neutral-400 hover:text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                {selectedNewComboId !== 'NONE' && <span>✓</span>}
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mua gói Combo</span>
              </button>
            </div>
          )}

          {/* Dynamic Matched Combo Packages List — 1 Unified Card với Tier Selector */}
          <WingsUnifiedComboCard
            packages={matchedPackages}
            customerName={customerName}
            customerPhone={booking?.customerPhone}
            customerAvatar={booking?.customerAvatar}
            selectedPackageId={selectedNewComboId === 'NONE' ? null : selectedNewComboId}
            dimmed={selectedNewComboId === 'NONE'}
            showStaffRewards={showStaffRewards}
            expiryPreviewByPkgId={upperExpiryPreviewMap}
            onSelectPackage={(pkg) => {
              onSetSelectedNewComboId((prev) => (prev === pkg.id ? 'NONE' : pkg.id));
            }}
            onSelectLocked={onOpenLockedWelcomeModal}
          />

          <UpsellComboWalletAccountingCard
            isDark={isDark}
            isExistingComboLive={isExistingComboLive}
            selectedNewComboPkg={selectedNewComboPkg}
            purchaseAccounting={purchaseAccounting}
            deductTodayIntoCombo={deductTodayIntoCombo}
            onSetDeductTodayIntoCombo={onSetDeductTodayIntoCombo}
            upperTodayUsageMode={upperTodayUsageMode}
            onSetUpperTodayUsageMode={onSetUpperTodayUsageMode}
            selectedUpperExpiry={selectedUpperExpiry}
            servicePrice={servicePrice}
            showStaffRewards={showStaffRewards}
            actorName={actorName}
            onCollapseNewComboSection={onCollapseNewComboSection}
          />
        </div>
      )}
    </div>
  );
}
