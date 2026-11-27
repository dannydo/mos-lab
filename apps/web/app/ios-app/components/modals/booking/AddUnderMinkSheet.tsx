'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Clock, Layers, Loader2, Sparkles, X } from 'lucide-react';
import { isPureUnderLashServiceName, resolveActiveBookingComboWallets } from '@mos-lab/shared';
import { useTheme } from '../../../../../context/ThemeContext';
import type { BookingItem } from '../../../state/mockData';
import type { AddUnderMinkMode } from '../../../state/useIosAddUnderMink';
import { ComboWalletSelectorList } from '../../ui-kit/ComboWalletSelectorList';
import { ConsultationUnderMinkStrip } from '../../screens/consultation/ConsultationUnderMinkStrip';
import { UNDER_MINK_PREP_SPEC } from '../../screens/LashMaterialConstraintMatrix';

function getCurrentVnTimeHm(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export interface AddUnderMinkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: BookingItem;
  initialMode: AddUnderMinkMode;
  pendingAfterPhotoUrl?: string | null;
  onConfirmAddRound: (params: {
    underMinkServiceType: 'Normal' | 'Retain';
    underMinkCurl: 'B' | 'C';
    underMinkLength: string;
    underMinkCount: string;
    selectedUnderComboBalanceId?: number | null;
    skipUnderCombo?: boolean;
    afterPhotoUrl?: string | null;
  }) => Promise<void> | void;
  onConfirmCreateNewBooking: (params: {
    underMinkServiceType: 'Normal' | 'Retain';
    underMinkCurl: 'B' | 'C';
    underMinkLength: string;
    underMinkCount: string;
    timeSlot: string;
    bookingNote?: string;
  }) => Promise<void> | void;
}

