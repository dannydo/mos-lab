'use client';

import React, { useMemo, useState } from 'react';
import { resolveBondingStarFromDinner, type FmBranchCode, type SubmitFmTeamDinnerRequest } from '@mos-lab/shared';
import { Camera, CheckCircle2, UtensilsCrossed, X } from 'lucide-react';

interface FmTeamDinnerModalProps {
  readonly open: boolean;
  readonly branch: FmBranchCode;
  readonly monthKey: string;
  readonly saving: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (payload: SubmitFmTeamDinnerRequest) => Promise<void>;
}

export function FmTeamDinnerModal({ open, branch, monthKey, saving, onClose, onSubmit }: FmTeamDinnerModalProps) {
  const todayIso = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const [eventDate, setEventDate] = useState(todayIso);
  const [venueName, setVenueName] = useState('');
  const [attendeeCount, setAttendeeCount] = useState(12);
  const [totalHeadcount, setTotalHeadcount] = useState(14);
  const [socialCheckinUrl, setSocialCheckinUrl] = useState('');
  const [amountSpentVnd, setAmountSpentVnd] = useState(1_200_000);
  const [deductFromShopFund, setDeductFromShopFund] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const preview = useMemo(() => {
    const safeTotal = Math.max(1, Number(totalHeadcount || 1));
    const safeAttend = Math.max(0, Math.min(safeTotal, Number(attendeeCount || 0)));
    const pct = Math.round((safeAttend / safeTotal) * 100);
    const evalRes = resolveBondingStarFromDinner({
      organized: true,
      hasSocialCheckin: socialCheckinUrl.trim().length > 0,
      attendancePct: pct,
    });
    return { pct, ...evalRes };
  }, [attendeeCount, totalHeadcount, socialCheckinUrl]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    if (!venueName.trim()) {
      setErrorText('Vui lòng nhập tên quán / địa điểm ăn uống.');
      return;
    }
    if (!socialCheckinUrl.trim().startsWith('http')) {
      setErrorText('Bắt buộc nhập link ảnh / bài check-in trên mạng xã hội (http/https).');
      return;
    }
    try {
      await onSubmit({
        branch,
        monthKey,
        eventDate,
        venueName: venueName.trim(),
        attendeeCount: Number(attendeeCount),
        totalHeadcount: Number(totalHeadcount),
        socialCheckinUrl: socialCheckinUrl.trim(),
        proofImageUrls: [socialCheckinUrl.trim()],
        amountSpentVnd: Math.max(0, Number(amountSpentVnd || 0)),
        deductFromShopFund,
      });
      onClose();
    } catch (err: unknown) {
      setErrorText((err as Error)?.message || 'Không thể nộp check-in Tiệc Tháng.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nộp Check-in Tiệc Tháng Shop"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
              <UtensilsCrossed className="h-4 w-4 text-amber-500" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Check-in Tiệc Tháng · Trụ #8</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                70% = 1★ · 80% = 2★ · 90% = 3★ · Chi trực tiếp từ Quỹ Shop
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto p-5">
          {errorText ? (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {errorText}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">Ngày đi ăn</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">
                Tổng tiền chi (VND)
              </label>
              <input
                type="number"
                min={0}
                step={50_000}
                value={amountSpentVnd}
                onChange={(e) => setAmountSpentVnd(Math.max(0, Number(e.target.value || 0)))}
                className="mt-1 min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold tabular-nums text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">
              Tên quán / Địa điểm tổ chức
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Ví dụ: Haidilao Bitexco / Bò Nướng..."
              className="mt-1 min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">
                Số thành viên tham gia
              </label>
              <input
                type="number"
                min={1}
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(Math.max(1, Number(e.target.value || 1)))}
                className="mt-1 min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs tabular-nums text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">
                Tổng quân số shop
              </label>
              <input
                type="number"
                min={1}
                value={totalHeadcount}
                onChange={(e) => setTotalHeadcount(Math.max(1, Number(e.target.value || 1)))}
                className="mt-1 min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs tabular-nums text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
              <Camera className="h-3.5 w-3.5 text-blue-500" />
              <span>Link ảnh / bài Check-in Mạng Xã Hội (bắt buộc)</span>
            </label>
            <input
              type="url"
              value={socialCheckinUrl}
              onChange={(e) => setSocialCheckinUrl(e.target.value)}
              placeholder="https://facebook.com/... hoặc link ảnh check-in public"
              className="mt-1 min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-neutral-100/80 px-3 py-2.5 text-xs text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200">
            <input
              type="checkbox"
              checked={deductFromShopFund}
              onChange={(e) => setDeductFromShopFund(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span>Trừ trực tiếp chi phí bữa ăn từ Quỹ Shop khi HR/CEO duyệt</span>
          </label>

          <div className="flex items-center justify-between rounded-2xl bg-emerald-50/80 px-3.5 py-2.5 text-xs dark:bg-emerald-950/30">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>Dự kiến Trụ #8: {preview.pct}% tham gia</span>
            </span>
            <span className="font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
              {preview.star}★ · {preview.missingDinnerShieldPenalty > 0 ? 'Thiếu ảnh MXH (-1 Khiên)' : 'Giữ đủ Khiên'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center rounded-xl px-4 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <span>{saving ? 'Đang gửi...' : 'Gửi Check-in MXH'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
