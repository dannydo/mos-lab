'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Gem, UserPlus, Search, CheckCircle2, X, Phone, AlertCircle } from 'lucide-react';
import { apiClient } from '~/lib/api-client';
import type { IosReferrerLookupResult } from '~/lib/api/ios.api';

export interface PendingReferral {
  referrerUserId: number;
  referrerName: string;
  referrerPhone: string;
  referrerDiamondBalance: number;
}

interface NewCustomerReferralModalProps {
  /** Khách mới (người được giới thiệu) */
  newCustomerId: number;
  newCustomerName: string;
  /** Referrer đã có trong DB (nếu có) */
  existingReferrer?: { userId: number; name: string } | null;
  /** Đã trao KC cho cặp này chưa (guard duplicate) */
  alreadyGranted?: boolean;
  isDark: boolean;
  onConfirm: (referral: PendingReferral) => void;
  onDismiss: () => void;
}

export function NewCustomerReferralModal({
  newCustomerId,
  newCustomerName,
  existingReferrer,
  alreadyGranted = false,
  isDark,
  onConfirm,
  onDismiss,
}: NewCustomerReferralModalProps) {
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<IosReferrerLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const handleSearch = useCallback(
    async (rawPhone: string) => {
      const q = rawPhone.replace(/\D/g, '');
      if (q.length < 8) {
        setResult(null);
        setError(null);
        return;
      }
      setSearching(true);
      setError(null);
      setResult(null);
      try {
        const res = await apiClient.ios.lookupReferrerByPhone(rawPhone);
        if (res.success && res.referrer) {
          // Guard: tránh tự giới thiệu chính mình
          if (res.referrer.userId === newCustomerId) {
            setError('Khách không thể tự giới thiệu chính mình.');
          } else {
            setResult(res.referrer);
          }
        } else {
          setError('Không tìm thấy khách hàng với SĐT này.');
        }
      } catch {
        setError('Lỗi kết nối. Vui lòng thử lại.');
      } finally {
        setSearching(false);
      }
    },
    [newCustomerId]
  );

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setResult(null);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(val), 600);
  };

  const handleConfirm = () => {
    if (!result) return;
    setConfirmed(true);
    onConfirm({
      referrerUserId: result.userId,
      referrerName: result.name,
      referrerPhone: result.phone,
      referrerDiamondBalance: result.diamondBalance,
    });
  };

  const bg = isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200';
  const inputBg = isDark
    ? 'bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-neutral-400' : 'text-gray-500';

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      {/* Sheet */}
      <div
        className={`w-full max-w-sm rounded-t-3xl border ${bg} shadow-2xl animate-in slide-in-from-bottom-4 duration-300`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-neutral-700' : 'bg-gray-300'}`} />
        </div>

        <div className="px-5 pb-6 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className={`text-[13px] font-bold ${textPrimary}`}>Khách Mới 🌟 Giới Thiệu</p>
                <p className={`text-[11px] ${textSecondary}`}>{newCustomerName}</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nếu đã có referrer trong DB */}
          {existingReferrer && alreadyGranted && (
            <div
              className={`rounded-xl p-3 mb-4 flex items-center gap-2 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[12px] font-semibold text-emerald-400">Đã trao 100 KC</p>
                <p className={`text-[11px] ${textSecondary}`}>Người GT: {existingReferrer.name}</p>
              </div>
            </div>
          )}

          {/* Reward info banner */}
          <div
            className={`rounded-xl px-3 py-2.5 mb-4 flex items-center gap-2 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}
          >
            <Gem className="w-4 h-4 text-amber-400 shrink-0" />
            <p className={`text-[12px] font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              Người giới thiệu sẽ nhận <span className="font-black">100 Kim Cương</span> sau khi khách thanh toán
            </p>
          </div>

          {/* Phone input */}
          <div className="relative mb-3">
            <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="Nhập SĐT người giới thiệu..."
              className={`w-full pl-9 pr-10 py-3 rounded-xl border text-[14px] font-medium outline-none focus:ring-2 focus:ring-amber-400/50 transition-all ${inputBg}`}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {result && !searching && (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className={`rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2 ${isDark ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'}`}
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className={`text-[12px] ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{error}</p>
            </div>
          )}

          {/* Referrer result card */}
          {result && (
            <div
              className={`rounded-xl p-3 mb-4 border ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[14px] font-bold ${textPrimary}`}>{result.name}</p>
                  <p className={`text-[12px] ${textSecondary}`}>{result.phone}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-500/15 px-2.5 py-1 rounded-full">
                  <Gem className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[12px] font-bold text-amber-400 tabular-nums">
                    {result.diamondBalance.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className={`text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Sẽ nhận thêm <span className="font-black">+100 KC</span> sau khi khách thanh toán
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className={`flex-1 py-3 rounded-2xl text-[13px] font-semibold transition-all active:scale-95 ${isDark ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Bỏ Qua
            </button>
            <button
              onClick={handleConfirm}
              disabled={!result || confirmed}
              className={`flex-[2] py-3 rounded-2xl text-[13px] font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                result && !confirmed
                  ? 'bg-amber-400 text-black hover:bg-amber-500 shadow-lg shadow-amber-500/30'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Gem className="w-4 h-4" />
              {confirmed ? 'Đã Lưu ✓' : 'Xác Nhận Người GT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