export function AddUnderMinkSheet({
  isOpen,
  onClose,
  booking,
  initialMode,
  pendingAfterPhotoUrl,
  onConfirmAddRound,
  onConfirmCreateNewBooking,
}: AddUnderMinkSheetProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const isSettled = Boolean(
    booking?.billing?.settlementStatus === 'SETTLED_COMPLETED' || booking?.orderState === 'Completed'
  );
  const canAddToCurrentOrder = Boolean(booking?.id && !isSettled && !isPureUnderLashServiceName(booking?.serviceName));

  const [mode, setMode] = useState<AddUnderMinkMode>(initialMode);
  const [underServiceType, setUnderServiceType] = useState<'Normal' | 'Retain'>('Normal');
  const [underCurl, setUnderCurl] = useState<'B' | 'C'>(UNDER_MINK_PREP_SPEC.defaultCurl === 'C' ? 'C' : 'B');
  const [underLength, setUnderLength] = useState<string>(`${UNDER_MINK_PREP_SPEC.defaultLengthMm} mm`);
  const [underCount, setUnderCount] = useState<string>(`${UNDER_MINK_PREP_SPEC.defaultCountFibers} sợi`);
  const [selectedUnderBalanceId, setSelectedUnderBalanceId] = useState<number | null>(
    booking?.selectedUnderComboBalanceId ?? null
  );
  const [skipUnderCombo, setSkipUnderCombo] = useState<boolean>(Boolean(booking?.skipUnderCombo));
  const [timeSlot, setTimeSlot] = useState<string>(() => getCurrentVnTimeHm());
  const [bookingNote, setBookingNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(canAddToCurrentOrder ? initialMode : 'CREATE_NEW_BOOKING');
    setUnderServiceType(booking?.attributes?.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal');
    setUnderCurl((booking?.attributes?.underMinkCurl as 'B' | 'C') || UNDER_MINK_PREP_SPEC.defaultCurl);
    setUnderLength(booking?.attributes?.underMinkLength || `${UNDER_MINK_PREP_SPEC.defaultLengthMm} mm`);
    setUnderCount(booking?.attributes?.underMinkCount || `${UNDER_MINK_PREP_SPEC.defaultCountFibers} sợi`);
    setSelectedUnderBalanceId(booking?.selectedUnderComboBalanceId ?? null);
    setSkipUnderCombo(Boolean(booking?.skipUnderCombo));
    setTimeSlot(getCurrentVnTimeHm());
    setBookingNote('');
    setErrorMsg(null);
  }, [isOpen, initialMode, canAddToCurrentOrder, booking?.id]);

  const resolvedWallets = useMemo(
    () =>
      resolveActiveBookingComboWallets({
        comboWallets: booking?.comboWallets,
        comboLiveStatus: booking?.comboLiveStatus,
        underMinkComboStatus: booking?.underMinkComboStatus,
        selectedUpperComboBalanceId: booking?.selectedUpperComboBalanceId ?? null,
        selectedUnderComboBalanceId: selectedUnderBalanceId,
        skipUpperCombo: Boolean(booking?.skipUpperCombo),
        skipUnderCombo,
        bookedServiceName: booking?.serviceName,
      }),
    [booking, selectedUnderBalanceId, skipUnderCombo]
  );

  if (!isOpen) return null;

  const hasUnderComboActive = mode === 'ADD_TO_CURRENT_ORDER' && resolvedWallets.isRedeemingUnderToday;
  const underNormalRem = resolvedWallets.effectiveUnderMinkComboStatus?.normalRemaining ?? 0;
  const underRetainRem = resolvedWallets.effectiveUnderMinkComboStatus?.retainRemaining ?? 0;
  const listPrice = underServiceType === 'Retain' ? 250_000 : 390_000;
  const effectiveAddPrice = hasUnderComboActive ? 0 : listPrice;
  const estimatedMinutes = underServiceType === 'Retain' ? 20 : 25;
  const extraPoints = underServiceType === 'Retain' ? 22 : 29;

  const handleConfirm = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (mode === 'ADD_TO_CURRENT_ORDER' && canAddToCurrentOrder) {
        await onConfirmAddRound({
          underMinkServiceType: underServiceType,
          underMinkCurl: underCurl,
          underMinkLength: underLength,
          underMinkCount: underCount,
          selectedUnderComboBalanceId: resolvedWallets.selectedUnderComboBalanceId,
          skipUnderCombo: resolvedWallets.skipUnderCombo,
          afterPhotoUrl: pendingAfterPhotoUrl,
        });
      } else {
        await onConfirmCreateNewBooking({
          underMinkServiceType: underServiceType,
          underMinkCurl: underCurl,
          underMinkLength: underLength,
          underMinkCount: underCount,
          timeSlot: timeSlot || getCurrentVnTimeHm(),
          bookingNote,
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể book Mi Dưới. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Book thêm Mi Dưới sau khi xong Mi Trên"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[430px] max-h-[90dvh] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark ? 'bg-[#141416] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
              <h3 className="text-[14.5px] font-black truncate">
                {mode === 'ADD_TO_CURRENT_ORDER' ? 'Book Thêm Mi Dưới (Vòng 2)' : 'Book Ca Mi Dưới Mới'}
              </h3>
            </div>
            <p className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {booking?.customerName || 'Khách hàng'} · #{booking?.orderNumber || 'Đơn mới'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng book Mi Dưới"
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {canAddToCurrentOrder && (
            <div
              className={`grid grid-cols-2 gap-1 p-1 rounded-2xl border ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
              }`}
            >
              <button
                type="button"
                data-testid="under-lash-mode-current"
                onClick={() => setMode('ADD_TO_CURRENT_ORDER')}
                className={`py-2 px-2.5 rounded-xl text-[11.5px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'ADD_TO_CURRENT_ORDER'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Làm tiếp Vòng 2</span>
              </button>
              <button
                type="button"
                data-testid="under-lash-mode-new-booking"
                onClick={() => setMode('CREATE_NEW_BOOKING')}
                className={`py-2 px-2.5 rounded-xl text-[11.5px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'CREATE_NEW_BOOKING'
                    ? 'bg-[#FFB400] text-black shadow-xs'
                    : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-black'
                }`}
              >
                <CalendarPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Tạo ca mới tách bill</span>
              </button>
            </div>
          )}

          {/* Service type: Mới 390K vs Dặm 250K */}
          <div className="space-y-1.5">
            <div className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Chọn dịch vụ Mi Dưới (0.10 mm)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="under-lash-type-normal"
                onClick={() => setUnderServiceType('Normal')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  underServiceType === 'Normal'
                    ? isDark
                      ? 'bg-purple-950/50 border-purple-500 text-white ring-1 ring-purple-500'
                      : 'bg-purple-50 border-purple-500 text-purple-950 ring-1 ring-purple-500'
                    : isDark
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                }`}
              >
                <div className="text-[12.5px] font-black">Nối Mới Mi Dưới</div>
                <div className="text-[12px] font-extrabold text-purple-500 tabular-nums mt-0.5">+390.000đ</div>
                <div className={`text-[10px] mt-0.5 tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  ~25 phút · +29 pts
                </div>
              </button>
              <button
                type="button"
                data-testid="under-lash-type-retain"
                onClick={() => setUnderServiceType('Retain')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  underServiceType === 'Retain'
                    ? isDark
                      ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                    : isDark
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                }`}
              >
                <div className="text-[12.5px] font-black">Dặm Mi Dưới</div>
                <div className="text-[12px] font-extrabold text-emerald-500 tabular-nums mt-0.5">+250.000đ</div>
                <div className={`text-[10px] mt-0.5 tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  ~20 phút · +22 pts
                </div>
              </button>
            </div>
          </div>

          {/* Specs strip (Curl B/C, Length 6-8mm, Count 20-50) */}
          <div
            className={`rounded-2xl p-3 border space-y-2 ${
              isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>
                Thông số Mi Dưới ({underCurl} · {underLength} · {underCount})
              </span>
              <span className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>0.10 mm</span>
            </div>
            <ConsultationUnderMinkStrip
              isDark={isDark}
              underMinkCurl={underCurl}
              setUnderMinkCurl={setUnderCurl}
              underMinkLength={underLength}
              setUnderMinkLength={setUnderLength}
              underMinkCount={underCount}
              setUnderMinkCount={setUnderCount}
              underMinkServiceType={underServiceType}
              setUnderMinkServiceType={setUnderServiceType}
              hasUnderMinkCombo={hasUnderComboActive}
              underComboNormalRemaining={underNormalRem}
              underComboRetainRemaining={underRetainRem}
            />
          </div>

          {mode === 'ADD_TO_CURRENT_ORDER' && resolvedWallets.underWallets.length > 0 && (
            <ComboWalletSelectorList
              wallets={resolvedWallets.underWallets}
              selectedBalanceId={resolvedWallets.selectedUnderComboBalanceId}
              skipCombo={resolvedWallets.skipUnderCombo}
              serviceGroup="under"
              compact
              onSelectWallet={(wallet) => {
                setSelectedUnderBalanceId(wallet.balanceId);
                setSkipUnderCombo(false);
              }}
              onSelectSkipCombo={() => {
                setSelectedUnderBalanceId(null);
                setSkipUnderCombo(true);
              }}
            />
          )}

          {mode === 'CREATE_NEW_BOOKING' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10.5px] font-bold opacity-75 flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3" /> Giờ hẹn
                </label>
                <input
                  type="time"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-xl border text-[12px] font-bold tabular-nums focus:outline-none ${
                    isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10.5px] font-bold opacity-75 block mb-1">Ghi chú ca Mi Dưới</label>
                <input
                  type="text"
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                  placeholder="Khách muốn nối thêm sau mi trên..."
                  className={`w-full px-2.5 py-2 rounded-xl border text-[12px] focus:outline-none ${
                    isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Summary bar */}
          <div
            className={`rounded-2xl p-3 border flex items-center justify-between gap-2 ${
              isDark ? 'bg-purple-950/30 border-purple-800/50' : 'bg-purple-50/70 border-purple-200'
            }`}
          >
            <div className="text-[11px] space-y-0.5">
              <div className="font-bold">
                {mode === 'ADD_TO_CURRENT_ORDER'
                  ? 'Chuyển sang Bước 7 (Chụp Before Mi Dưới)'
                  : 'Tạo lịch Mi Dưới mới vào Sảnh & Check-in'}
              </div>
              <div className={`tabular-nums ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                Thời lượng ~{estimatedMinutes} phút · Điểm xoay +{extraPoints} pts
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[14px] font-black text-purple-500 tabular-nums">
                {effectiveAddPrice === 0 ? '0đ' : `+${effectiveAddPrice.toLocaleString('vi-VN')}đ`}
              </div>
              {hasUnderComboActive && (
                <div className="text-[9.5px] font-bold text-emerald-500">Trừ gói Mi Dưới</div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[11.5px] font-bold">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            data-testid="confirm-add-under-lash-btn"
            disabled={isSubmitting}
            onClick={() => void handleConfirm()}
            className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[13px] shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 uppercase tracking-tight"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : mode === 'ADD_TO_CURRENT_ORDER' ? (
              <span>Xác Nhận Book Mi Dưới &amp; Sang Vòng 2 →</span>
            ) : (
              <span>Tạo Ca Mi Dưới Mới Ngay →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
