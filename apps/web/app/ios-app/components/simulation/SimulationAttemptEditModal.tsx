'use client';

import React, { useState, useMemo } from 'react';
import { X, Edit3, Sparkles, Plus, Minus, Trash2, Check, Loader2, Play } from 'lucide-react';
import type { IosSimulationAttemptSummary, IosUpdateSimulationAttemptRequest } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { FeatherSvg } from '../ui-kit/CvFeatherLabels';

interface SimulationAttemptEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: IosSimulationAttemptSummary;
  bookingId: number;
  onSave: (attemptId: string, updates: IosUpdateSimulationAttemptRequest) => Promise<void>;
  onApplyToWorkspace?: (attempt: IosSimulationAttemptSummary) => void;
  isBusy?: boolean;
}

const COMMON_STYLES = ['Natural', 'Katun', 'Baby Doll', 'Sexy', 'Whispy', 'Mắt Mèo', 'Thiết Kế Riêng'];

const COMMON_COMBOS = [
  { name: 'Không dùng Combo', price: 0 },
  { name: 'Gói 3 Lần (Tiết kiệm)', price: 1170000 },
  { name: 'Gói 5 Lần (Phổ biến)', price: 1850000 },
  { name: 'Gói 10 Lần (VIP)', price: 3500000 },
];

const COMMON_UNDER_COMBOS = [
  { name: 'Không dùng Mi Dưới', price: 0 },
  { name: 'Mi Dưới 3 Lần', price: 450000 },
  { name: 'Mi Dưới 5 Lần', price: 700000 },
];

const COMMON_PRODUCTS = [
  { productName: 'Serum Dưỡng Mi Wings', price: 299000 },
  { productName: 'Mascara Chuyên Nối Mi', price: 199000 },
  { productName: 'Gel Tháo Mi Dưỡng Ẩm', price: 120000 },
  { productName: 'Bọt Vệ Sinh Mi Kháng Khuẩn', price: 150000 },
];

