'use client';

import React from 'react';
import {
  getLashFamilyInfo,
  getWingsComboCategory,
  type IosCheckoutStaffOption,
  type MatchedComboPackageOption,
  type WingsComboCategoryId,
} from '@mos-lab/shared';
import { ArrowRightLeft, Check, Gem, Heart, Minus, Package, Plus, Sparkles, XCircle } from 'lucide-react';
import { SERUM_TIERS_CVL } from '../../../state/mockData';
import { CvFeather1Badge, CvFeather2Badge } from '../../ui-kit/CvFeatherLabels';

interface PostCheckoutComboFormSectionsProps {
  isDark: boolean;
  staffOptions: IosCheckoutStaffOption[];
  selectedCheckOutStaffId: number;
  originalCheckOutStaffId: number;
  originalCheckOutStaffName: string;
  onSelectStaff: (staff: IosCheckoutStaffOption) => void;
  activeCategoryId: WingsComboCategoryId;
  activeVolume: number | 'under';
  upperPackages: MatchedComboPackageOption[];
  selectedUpperComboId: string;
  onSelectCategory: (catId: WingsComboCategoryId) => void;
  onSelectVolume: (vol: number) => void;
  onSelectUpperComboId: (comboId: string) => void;
  underPackages: MatchedComboPackageOption[];
  selectedUnderComboId: string;
  onSelectUnderComboId: (comboId: string) => void;
  todaySingleServiceWaived: boolean;
  onSetTodaySingleServiceWaived: (waive: boolean) => void;
  yeppeumCount: number;
  selectedSerumTierId: string;
  onSetYeppeumCount: (count: number) => void;
  onSetSelectedSerumTierId: (tierId: string) => void;
  tipAmount: number;
  onSetTipAmount: (val: number) => void;
  diamondUsed: number;
  maxDiamonds: number;
  onSetDiamondUsed: (val: number) => void;
}

