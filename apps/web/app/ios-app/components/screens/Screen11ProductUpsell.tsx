'use client';

import React, { useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem, COMBO_PACKAGES_CVL, SERUM_TIERS_CVL } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import { Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Screen11ProductUpsellProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  onBack: () => void;
  onGoToBilling: (payload?: {
    cartProducts?: Array<{ productId: number; productName: string; price: number; quantity: number; cvBonus?: number }>;
    selectedCombo?: { id: string; name: string; price: number; bonus: number; sessions: number } | null;
  }) => void;
}

export function Screen11ProductUpsell({ booking, actor, onBack, onGoToBilling }: Screen11ProductUpsellProps) {
  const [selectedSerumTierId, setSelectedSerumTierId] = useState<string>(SERUM_TIERS_CVL[0].id);
  const [yeppeumCount, setYeppeumCount] = useState<number>(1);
  const [selectedComboId, setSelectedComboId] = useState<string>(
    booking?.selectedCombo?.id || COMBO_PACKAGES_CVL[0].id
  );

  const selectedSerumTier = SERUM_TIERS_CVL.find((t) => t.id === selectedSerumTierId) || SERUM_TIERS_CVL[0];
  const selectedComboPkg = COMBO_PACKAGES_CVL.find((c) => c.id === selectedComboId) || null;

  const servicePrice = booking?.servicePrice || 770000;
  const serviceName = booking?.serviceName || 'New Flawless Mink';
  const customerName = booking?.customerName || 'Chị Trúc';
  const actorName = actor?.name || 'Thảo Ly';
  const actorTierBadge = actor?.tier === 'CVLL' ? <CvFeather2Badge /> : actor?.tier === 'CVL' ? 'CV🪶' : 'CC';

  const serumTotal = yeppeumCount > 0 ? selectedSerumTier.price * yeppeumCount : 0;
  const serumBonus = yeppeumCount > 0 ? selectedSerumTier.cvBonus * yeppeumCount : 0;
  const comboTotal = selectedComboPkg ? selectedComboPkg.price : 0;
  const comboBonus = selectedComboPkg ? selectedComboPkg.cvBonus : 0;
  const subtotal = servicePrice + comboTotal + serumTotal;

  const handleConfirmCheckout = () => {
    const cartProducts =
      yeppeumCount > 0
        ? [
            {
              productId: 36,
              productName: `Cây dưỡng mi Yeppeum 6ml (${selectedSerumTier.label})`,
              price: selectedSerumTier.price,
              quantity: yeppeumCount,
              cvBonus: selectedSerumTier.cvBonus,
            },
          ]
        : [];
    const selectedCombo = selectedComboPkg
      ? {
          id: selectedComboPkg.id,
          name: selectedComboPkg.name,
          price: selectedComboPkg.price,
          bonus: selectedComboPkg.cvBonus,
          sessions: selectedComboPkg.sessions,
        }
      : null;
    onGoToBilling({ cartProducts, selectedCombo });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Bán Dưỡng Mi & Chốt Check-out"
        onBack={onBack}
        backTitle="Survey"
        rightAction={
          <button
            onClick={handleConfirmCheckout}
            className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60"
          >
            Checkout
          </button>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* Rule Banner: Ai Checkout người đó được nhận */}
        <div className="bg-[#1C1C1E] text-white rounded-2xl p-3.5 shadow-sm space-y-1.5 border border-[#FFB400]/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#FFB400] uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              QUY TẮC: AI CHECKOUT NGƯỜI ĐÓ ĐƯỢC NHẬN
            </span>
            <span className="bg-[#FFB400] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
              {actorTierBadge} {actorName}
            </span>
          </div>
          <div className="text-[11px] text-neutral-300 leading-snug">
            Khi bấm chốt Check-out bên dưới, hệ thống ghi nhận{' '}
            <strong className="text-white">check_out_staff_id = {actorName}</strong>: nhận{' '}
            <strong className="text-[#FFB400]">
              +{(comboBonus + serumBonus).toLocaleString('vi-VN')}đ Thưởng Tiền Tươi
            </strong>{' '}
            (Combo + Dưỡng mi)!
          </div>
        </div>

        {/* Section 1: CÂY DƯỠNG MI YEPPEUM 6ML (4 BẬC THƯỞNG CV🪶 THEO ĐIỀU RĂN CV-002) */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>1. DƯỠNG MI YEPPEUM 6ML (THANG THƯỞNG CV🪶)</span>
            <span className="text-emerald-700 font-bold">+{serumBonus.toLocaleString('vi-VN')}đ thưởng</span>
          </div>

          <div className="bg-white border-2 border-[#FFB400] rounded-2xl p-3 shadow-sm space-y-2.5">
            <div className="flex gap-3">
              <div className="w-16 h-20 rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-2 shrink-0">
                <span className="text-[#FFB400] font-black text-[10px] tracking-wider text-center">YEPPEUM</span>
                <span className="text-white text-[10px] font-semibold mt-0.5">6ml</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[14px] font-bold text-black leading-snug">Cây dưỡng mi Yeppeum 6ml</span>
                  <div className="bg-[#F2F2F7] rounded-lg px-2 py-0.5 flex items-center gap-2 text-[12px] font-bold text-gray-800 shrink-0">
                    <button
                      onClick={() => setYeppeumCount((c) => Math.max(0, c - 1))}
                      className="px-1 text-gray-500 active:scale-90"
                    >
                      -
                    </button>
                    <span className="tabular-nums">{yeppeumCount}</span>
                    <button
                      onClick={() => setYeppeumCount((c) => c + 1)}
                      className="px-1 text-gray-500 active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-gray-600 mt-1 leading-tight">
                  Phục hồi nang mi thật, khóa gốc keo bền hơn 2 tuần cho {customerName}.
                </div>
              </div>
            </div>

            {/* 4 Tier Buttons */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {SERUM_TIERS_CVL.map((t) => {
                const active = selectedSerumTierId === t.id && yeppeumCount > 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedSerumTierId(t.id);
                      if (yeppeumCount === 0) setYeppeumCount(1);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      active ? 'bg-amber-50 border-[#FF9500] shadow-xs' : 'bg-[#F9F9FB] border-gray-200'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-black truncate">{t.label}</div>
                    <div className="text-[10px] font-extrabold text-emerald-700 mt-0.5 tabular-nums">
                      Thưởng +{t.cvBonus.toLocaleString('vi-VN')}đ/cây
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: GÓI COMBO CHỐT TẠI GIƯỜNG (BẬC THANG TIỀN TƯƠI CV🪶) */}
        <div>
          <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <span>2. GÓI COMBO CHỐT CHO KHÁCH</span>
            <span className="text-emerald-700 font-bold">+{comboBonus.toLocaleString('vi-VN')}đ thưởng</span>
          </div>

          <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-neutral-200 space-y-1.5">
            {COMBO_PACKAGES_CVL.slice(0, 3).map((pkg) => {
              const active = selectedComboId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedComboId(pkg.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    active ? 'bg-amber-50/90 border-[#FF9500]' : 'bg-[#F9F9FB] border-transparent'
                  }`}
                >
                  <div>
                    <div className="text-[12px] font-bold text-black">{pkg.name}</div>
                    <div className="text-[11px] text-gray-500 tabular-nums">
                      {pkg.price.toLocaleString('vi-VN')} đ ({pkg.sessions} lần)
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums">
                      +{pkg.cvBonus.toLocaleString('vi-VN')}đ
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-[#FF9500]" />}
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setSelectedComboId('NONE')}
              className={`w-full py-1.5 rounded-xl text-[11px] font-semibold ${
                selectedComboId === 'NONE' ? 'bg-gray-800 text-white' : 'bg-[#F2F2F7] text-gray-600'
              }`}
            >
              {selectedComboId === 'NONE' ? '✓ ' : ''}Không mua thêm gói Combo
            </button>
          </div>
        </div>

        {/* Section 3: Summary card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-gray-500">Dịch vụ ({serviceName}):</span>
            <span className="text-gray-800 font-semibold tabular-nums">{servicePrice.toLocaleString('vi-VN')} đ</span>
          </div>
          {selectedComboPkg && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-gray-500">{selectedComboPkg.name}:</span>
              <span className="text-gray-800 font-semibold tabular-nums">{comboTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          {yeppeumCount > 0 && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-gray-500">Dưỡng mi Yeppeum (x{yeppeumCount}):</span>
              <span className="text-gray-800 font-semibold tabular-nums">{serumTotal.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[14px] font-bold text-black">Tổng tạm tính hóa đơn:</span>
            <span className="text-[17px] font-black text-[#FF9500] tabular-nums">
              {subtotal.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="pt-1 flex items-center justify-between text-[12px] bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
            <span className="text-emerald-800 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Thưởng chốt đơn của {actorName} ({actorTierBadge}):
            </span>
            <span className="text-emerald-700 font-black tabular-nums">
              +{(comboBonus + serumBonus).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={handleConfirmCheckout}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[14px] shadow-md active:scale-98 transition-transform text-center"
          >
            CHỐT CHECK-OUT ({actorName.toUpperCase()}) & SANG THANH TOÁN
          </button>
        </div>
      </div>
    </div>
  );
}