export function SimulationAttemptEditModal({
  isOpen,
  onClose,
  attempt,
  bookingId,
  onSave,
  onApplyToWorkspace,
  isBusy = false,
}: SimulationAttemptEditModalProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [notes, setNotes] = useState<string>(attempt.notes || '');
  const [selectedStyle, setSelectedStyle] = useState<string>(attempt.selectedStyle || 'Natural');
  const [comboName, setComboName] = useState<string>(attempt.selectedComboName || '');
  const [comboPrice, setComboPrice] = useState<number>(attempt.selectedComboPrice || 0);
  const [underComboName, setUnderComboName] = useState<string>(attempt.selectedUnderComboName || '');
  const [underComboPrice, setUnderComboPrice] = useState<number>(attempt.selectedUnderComboPrice || 0);
  const [upsellProducts, setUpsellProducts] = useState<
    Array<{ productName: string; quantity: number; totalPrice: number }>
  >(attempt.upsellProducts || []);
  const [promotionName, setPromotionName] = useState<string>(attempt.promotionName || '');
  const [promotionDiscount, setPromotionDiscount] = useState<number>(attempt.promotionDiscountAmount || 0);
  const [tipAmount, setTipAmount] = useState<number>(attempt.tipAmount || 0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Realtime calculated metrics
  const upsellTotal = useMemo(() => {
    return upsellProducts.reduce((sum, p) => sum + p.totalPrice, 0);
  }, [upsellProducts]);

  const servicePrice = Number(attempt.servicePrice) || 0;

  const grandTotal = useMemo(() => {
    return Math.max(0, servicePrice + comboPrice + underComboPrice + upsellTotal - promotionDiscount + tipAmount);
  }, [servicePrice, comboPrice, underComboPrice, upsellTotal, promotionDiscount, tipAmount]);

  const estimatedReward = useMemo(() => {
    const comboBonus = comboPrice > 0 ? (comboPrice >= 1000000 ? 50000 : 30000) : 0;
    const serumBonus = upsellProducts.some((p) => /serum/i.test(p.productName)) ? 20000 : 0;
    const tipShare = Math.round(tipAmount * 0.8);
    return Math.round(servicePrice * 0.1 + comboBonus + serumBonus + tipShare);
  }, [servicePrice, comboPrice, upsellProducts, tipAmount]);

  const cvPoints = useMemo(() => {
    let pts = attempt.cvRotationPoints || 1;
    if (comboPrice > 0) pts += 1;
    if (upsellProducts.length > 0) pts += 1;
    return pts;
  }, [attempt.cvRotationPoints, comboPrice, upsellProducts]);

  if (!isOpen) return null;

  const handleToggleProduct = (item: { productName: string; price: number }) => {
    const existing = upsellProducts.find((p) => p.productName === item.productName);
    if (existing) {
      setUpsellProducts(upsellProducts.filter((p) => p.productName !== item.productName));
    } else {
      setUpsellProducts([...upsellProducts, { productName: item.productName, quantity: 1, totalPrice: item.price }]);
    }
  };

  const handleQuantityChange = (productName: string, delta: number) => {
    const catalogItem = COMMON_PRODUCTS.find((p) => p.productName === productName);
    const unitPrice = catalogItem ? catalogItem.price : 0;
    setUpsellProducts((prev) =>
      prev
        .map((p) => {
          if (p.productName !== productName) return p;
          const nextQ = p.quantity + delta;
          if (nextQ <= 0) return null;
          const uPrice = unitPrice || p.totalPrice / p.quantity;
          return { ...p, quantity: nextQ, totalPrice: uPrice * nextQ };
        })
        .filter(Boolean) as Array<{ productName: string; quantity: number; totalPrice: number }>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSave(attempt.attemptId, {
        bookingId,
        notes: notes.trim(),
        selectedStyle,
        selectedComboName: comboName ? comboName : null,
        selectedComboPrice: comboPrice,
        selectedUnderComboName: underComboName ? underComboName : null,
        selectedUnderComboPrice: underComboPrice,
        upsellProducts,
        promotionName: promotionName ? promotionName : null,
        promotionDiscountAmount: promotionDiscount,
        tipAmount,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể lưu kịch bản. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (!isSaving && !isBusy) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[460px] max-h-[92dvh] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark ? 'bg-[#141414] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header - Drawer Close Button Placement Invariant: Always End/Right */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between gap-2 shrink-0 ${
            isDark ? 'border-neutral-800 bg-neutral-950/70' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-amber-500 shrink-0" />
              <h3 className="text-[14px] font-black truncate">
                Chỉnh sửa Kịch bản · Phương án #{attempt.attemptNumber}
              </h3>
            </div>
            <p className={`text-[11px] truncate tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Khách hàng: {attempt.customerName || 'Khách hàng'} · Dịch vụ: {attempt.serviceName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isBusy}
            aria-label="Đóng"
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-[12px]">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11.5px] leading-relaxed">
              {errorMsg}
            </div>
          )}

          {/* 1. Ghi chú & Tên kịch bản */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[11.5px]">Ghi chú & Tên kịch bản</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Kịch bản Chốt Combo 5L + Serum dưỡng mi..."
              className={`w-full px-3 py-2 rounded-xl border text-[12px] outline-none transition-colors ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 focus:border-amber-500 text-white'
                  : 'bg-neutral-50 border-neutral-300 focus:border-amber-500 text-neutral-900'
              }`}
            />
          </div>

          {/* 2. Dáng mi thiết kế */}
          <div className="space-y-1.5">
            <label className="block font-bold text-[11.5px]">Dáng mi thiết kế</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_STYLES.map((style) => {
                const active = selectedStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setSelectedStyle(style)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-500 text-black border-amber-500 font-bold'
                        : isDark
                          ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                          : 'bg-neutral-100 border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Gói Combo Nối Mi */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-bold text-[11.5px]">Gói Combo Nối Mi</label>
              {comboPrice > 0 && (
                <span className="text-[11px] font-bold text-amber-500 tabular-nums">
                  {comboPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {COMMON_COMBOS.map((c) => {
                const active = comboName === (c.price > 0 ? c.name : '') && comboPrice === c.price;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      if (c.price === 0) {
                        setComboName('');
                        setComboPrice(0);
                      } else {
                        setComboName(c.name);
                        setComboPrice(c.price);
                      }
                    }}
                    className={`p-2 rounded-xl text-left border text-[11px] transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                        : isDark
                          ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                          : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <div className="truncate">{c.name}</div>
                    <div className="text-[10px] opacity-75 tabular-nums">
                      {c.price > 0 ? `${c.price.toLocaleString('vi-VN')}đ` : 'Không chọn'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Gói Mi Dưới */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-bold text-[11.5px]">Gói Mi Dưới</label>
              {underComboPrice > 0 && (
                <span className="text-[11px] font-bold text-amber-500 tabular-nums">
                  {underComboPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {COMMON_UNDER_COMBOS.map((uc) => {
                const active = underComboName === (uc.price > 0 ? uc.name : '') && underComboPrice === uc.price;
                return (
                  <button
                    key={uc.name}
                    type="button"
                    onClick={() => {
                      if (uc.price === 0) {
                        setUnderComboName('');
                        setUnderComboPrice(0);
                      } else {
                        setUnderComboName(uc.name);
                        setUnderComboPrice(uc.price);
                      }
                    }}
                    className={`p-2 rounded-xl text-left border text-[10.5px] transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                        : isDark
                          ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                          : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <div className="truncate">{uc.name}</div>
                    <div className="text-[9.5px] opacity-75 tabular-nums">
                      {uc.price > 0 ? `${uc.price.toLocaleString('vi-VN')}đ` : 'Không'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Sản phẩm Upsell */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-bold text-[11.5px]">Sản phẩm Upsell kèm theo</label>
              {upsellTotal > 0 && (
                <span className="text-[11px] font-bold text-sky-400 tabular-nums">
                  +{upsellTotal.toLocaleString('vi-VN')}đ
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {COMMON_PRODUCTS.map((prod) => {
                const selected = upsellProducts.find((p) => p.productName === prod.productName);
                return (
                  <div
                    key={prod.productName}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                      selected
                        ? isDark
                          ? 'bg-sky-950/20 border-sky-500/40 text-sky-300'
                          : 'bg-sky-50 border-sky-300 text-sky-800'
                        : isDark
                          ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleProduct(prod)}
                      className="flex-1 text-left min-w-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          selected
                            ? 'bg-sky-500 border-sky-500 text-white'
                            : isDark
                              ? 'border-neutral-700 bg-neutral-800'
                              : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate text-[11.5px] font-semibold">{prod.productName}</div>
                      <div className="text-[10px] opacity-75 tabular-nums shrink-0">
                        ({prod.price.toLocaleString('vi-VN')}đ)
                      </div>
                    </button>

                    {selected && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(prod.productName, -1)}
                          className="w-5 h-5 rounded-md flex items-center justify-center bg-neutral-800 text-white cursor-pointer hover:bg-neutral-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold tabular-nums text-[11px] min-w-[14px] text-center">
                          {selected.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(prod.productName, 1)}
                          className="w-5 h-5 rounded-md flex items-center justify-center bg-sky-500 text-white cursor-pointer hover:bg-sky-400"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Ưu đãi & Tiền Tip */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block font-bold text-[11px]">Tên Ưu đãi / Giảm giá</label>
              <input
                type="text"
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
                placeholder="VD: Tri ân khách cũ"
                className={`w-full px-2.5 py-1.5 rounded-xl border text-[11.5px] outline-none ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-700 text-white focus:border-amber-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-amber-500'
                }`}
              />
              <input
                type="number"
                value={promotionDiscount || ''}
                onChange={(e) => setPromotionDiscount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="Số tiền giảm (đ)"
                className={`w-full px-2.5 py-1.5 rounded-xl border text-[11.5px] outline-none tabular-nums ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-700 text-white focus:border-amber-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-amber-500'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-[11px]">Tiền Tip Chuyên Viên (đ)</label>
              <input
                type="number"
                value={tipAmount || ''}
                onChange={(e) => setTipAmount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="VD: 50000"
                className={`w-full px-2.5 py-1.5 rounded-xl border text-[11.5px] outline-none tabular-nums ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-700 text-white focus:border-amber-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-amber-500'
                }`}
              />
              <div className="flex gap-1 pt-0.5">
                {[0, 20000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTipAmount(amt)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold border tabular-nums cursor-pointer ${
                      tipAmount === amt
                        ? 'bg-emerald-500 text-black border-emerald-500'
                        : isDark
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                          : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                    }`}
                  >
                    {amt === 0 ? '0' : `${amt / 1000}k`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 7. Bảng tổng hợp tính toán tài chính Realtime */}
          <div
            className={`p-3 rounded-2xl border space-y-2 ${
              isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chỉ số tài chính sau chỉnh sửa (Tự động tính)</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
                <div className="text-[9.5px] opacity-65 font-semibold">Khách thanh toán</div>
                <div className="text-[12.5px] font-black tabular-nums">{grandTotal.toLocaleString('vi-VN')}đ</div>
              </div>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
                <div className="text-[9.5px] opacity-65 font-semibold">Thưởng + Tip CV</div>
                <div className="text-[12.5px] font-black text-emerald-400 tabular-nums">
                  +{estimatedReward.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
                <div className="text-[9.5px] opacity-65 font-semibold">Điểm Xoay Tua</div>
                <div className="text-[12.5px] font-black text-amber-400 tabular-nums inline-flex items-center justify-center gap-0.5">
                  <span>+{cvPoints}</span>
                  <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            {onApplyToWorkspace && (
              <button
                type="button"
                disabled={isSaving || isBusy}
                onClick={() => {
                  onClose();
                  onApplyToWorkspace({
                    ...attempt,
                    notes: notes.trim(),
                    selectedStyle,
                    selectedComboName: comboName || null,
                    selectedComboPrice: comboPrice,
                    selectedUnderComboName: underComboName || null,
                    selectedUnderComboPrice: underComboPrice,
                    upsellProducts,
                    upsellTotal,
                    promotionName: promotionName || null,
                    promotionDiscountAmount: promotionDiscount,
                    grandTotal,
                    tipAmount,
                    totalEstimatedReward: estimatedReward,
                    cvRotationPoints: cvPoints,
                  });
                }}
                className={`py-2 px-3 rounded-xl border text-[11.5px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-800 hover:bg-neutral-200'
                }`}
              >
                <Play className="w-3.5 h-3.5 text-amber-500" />
                <span>Nạp vào bàn làm việc</span>
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving || isBusy}
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[12px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>{isSaving ? 'Đang lưu...' : 'Lưu kịch bản'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
