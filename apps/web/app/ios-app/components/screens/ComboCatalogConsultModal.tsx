'use client';

import React, { useState, useMemo } from 'react';
import {
  WINGS_COMBO_CATEGORIES,
  WingsComboCategoryId,
  MatchedComboPackageOption,
  WelcomeComboEligibilityResult,
  getWingsComboCategory,
  getVolumeFiberMeta,
  getComboPackagesForCategoryAndVolume,
  calculateComboPurchaseAccounting,
  formatComboConsultationQuote,
} from '@mos-lab/shared';
import {
  X,
  Sparkles,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  ZoomIn,
  Scale,
  Calculator,
  Calendar,
  Gift,
  ShieldCheck,
} from 'lucide-react';

interface ComboCatalogConsultModalProps {
  open: boolean;
  onClose: () => void;
  initialCategoryId?: WingsComboCategoryId;
  initialVolume?: number | 'under';
  welcomeEligibility: WelcomeComboEligibilityResult;
  selectedPackageId?: string | null;
  todaySingleServicePrice?: number;
  onSelectPackage: (pkg: MatchedComboPackageOption) => void;
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
}: ComboCatalogConsultModalProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<WingsComboCategoryId>(initialCategoryId);
  const [activeVolume, setActiveVolume] = useState<number | 'under'>(initialVolume);
  const [includeVat, setIncludeVat] = useState<boolean>(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomedCard, setZoomedCard] = useState<{ title: string; imageUrl: string } | null>(null);

  // Sync when modal opens with new initial props
  React.useEffect(() => {
    if (open) {
      setActiveCategoryId(initialCategoryId);
      setActiveVolume(initialVolume);
    }
  }, [open, initialCategoryId, initialVolume]);

  const currentCategory = useMemo(() => getWingsComboCategory(activeCategoryId), [activeCategoryId]);

  // Ensure activeVolume is valid for currentCategory
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
      getComboPackagesForCategoryAndVolume({
        categoryId: activeCategoryId,
        volume: effectiveVolume,
        welcomeEligibility,
        includeVvipPass: activeCategoryId !== 'VVIP',
      }),
    [activeCategoryId, effectiveVolume, welcomeEligibility]
  );

  // Build lookup of all compared packages across categories
  const comparedPackages = useMemo(() => {
    const list: MatchedComboPackageOption[] = [];
    for (const cid of compareIds) {
      const [catId, , volSlug] = cid.split(':');
      const vol = volSlug === 'under_390' ? 'under' : Number(volSlug) || effectiveVolume;
      const catPkgs = getComboPackagesForCategoryAndVolume({
        categoryId: catId || activeCategoryId,
        volume: vol,
        welcomeEligibility,
        includeVvipPass: true,
      });
      const found = catPkgs.find((p) => p.id === cid);
      if (found) list.push(found);
    }
    return list;
  }, [compareIds, activeCategoryId, effectiveVolume, welcomeEligibility]);

  if (!open) return null;

  const toggleCompare = (pkgId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(pkgId)) return prev.filter((id) => id !== pkgId);
      if (prev.length >= 3) return [...prev.slice(1), pkgId];
      return [...prev, pkgId];
    });
  };

  const handleCopyQuote = async (pkg: MatchedComboPackageOption) => {
    const text = formatComboConsultationQuote(pkg, includeVat);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback ignored
    }
    setCopiedId(pkg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F2F2F7] select-none overflow-hidden">
      {/* Header */}
      <div className="bg-[#1C1C1E] text-white px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-3 flex items-center justify-between border-b border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#FFB400]" />
            <h2 className="text-[15px] font-black tracking-tight text-white">Bàn Tư Vấn & Bảng Giá 13 Dòng Mi Combo</h2>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Chuẩn hóa 100% bảng giá Wings · Tự động hạch toán & trừ buổi đầu vào gói
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-24">
        {/* Welcome Package Eligibility Banner */}
        <div
          className={`rounded-2xl p-3 border flex items-start gap-2.5 ${
            welcomeEligibility.eligible ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          {welcomeEligibility.eligible ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div
              className={`text-[11px] font-extrabold uppercase tracking-wide ${
                welcomeEligibility.eligible ? 'text-emerald-800' : 'text-amber-900'
              }`}
            >
              {welcomeEligibility.badgeText}
            </div>
            <div className="text-[11px] text-gray-700 mt-0.5 leading-snug">{welcomeEligibility.reason}</div>
          </div>
        </div>

        {/* Step 1: 13 Lash Categories Horizontal/Grid Selector */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
              1. Chọn Dòng Mi (13 Dòng Chuẩn Wings)
            </span>
            <button
              type="button"
              onClick={() => setIncludeVat((v) => !v)}
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                includeVat
                  ? 'bg-[#1C1C1E] text-[#FFB400] border-[#FFB400]'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {includeVat ? '✓ Giá đã gồm 8% VAT' : 'Giá chưa VAT (Bấm bật +8% VAT)'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WINGS_COMBO_CATEGORIES.map((cat) => {
              const active = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1C1C1E] text-[#FFB400] shadow-xs ring-1 ring-[#FFB400]'
                      : 'bg-[#F2F2F7] text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Volume / Fiber Count Selector */}
        {currentCategory.unitPrices.length > 0 && (
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                2. Chọn Mã Số Sợi / Trụ ({currentCategory.name})
              </span>
              <span className="text-[10px] font-semibold text-gray-500">{currentCategory.segment}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {currentCategory.unitPrices.map((u) => {
                const volKey: number | 'under' = u.isUnderLash ? 'under' : Number(u.volume);
                const active = effectiveVolume === volKey;
                const meta = getVolumeFiberMeta(currentCategory.id, volKey);
                return (
                  <button
                    key={String(u.volume)}
                    type="button"
                    onClick={() => setActiveVolume(volKey)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      active ? 'bg-amber-50 border-[#FF9500] shadow-xs' : 'bg-[#F9F9FB] border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[12px] font-extrabold text-black">
                        {u.isUnderLash ? 'Mi Dưới 390' : `Mã ${u.volume}`}
                      </span>
                      {meta.badge && (
                        <span className="text-[9px] font-black bg-[#FFB400] text-black px-1.5 py-0.5 rounded-full">
                          {meta.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-600 font-medium mt-0.5 truncate">{meta.fanLabel}</div>
                    <div className="text-[10px] text-emerald-700 font-bold mt-0.5 tabular-nums">
                      Lẻ: {u.newPrice.toLocaleString('vi-VN')}đ
                      {u.refillPrice ? ` · Dặm: ${u.refillPrice.toLocaleString('vi-VN')}đ` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparison Drawer/Card if any package is in compareIds */}
        {comparedPackages.length > 0 && (
          <div className="bg-[#1C1C1E] text-white rounded-2xl p-3 shadow-md border border-[#FFB400]/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#FFB400] uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                Bàn Cân So Sánh Trực Tiếp ({comparedPackages.length}/3 Gói)
              </span>
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Xóa so sánh
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {comparedPackages.map((cp) => {
                const displayPrice = includeVat ? cp.comboPriceWithVat : cp.comboPrice;
                const accounting = calculateComboPurchaseAccounting(cp, todaySingleServicePrice);
                return (
                  <div
                    key={cp.id}
                    className="bg-white/10 rounded-xl p-2.5 border border-white/15 flex flex-col justify-between space-y-1.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[12px] font-black text-[#FFB400] leading-tight">{cp.displayName}</span>
                        <button
                          type="button"
                          onClick={() => toggleCompare(cp.id)}
                          className="text-neutral-400 hover:text-white text-[11px]"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-[10px] text-neutral-300 mt-0.5">{cp.readableContent}</div>
                    </div>
                    <div className="space-y-0.5 text-[10px] border-t border-white/10 pt-1.5 tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Giá gói:</span>
                        <span className="font-black text-white">{displayPrice.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Tiết kiệm:</span>
                        <span className="font-bold text-emerald-400">
                          -{cp.savingsAmount.toLocaleString('vi-VN')}đ (+{cp.discountPct}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">TB mỗi lần:</span>
                        <span className="font-bold text-amber-300">
                          ~{cp.avgPerSessionPrice.toLocaleString('vi-VN')}đ/lần
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Trừ hôm nay:</span>
                        <span className="font-bold text-sky-300">
                          Còn {accounting.remainingWalletAfterToday.totalRemaining}/{cp.totalSessions} lần
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Package Cards List */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider px-1">
            3. Danh Sách Gói Ưu Đãi ({packages.length} Gói)
          </div>

          {packages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const isCompared = compareIds.includes(pkg.id);
            const displayPrice = includeVat ? pkg.comboPriceWithVat : pkg.comboPrice;
            const accounting = calculateComboPurchaseAccounting(pkg, todaySingleServicePrice);

            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl p-3 shadow-xs border-2 transition-all space-y-2.5 ${
                  pkg.isLocked
                    ? 'border-gray-200 opacity-75 bg-gray-50'
                    : isSelected
                      ? 'border-[#FF9500] bg-amber-50/30'
                      : 'border-neutral-200'
                }`}
              >
                <div className="flex gap-3">
                  {/* Card Artwork Preview */}
                  {pkg.cardPreviewUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedCard({
                          title: pkg.displayName,
                          imageUrl: pkg.cardImageUrl || pkg.cardPreviewUrl,
                        })
                      }
                      className="relative w-20 h-24 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-neutral-200 group cursor-pointer"
                    >
                      <img src={pkg.cardPreviewUrl} alt={pkg.displayName} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white p-1 rounded-md">
                        <ZoomIn className="w-3 h-3" />
                      </span>
                    </button>
                  )}

                  {/* Main Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[14px] font-black text-black leading-snug">{pkg.ruleName}</span>
                          {pkg.isWelcomePackage && (
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                pkg.isLocked ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {pkg.isLocked ? '🔒 Welcome · Chỉ ngày đầu' : '🌟 Welcome · Ngày đầu'}
                            </span>
                          )}
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full tabular-nums">
                            Ưu đãi +{pkg.discountPct}%
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-gray-600 mt-0.5">
                          {pkg.categoryName} · {pkg.volumeMeta.detailLabel}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[15px] font-black text-[#FF9500] tabular-nums">
                          {displayPrice.toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-[10px] text-gray-400 line-through tabular-nums">
                          Lẻ: {pkg.retailTotal.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    </div>

                    {/* Session & Bonus Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                        <Gift className="w-3 h-3" />
                        {pkg.readableContent}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-md">
                        <Calendar className="w-3 h-3" />
                        HSD: {pkg.validityMonths} tháng
                      </span>
                      <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-md tabular-nums">
                        Thưởng CV🪶: +{pkg.cvBonus.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accounting & Immediate Deduction Preview Box */}
                <div className="bg-[#F9F9FB] rounded-xl p-2.5 border border-gray-200 text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-bold text-gray-800">
                    <span className="flex items-center gap-1 text-indigo-900">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      Hạch toán & Trừ gói ngay hôm nay:
                    </span>
                    <span className="text-emerald-700 font-extrabold tabular-nums">
                      ~{pkg.avgPerSessionPrice.toLocaleString('vi-VN')}đ / buổi
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-600 pt-0.5 tabular-nums">
                    <div>
                      • Buổi làm hôm nay: <strong className="text-emerald-700">0đ (Trừ luôn buổi 1 vào gói)</strong>
                    </div>
                    <div>
                      • Ví còn sau hôm nay:{' '}
                      <strong className="text-black">
                        {accounting.remainingWalletAfterToday.totalRemaining}/{pkg.totalSessions} buổi
                      </strong>{' '}
                      ({accounting.remainingWalletAfterToday.totalPaidRemaining} Mua +{' '}
                      {accounting.remainingWalletAfterToday.totalBonusRemaining} Tặng 0đ)
                    </div>
                    <div>
                      • Doanh thu thực hiện hôm nay:{' '}
                      <strong className="text-black">
                        {accounting.recognizedRevenueToday.toLocaleString('vi-VN')}đ
                      </strong>
                    </div>
                    <div>
                      • Doanh thu giữ trong ví (Deferred):{' '}
                      <strong className="text-indigo-700">
                        {accounting.deferredRevenueBalance.toLocaleString('vi-VN')}đ
                      </strong>
                    </div>
                  </div>
                </div>

                {pkg.isLocked && pkg.lockReason && (
                  <div className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>{pkg.lockReason}</span>
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => toggleCompare(pkg.id)}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                      isCompared
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    {isCompared ? 'Đang so sánh' : 'So sánh'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCopyQuote(pkg)}
                    className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedId === pkg.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy báo giá</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={pkg.isLocked}
                    onClick={() => {
                      onSelectPackage(pkg);
                      onClose();
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                      pkg.isLocked
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : isSelected
                          ? 'bg-emerald-600 text-white shadow-xs cursor-pointer'
                          : 'bg-[#FFB400] text-black shadow-xs active:scale-98 cursor-pointer'
                    }`}
                  >
                    {pkg.isLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Đã khóa (Qua ngày đầu)</span>
                      </>
                    ) : isSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đang chọn gói này</span>
                      </>
                    ) : (
                      <span>Chọn gói này ({displayPrice.toLocaleString('vi-VN')}đ)</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Card Artwork Zoom Modal */}
      {zoomedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setZoomedCard(null)}
        >
          <div className="w-full max-w-md flex items-center justify-between text-white mb-3">
            <span className="text-[14px] font-bold">{zoomedCard.title}</span>
            <button
              type="button"
              onClick={() => setZoomedCard(null)}
              className="px-3 py-1 rounded-full bg-white/15 text-[12px] font-bold"
            >
              Đóng ✕
            </button>
          </div>
          <img
            src={zoomedCard.imageUrl}
            alt={zoomedCard.title}
            className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