export function PostCheckoutComboFormSections({
  isDark,
  staffOptions,
  selectedCheckOutStaffId,
  originalCheckOutStaffId,
  originalCheckOutStaffName,
  onSelectStaff,
  activeCategoryId,
  activeVolume,
  upperPackages,
  selectedUpperComboId,
  onSelectCategory,
  onSelectVolume,
  onSelectUpperComboId,
  underPackages,
  selectedUnderComboId,
  onSelectUnderComboId,
  todaySingleServiceWaived,
  onSetTodaySingleServiceWaived,
  yeppeumCount,
  selectedSerumTierId,
  onSetYeppeumCount,
  onSetSelectedSerumTierId,
  tipAmount,
  onSetTipAmount,
  diamondUsed,
  maxDiamonds,
  onSetDiamondUsed,
}: PostCheckoutComboFormSectionsProps) {
  const currentCategory = getWingsComboCategory(activeCategoryId);
  const familyInfo = getLashFamilyInfo(activeCategoryId);
  const selectedStaff = staffOptions.find((s) => Number(s.staffId) === Number(selectedCheckOutStaffId));
  const isStaffChanged =
    originalCheckOutStaffId > 0 &&
    selectedCheckOutStaffId > 0 &&
    Number(selectedCheckOutStaffId) !== Number(originalCheckOutStaffId);

  const surfaceCls = isDark
    ? 'bg-[#1C1C1E] border-neutral-800 text-neutral-100'
    : 'bg-gray-50 border-gray-200 text-gray-900';

  return (
    <div className="space-y-3.5">
      {/* A. Chọn Người Chốt Gói (Checkout) */}
      <div className={`rounded-2xl border p-3 space-y-2 ${surfaceCls}`}>
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-800'}`}
          >
            1. Người Chốt Gói (Checkout)
          </span>
          <span className={`text-[10px] font-semibold ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
            Nhận điểm, thưởng gói & 10% Tip Out
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {staffOptions.map((st) => {
            const isActive = Number(st.staffId) === Number(selectedCheckOutStaffId);
            return (
              <button
                key={st.staffId}
                type="button"
                data-testid={`post-checkout-staff-${st.staffId}`}
                onClick={() => onSelectStaff(st)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? isDark
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                      : 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-400/40'
                    : isDark
                      ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-600'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {isActive && <Check className="w-3 h-3 text-amber-500 shrink-0" />}
                <span>{st.name}</span>
                {st.tier === 'CVL' ? (
                  <CvFeather1Badge />
                ) : st.tier === 'CVLL' ? (
                  <CvFeather2Badge />
                ) : (
                  <span
                    className={`px-1 py-0.5 rounded text-[9px] font-black leading-none ${
                      isDark ? 'bg-emerald-950/80 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    CC
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isStaffChanged && selectedStaff && (
          <div
            data-testid="post-checkout-staff-transfer-banner"
            className={`rounded-xl border p-2.5 text-[11px] font-semibold flex items-start gap-2 ${
              isDark
                ? 'bg-amber-950/50 border-amber-700/70 text-amber-200'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Đổi Người Checkout: <strong>{originalCheckOutStaffName}</strong> → <strong>{selectedStaff.name}</strong>.
              Toàn bộ Điểm, Bonus Gói Combo/Dưỡng mi & 10% Tip Checkout của đơn sẽ chuyển sang cho{' '}
              <strong>{selectedStaff.name}</strong> (lưu lịch sử đối soát).
            </span>
          </div>
        )}
      </div>

      {/* B. Gói Combo Mi Trên & Mi Dưới */}
      <div className={`rounded-2xl border p-3 space-y-2.5 ${surfaceCls}`}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            2. Gói Combo Mi Trên & Mi Dưới
          </span>
          {selectedUpperComboId && (
            <button
              type="button"
              onClick={() => onSelectUpperComboId('')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                isDark ? 'bg-rose-950/50 border-rose-700/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Hủy gói Mi Trên</span>
            </button>
          )}
        </div>

        {/* Category & Volume quick switcher */}
        <div className="flex flex-wrap gap-1.5">
          {familyInfo.siblings.map((sib) => (
            <button
              key={sib.categoryId}
              type="button"
              onClick={() => onSelectCategory(sib.categoryId)}
              className={`px-2 py-1 rounded-lg border text-[10.5px] font-bold cursor-pointer transition-all ${
                sib.categoryId === activeCategoryId
                  ? isDark
                    ? 'bg-purple-950/70 border-purple-400 text-purple-200'
                    : 'bg-purple-50 border-purple-500 text-purple-900'
                  : isDark
                    ? 'bg-neutral-900 border-neutral-700 text-neutral-400'
                    : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {sib.shortLabel}
            </button>
          ))}
        </div>

        {currentCategory.unitPrices.filter((u) => typeof u.volume === 'number').length > 0 && (
          <div className="flex flex-wrap gap-1">
            {currentCategory.unitPrices
              .filter((u) => typeof u.volume === 'number')
              .map((u) => (
                <button
                  key={String(u.volume)}
                  type="button"
                  onClick={() => onSelectVolume(Number(u.volume))}
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold tabular-nums cursor-pointer ${
                    activeVolume === u.volume
                      ? 'bg-[#FFB400] border-[#FFB400] text-black'
                      : isDark
                        ? 'bg-neutral-900 border-neutral-700 text-neutral-400'
                        : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {u.volume}K
                </button>
              ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-1.5">
          {upperPackages
            .filter((p) => !p.isLocked)
            .map((pkg) => {
              const selected = pkg.id === selectedUpperComboId;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  data-testid={`post-checkout-combo-${pkg.id}`}
                  onClick={() => onSelectUpperComboId(selected ? '' : pkg.id)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    selected
                      ? isDark
                        ? 'bg-purple-950/60 border-purple-400 text-purple-100'
                        : 'bg-purple-50 border-purple-500 text-purple-950'
                      : isDark
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-extrabold truncate flex items-center gap-1.5">
                      {selected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      <span>{pkg.displayName}</span>
                    </div>
                    <div className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-gray-500'} tabular-nums`}>
                      {pkg.totalSessions} buổi · HSD {pkg.validityMonths} tháng · Thưởng CVL +
                      {Math.round(pkg.cvBonus / 1000)}K
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-[12.5px] font-black text-amber-500">
                      {pkg.comboPrice.toLocaleString('vi-VN')} đ
                    </div>
                    <div className={`text-[9.5px] ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                      +{Math.round(pkg.comboPriceWithVat - pkg.comboPrice).toLocaleString('vi-VN')}đ VAT
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        {/* Gói Mi Dưới */}
        <div className="pt-1 border-t border-dashed border-neutral-700/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={`text-[10.5px] font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
              Gói Combo Mi Dưới (Tùy chọn)
            </span>
            {selectedUnderComboId && (
              <button
                type="button"
                onClick={() => onSelectUnderComboId('')}
                className="text-[10px] font-bold text-rose-400 cursor-pointer"
              >
                Bỏ chọn Mi Dưới
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {underPackages
              .filter((p) => !p.isLocked)
              .map((pkg) => {
                const selected = pkg.id === selectedUnderComboId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => onSelectUnderComboId(selected ? '' : pkg.id)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? isDark
                          ? 'bg-cyan-950/60 border-cyan-400 text-cyan-100'
                          : 'bg-cyan-50 border-cyan-500 text-cyan-950'
                        : isDark
                          ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                          : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold truncate">{pkg.shortRuleLabel}</div>
                    <div className="text-[11px] font-black text-amber-500 tabular-nums">
                      {pkg.comboPrice.toLocaleString('vi-VN')} đ
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Toggle Trừ buổi hôm nay vào Buổi 1 gói mới */}
        {(selectedUpperComboId || selectedUnderComboId) && (
          <div className="pt-1.5 border-t border-dashed border-neutral-700/40 flex gap-1.5">
            <button
              type="button"
              data-testid="post-checkout-waive-today-btn"
              onClick={() => onSetTodaySingleServiceWaived(true)}
              className={`flex-1 py-1.5 px-2 rounded-xl border text-[10.5px] font-bold cursor-pointer transition-all ${
                todaySingleServiceWaived
                  ? isDark
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-500 text-emerald-900'
                  : isDark
                    ? 'bg-neutral-900 border-neutral-700 text-neutral-400'
                    : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              ✓ Trừ buổi hôm nay vào Gói mới
            </button>
            <button
              type="button"
              data-testid="post-checkout-keep-retail-btn"
              onClick={() => onSetTodaySingleServiceWaived(false)}
              className={`flex-1 py-1.5 px-2 rounded-xl border text-[10.5px] font-bold cursor-pointer transition-all ${
                !todaySingleServiceWaived
                  ? isDark
                    ? 'bg-indigo-950/70 border-indigo-400 text-indigo-200'
                    : 'bg-indigo-50 border-indigo-500 text-indigo-900'
                  : isDark
                    ? 'bg-neutral-900 border-neutral-700 text-neutral-400'
                    : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              Giữ buổi lẻ · Cất trọn gói
            </button>
          </div>
        )}
      </div>

      {/* C. Dưỡng Mi Yeppeum + Tip + Kim Cương */}
      <div className={`rounded-2xl border p-3 space-y-2.5 ${surfaceCls}`}>
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-sky-300' : 'text-sky-800'}`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            3. Dưỡng Mi Yeppeum, Tip & Kim Cương
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold">Dưỡng Mi Yeppeum (6ml):</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSetYeppeumCount(Math.max(0, yeppeumCount - 1))}
              className={`w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer ${
                isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-gray-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-[13px] font-black tabular-nums">{yeppeumCount}</span>
            <button
              type="button"
              onClick={() => onSetYeppeumCount(yeppeumCount + 1)}
              className="w-7 h-7 rounded-full bg-[#FFB400] text-black flex items-center justify-center cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {yeppeumCount > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {SERUM_TIERS_CVL.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => onSetSelectedSerumTierId(tier.id)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold text-left cursor-pointer ${
                  selectedSerumTierId === tier.id
                    ? isDark
                      ? 'bg-sky-950/60 border-sky-400 text-sky-200'
                      : 'bg-sky-50 border-sky-500 text-sky-900'
                    : isDark
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <div className="truncate">{tier.label}</div>
                <div className="text-[9px] opacity-80">{tier.desc}</div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-neutral-700/40">
          <span className="text-[11.5px] font-bold inline-flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Tiền Tip (miễn VAT):</span>
          </span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {[0, 50000, 100000, 200000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => onSetTipAmount(amt)}
                className={`px-2 py-1 rounded-lg border text-[10.5px] font-bold tabular-nums cursor-pointer ${
                  tipAmount === amt
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : isDark
                      ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
                      : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                {amt === 0 ? '0đ' : `${amt / 1000}K`}
              </button>
            ))}
          </div>
        </div>

        {maxDiamonds > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-bold inline-flex items-center gap-1">
              <Gem className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dùng Ví Kim Cương (tối đa {maxDiamonds} 💎):</span>
            </span>
            <input
              type="number"
              min={0}
              max={maxDiamonds}
              value={diamondUsed}
              onChange={(e) =>
                onSetDiamondUsed(Math.max(0, Math.min(maxDiamonds, Math.round(Number(e.target.value) || 0))))
              }
              className={`w-20 px-2 py-1 rounded-lg border text-right text-[12px] font-bold tabular-nums ${
                isDark ? 'bg-neutral-900 border-neutral-700 text-cyan-300' : 'bg-white border-gray-300 text-cyan-900'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
