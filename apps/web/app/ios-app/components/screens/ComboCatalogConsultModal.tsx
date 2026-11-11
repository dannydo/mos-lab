'use client';

import React, { useState, useMemo } from 'react';
import {
  WingsComboCategoryId,
  MatchedComboPackageOption,
  WelcomeComboEligibilityResult,
  getWingsComboCategory,
  getVolumeFiberMeta,
  getComboPackagesForCategoryAndVolume,
  getUnderLashComboPackages,
  calculateComboPurchaseAccounting,
  getLashFamilyInfo,
  resolveValidVolumeForCategory,
} from '@mos-lab/shared';
import { X, Sparkles, Eye, Lock, Info, Leaf, Zap, Crown, Check, Layers, Feather } from 'lucide-react';
import { WingsUnifiedComboCard } from '../ui-kit/WingsUnifiedComboCard';
import { useTheme } from '../../../../context/ThemeContext';

export interface ComboCatalogConsultModalProps {
  open: boolean;
  onClose: () => void;
  initialCategoryId?: WingsComboCategoryId;
  initialVolume?: number | 'under';
  welcomeEligibility: WelcomeComboEligibilityResult;
  selectedPackageId?: string | null;
  todaySingleServicePrice?: number;
  onSelectPackage?: (pkg: MatchedComboPackageOption) => void;
  initialSelectedUpperPkg?: MatchedComboPackageOption | null;
  initialSelectedUnderPkg?: MatchedComboPackageOption | null;
  onApplyPackages?: (payload: {
    upperPkg: MatchedComboPackageOption | null;
    underPkg: MatchedComboPackageOption | null;
  }) => void;
  customerName?: string;
  customerPhone?: string;
  customerAvatar?: string;
}

// 7 Họ Mi & Gói của Wings: Classic -> Volume -> Mink -> IvyLight -> HyperLight -> UltraLight -> VVIP
const LASH_FAMILIES: Array<{
  familyKey: string;
  name: string;
  renderIcon: (active: boolean) => React.ReactNode;
  defaultCategory: WingsComboCategoryId;
  categories: WingsComboCategoryId[];
}> = [
  {
    familyKey: 'Classic',
    name: 'Classic',
    renderIcon: (active) => <Eye className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-blue-500' : 'text-neutral-500'}`} />,
    defaultCategory: 'Classic_1D',
    categories: ['Classic_1D', 'Classic_Volume'],
  },
  {
    familyKey: 'Volume',
    name: 'Volume',
    renderIcon: (active) => (
      <Layers className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-teal-500' : 'text-neutral-500'}`} />
    ),
    defaultCategory: 'Volume_2D',
    categories: ['Volume_2D', 'Volume_3D'],
  },
  {
    familyKey: 'Mink',
    name: 'Mink 𝓜',
    renderIcon: (active) => (
      <Sparkles className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-400' : 'text-neutral-500'}`} />
    ),
    defaultCategory: 'FlawlessMink',
    categories: ['FlawlessMink'],
  },
  {
    familyKey: 'IvyLight',
    name: 'IvyLight',
    renderIcon: (active) => (
      <Leaf className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-600' : 'text-neutral-500'}`} />
    ),
    defaultCategory: 'IvyLight_4L',
    categories: ['IvyLight_3L', 'IvyLight_4L', 'IvyLight_5L'],
  },
  {
    familyKey: 'HyperLight',
    name: 'HyperLight',
    renderIcon: (active) => (
      <Zap className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-500' : 'text-neutral-500'}`} />
    ),
    defaultCategory: 'HyperLight_4X',
    categories: ['HyperLight_2X', 'HyperLight_3X', 'HyperLight_4X', 'HyperLight_5X'],
  },
  {
    familyKey: 'UltraLight',
    name: 'UltraLight',
    renderIcon: (active) => (
      <Feather className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-500' : 'text-neutral-500'}`} />
    ),
    defaultCategory: 'UltraLight_4D',
    categories: ['UltraLight_3D', 'UltraLight_4D', 'UltraLight_5D'],
  },
  {
    familyKey: 'VVIP',
    name: 'VVIP',
    renderIcon: (active) => (
      <Crown className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-500' : 'text-neutral-500'}`} />
    ),
    defaultCategory: 'VVIP',
    categories: ['VVIP'],
  },
];

function formatCompactVnd(amount: number): string {
  if (!amount || amount <= 0) return '0đ';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}M`;
  }
  return `${Math.round(amount / 1_000)}K`;
}

export function ComboCatalogConsultModal({
  open,
  onClose,
  initialCategoryId = 'FlawlessMink',
  initialVolume = 770,
  welcomeEligibility,
  selectedPackageId,
  todaySingleServicePrice,
  onSelectPackage,
  initialSelectedUpperPkg,
  initialSelectedUnderPkg,
  onApplyPackages,
  customerName,
  customerPhone,
  customerAvatar,
}: ComboCatalogConsultModalProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [activeCategoryId, setActiveCategoryId] = useState<WingsComboCategoryId>(
    initialVolume === 'under' ? 'FlawlessMink' : initialCategoryId
  );
  const [activeVolume, setActiveVolume] = useState<number | 'under'>(initialVolume);
  const [savedUpperCategory, setSavedUpperCategory] = useState<WingsComboCategoryId>(
    initialCategoryId === 'VVIP' ? 'FlawlessMink' : initialCategoryId
  );
  const [includeVat, setIncludeVat] = useState<boolean>(false);
  const [lockedModalOpen, setLockedModalOpen] = useState<boolean>(false);
  const [tempSelectedUpper, setTempSelectedUpper] = useState<MatchedComboPackageOption | null>(
    initialSelectedUpperPkg || null
  );
  const [tempSelectedUnder, setTempSelectedUnder] = useState<MatchedComboPackageOption | null>(
    initialSelectedUnderPkg || null
  );

  // Sync khi modal mở
  React.useEffect(() => {
    if (open) {
      const initCat = initialVolume === 'under' ? 'FlawlessMink' : initialCategoryId;
      setActiveCategoryId(initCat);
      if (initialVolume !== 'under') {
        setSavedUpperCategory(initialCategoryId);
      }
      setActiveVolume(initialVolume);
      setTempSelectedUpper(initialSelectedUpperPkg || null);
      setTempSelectedUnder(initialSelectedUnderPkg || null);
    }
  }, [open, initialCategoryId, initialVolume, initialSelectedUpperPkg, initialSelectedUnderPkg]);

  const currentCategory = useMemo(() => getWingsComboCategory(activeCategoryId), [activeCategoryId]);

  // Nhận diện Họ Mi hiện tại
  const currentFamily = useMemo(
    () => LASH_FAMILIES.find((f) => f.categories.includes(activeCategoryId)) || LASH_FAMILIES[0],
    [activeCategoryId]
  );

  const familySiblings = useMemo(() => {
    const info = getLashFamilyInfo(activeCategoryId);
    return info.siblings || [];
  }, [activeCategoryId]);

  // Đảm bảo volume hợp lệ cho category đang chọn
  const effectiveVolume = useMemo<number | 'under'>(() => {
    if (currentCategory.id === 'VVIP') return activeVolume;
    const exists = currentCategory.unitPrices.some((u) =>
      activeVolume === 'under' ? u.isUnderLash || u.volume === 'under' : Number(u.volume) === Number(activeVolume)
    );
    if (exists) return activeVolume;
    const firstNormal = currentCategory.unitPrices.find((u) => !u.isUnderLash && typeof u.volume === 'number');
    return firstNormal ? Number(firstNormal.volume) : 770;
  }, [currentCategory, activeVolume]);

  const packages = useMemo(
    () =>
      effectiveVolume === 'under'
        ? getUnderLashComboPackages(welcomeEligibility)
        : getComboPackagesForCategoryAndVolume({
            categoryId: activeCategoryId,
            volume: effectiveVolume,
            welcomeEligibility,
            includeVvipPass: activeCategoryId !== 'VVIP',
          }),
    [activeCategoryId, effectiveVolume, welcomeEligibility]
  );

  if (!open) return null;

  const handleSelectFamily = (familyKey: string) => {
    const fam = LASH_FAMILIES.find((f) => f.familyKey === familyKey);
    if (!fam) return;
    const targetCat = fam.categories.includes(activeCategoryId) ? activeCategoryId : fam.defaultCategory;
    setActiveCategoryId(targetCat);
    const validVol = resolveValidVolumeForCategory(targetCat, effectiveVolume);
    setActiveVolume(validVol);
  };

  const handleSelectSibling = (targetCatId: WingsComboCategoryId) => {
    setActiveCategoryId(targetCatId);
    const validVol = resolveValidVolumeForCategory(targetCatId, effectiveVolume);
    setActiveVolume(validVol);
  };

  const isUnderTab = effectiveVolume === 'under';
  const currentSelectedPkgId = isUnderTab
    ? tempSelectedUnder?.id || null
    : tempSelectedUpper?.id || selectedPackageId || null;

  const selectedPkgsList = [tempSelectedUpper, tempSelectedUnder].filter(Boolean) as MatchedComboPackageOption[];
  const totalSelectedCount = selectedPkgsList.length;
  const totalSelectedPrice = selectedPkgsList.reduce((acc, p) => {
    const price = includeVat ? p.comboPriceWithVat : p.comboPrice;
    return acc + price;
  }, 0);

  const handleApply = () => {
    if (onApplyPackages) {
      onApplyPackages({
        upperPkg: tempSelectedUpper,
        underPkg: tempSelectedUnder,
      });
    } else if (onSelectPackage) {
      if (tempSelectedUpper) onSelectPackage(tempSelectedUpper);
      else if (tempSelectedUnder) onSelectPackage(tempSelectedUnder);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none overflow-hidden animate-in fade-in duration-200">
      <div
        className={`w-full max-w-[430px] h-full max-h-[100dvh] flex flex-col relative overflow-hidden shadow-2xl ${
          isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-neutral-900'
        }`}
      >
        {/* iOS Minimal Navigation Bar */}
        <div className="bg-[#1C1C1E] text-white px-3.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2.5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-4 h-4 text-[#FFB400] shrink-0" />
            <h2 className="text-[15px] font-black tracking-tight text-white truncate">Bảng Giá Combo</h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIncludeVat((v) => !v)}
              className={`text-[10px] font-black px-2 py-1 rounded-full border transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                includeVat
                  ? 'bg-[#FFB400] text-black border-[#FFB400] shadow-xs'
                  : 'bg-white/10 text-neutral-300 border-white/15 hover:bg-white/20'
              }`}
              title="Bật/tắt hiển thị giá đã bao gồm 8% thuế VAT"
            >
              {includeVat && <Check className="w-3 h-3 text-black stroke-[3]" />}
              <span>{includeVat ? 'VAT 8% (Đã gồm)' : '+8% VAT'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 pb-20 no-scrollbar">
          {/* 1. iOS Segmented Control: Mi Trên vs Mi Dưới */}
          <div
            className={`p-0.5 rounded-xl grid grid-cols-2 gap-1 text-[12px] font-bold ${
              isDark ? 'bg-[#2C2C2E]' : 'bg-[#E5E5EA]'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (effectiveVolume === 'under') {
                  const targetCat =
                    savedUpperCategory && savedUpperCategory !== 'VVIP' ? savedUpperCategory : 'FlawlessMink';
                  setActiveCategoryId(targetCat);
                  const catObj = getWingsComboCategory(targetCat);
                  const firstNormal = catObj.unitPrices.find((u) => !u.isUnderLash && typeof u.volume === 'number');
                  setActiveVolume(firstNormal ? Number(firstNormal.volume) : 770);
                }
              }}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                effectiveVolume !== 'under'
                  ? isDark
                    ? 'bg-[#1C1C1E] text-white shadow-xs font-black'
                    : 'bg-white text-black shadow-xs font-black'
                  : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-500 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Mi Trên</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (effectiveVolume !== 'under') {
                  setSavedUpperCategory(activeCategoryId);
                  setActiveCategoryId('FlawlessMink');
                  setActiveVolume('under');
                }
              }}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                effectiveVolume === 'under'
                  ? isDark
                    ? 'bg-[#1C1C1E] text-purple-300 shadow-xs font-black'
                    : 'bg-white text-purple-700 shadow-xs font-black'
                  : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-500 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mi Dưới</span>
              </span>
            </button>
          </div>

          {/* 2. Bộ chọn Các Họ Mi & Gói lớn (Segmented Tabs chuẩn iOS) */}
          {effectiveVolume !== 'under' && (
            <div
              className={`rounded-2xl p-2.5 shadow-2xs border space-y-2 ${
                isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-200/80'
              }`}
            >
              {/* Top row: Các họ mi chính: Classic -> Volume -> Mink -> IvyLight -> HyperLight -> UltraLight -> VVIP */}
              <div
                className={`flex items-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-xl ${
                  isDark ? 'bg-neutral-900' : 'bg-[#F2F2F7]'
                }`}
              >
                {LASH_FAMILIES.map((fam) => {
                  const active = fam.familyKey === currentFamily.familyKey;
                  return (
                    <button
                      key={fam.familyKey}
                      type="button"
                      onClick={() => handleSelectFamily(fam.familyKey)}
                      className={`flex-1 shrink-0 px-2 py-1.5 rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        active
                          ? isDark
                            ? 'bg-[#2C2C2E] text-white shadow-xs font-black'
                            : 'bg-white text-black shadow-xs font-black'
                          : isDark
                            ? 'text-neutral-400 hover:text-white font-bold'
                            : 'text-neutral-500 hover:text-neutral-800 font-bold'
                      }`}
                    >
                      <div className="w-full h-4 flex items-center justify-center mb-0.5 shrink-0">
                        {fam.renderIcon(active)}
                      </div>
                      <span className="text-[10px] leading-tight whitespace-nowrap text-center block">{fam.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-tier row: các cấp độ thuộc họ (3ℓ, 4ℓ, 5ℓ / 2X, 3X, 4X...) */}
              {familySiblings.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  {familySiblings.map((sib) => {
                    const active = activeCategoryId === sib.categoryId;
                    return (
                      <button
                        key={sib.categoryId}
                        type="button"
                        onClick={() => handleSelectSibling(sib.categoryId as WingsComboCategoryId)}
                        className={`flex-1 min-w-[70px] py-1 px-2 rounded-lg text-center text-[11px] font-black transition-all cursor-pointer ${
                          active
                            ? 'bg-[#FFB400] text-black shadow-2xs'
                            : isDark
                              ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                              : 'bg-[#F2F2F7] text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {sib.shortLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Bộ chọn Độ Dày (Số sợi / Trụ) — Thanh ngang 1 dòng Segmented Pill (Ẩn khi chọn Mi Dưới) */}
          {effectiveVolume !== 'under' && currentCategory.unitPrices.filter((u) => !u.isUnderLash).length > 0 && (
            <div
              className={`rounded-2xl p-2.5 shadow-2xs border ${
                isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-200/80'
              }`}
            >
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span
                  className={`text-[11px] font-extrabold uppercase px-1 shrink-0 flex items-center gap-1 ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Độ dày:</span>
                </span>
                <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {currentCategory.unitPrices
                    .filter((u) => !u.isUnderLash)
                    .map((u) => {
                      const volKey: number = Number(u.volume);
                      const active = effectiveVolume === volKey;
                      const meta = getVolumeFiberMeta(currentCategory.id, volKey);
                      const label = `${meta.countPerEye} ${meta.unitWord}`;
                      const rawPrice = u.newPrice;
                      const effectivePrice = includeVat ? Math.round(rawPrice * 1.08) : rawPrice;
                      const compactPrice = formatCompactVnd(effectivePrice);
                      return (
                        <button
                          key={String(u.volume)}
                          type="button"
                          onClick={() => setActiveVolume(volKey)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                            active
                              ? 'bg-[#FFB400] text-black shadow-xs'
                              : isDark
                                ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                : 'bg-[#F2F2F7] text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <span>{label}</span>
                          <span
                            className={`text-[9.5px] font-bold tabular-nums ${
                              active
                                ? isDark
                                  ? 'text-neutral-900 font-extrabold'
                                  : 'text-neutral-900'
                                : isDark
                                  ? 'text-neutral-400'
                                  : 'text-neutral-500'
                            }`}
                          >
                            {compactPrice}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* 4. Thẻ Gói Combo Unified Card */}
          <div>
            <WingsUnifiedComboCard
              packages={packages}
              customerName={customerName}
              customerPhone={customerPhone}
              customerAvatar={customerAvatar}
              selectedPackageId={currentSelectedPkgId}
              includeVat={includeVat}
              onSelectPackage={(pkg) => {
                if (pkg.volume === 'under') {
                  setTempSelectedUnder((prev) => (prev?.id === pkg.id ? null : pkg));
                } else {
                  setTempSelectedUpper((prev) => (prev?.id === pkg.id ? null : pkg));
                }
              }}
              onSelectLocked={() => {
                setLockedModalOpen(true);
              }}
            />
          </div>
        </div>

        {/* Floating Bottom Action Bar */}
        <div className="sticky bottom-0 bg-[#1C1C1E]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center justify-between z-30 shrink-0 shadow-2xl">
          <div className="flex flex-col font-variant-numeric tabular-nums min-w-0 pr-2">
            <div className="text-[11px] font-bold text-neutral-400 truncate flex items-center gap-1.5">
              {totalSelectedCount > 0 ? (
                <>
                  <span>
                    Đã chọn <strong className="text-white">{totalSelectedCount}</strong> gói:
                  </span>
                  {tempSelectedUpper && (
                    <span className="inline-flex items-center gap-0.5 text-amber-300 font-extrabold text-[10.5px]">
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>Trên</span>
                    </span>
                  )}
                  {tempSelectedUnder && (
                    <span className="inline-flex items-center gap-0.5 text-purple-300 font-extrabold text-[10.5px]">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Dưới</span>
                    </span>
                  )}
                </>
              ) : (
                <span>Chưa chọn gói nào</span>
              )}
            </div>
            <div className="text-[16px] font-black text-[#FFB400] leading-tight mt-0.5 flex items-baseline gap-1.5">
              <span>{totalSelectedPrice.toLocaleString('vi-VN')}đ</span>
              {includeVat && <span className="text-[9.5px] font-bold text-emerald-400">(Đã gồm 8% VAT)</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-full bg-[#FFB400] text-black text-[13px] font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Áp Dụng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal giải thích gói Welcome 2 tặng 1 bị khóa (khi click vào icon Lock) */}
      {lockedModalOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLockedModalOpen(false)}
        >
          <div
            className={`rounded-2xl p-4 max-w-sm w-full space-y-3 shadow-xl animate-in zoom-in-95 duration-150 ${
              isDark ? 'bg-[#1C1C1E] text-white border border-neutral-800' : 'bg-white text-neutral-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-amber-950/80 text-amber-400' : 'bg-amber-100 text-amber-600'
                }`}
              >
                <Lock className="w-4 h-4" />
              </div>
              <div className={`font-extrabold text-[14px] ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                Khóa Gói Welcome 2 Tặng 1
              </div>
            </div>
            <p className={`text-[12px] leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              {welcomeEligibility.reason ||
                'Gói Welcome (2 tặng 1) là đặc quyền chỉ dành riêng cho khách hàng mua trong lần ghé đầu tiên.'}
            </p>
            <button
              type="button"
              onClick={() => setLockedModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#FFB400] text-black font-extrabold text-[12px] active:scale-98 transition-transform cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
