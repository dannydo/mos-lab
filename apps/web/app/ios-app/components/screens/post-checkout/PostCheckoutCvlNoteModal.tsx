'use client';

import React, { useEffect, useState } from 'react';
import type { IosCustomerNoteItem } from '@mos-lab/shared';
import { PenLine, Pin, X } from 'lucide-react';
import { apiClient } from '~/lib/api-client';
import { useTheme } from '../../../../../context/ThemeContext';

const QUICK_CHIPS = [
  { id: 'glue', label: 'Nhạy keo', snippet: 'Nhạy cảm keo, quạt khô kỹ góc trong.' },
  { id: 'eye', label: 'Dáng mắt', snippet: 'Mí sụp nhẹ, ưu tiên size ngắn góc trong.' },
  { id: 'pref', label: 'Sở thích', snippet: 'Thích dáng tự nhiên, nhẹ mắt.' },
  { id: 'care', label: 'Phục vụ', snippet: 'Thích yên tĩnh khi nối.' },
  { id: 'retain', label: 'Độ bền', snippet: 'Da vùng mí dầu, nhắc tránh tẩy trang dầu.' },
] as const;

export interface PostCheckoutCvlNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  bookingId?: number;
  orderNumber?: string;
  isSimulationMode?: boolean;
  onNoteCreated?: (note: IosCustomerNoteItem) => void;
}

export function PostCheckoutCvlNoteModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  bookingId,
  orderNumber,
  isSimulationMode = false,
  onNoteCreated,
}: PostCheckoutCvlNoteModalProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  const [noteText, setNoteText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSticky, setIsSticky] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNoteText('');
    setSelectedTags([]);
    setIsSticky(false);
    setErrorMsg(null);
    setIsSubmitting(false);
  }, [isOpen, customerId, bookingId]);

  if (!isOpen) return null;

  const handleToggleChip = (chip: (typeof QUICK_CHIPS)[number]) => {
    setSelectedTags((prev) => {
      if (prev.includes(chip.id)) {
        return prev.filter((id) => id !== chip.id);
      }
      setNoteText((curr) => {
        const trimmed = curr.trim();
        if (!trimmed) return chip.snippet;
        if (trimmed.includes(chip.snippet)) return curr;
        return `${trimmed} ${chip.snippet}`.slice(0, 500);
      });
      return [...prev, chip.id];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập nội dung ghi chú.');
      return;
    }
    if (!customerId || customerId <= 0) {
      setErrorMsg('Khách hàng chưa có mã hồ sơ để lưu ghi chú.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.ios.createCustomerNote(customerId, {
        note: trimmed,
        tags: selectedTags,
        isSticky,
        bookingId: bookingId && bookingId > 0 ? bookingId : undefined,
        simulationMode: isSimulationMode,
      });
      if (!res?.success || !res.note) {
        setErrorMsg(res?.error || 'Không thể lưu ghi chú.');
        return;
      }
      onNoteCreated?.(res.note);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Lỗi kết nối máy chủ.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ghi chú sau nối"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-[390px] rounded-t-[28px] sm:rounded-[28px] border shadow-2xl overflow-hidden ${
          isDark ? 'border-white/10 bg-[#1C1C1E] text-neutral-100' : 'border-black/10 bg-white text-neutral-900'
        }`}
      >
        {/* Header: Title Top-Left, [X] Top-Right (Drawer Close Invariant) */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${
            isDark ? 'border-white/10' : 'border-black/8'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <PenLine className="w-3.5 h-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-bold leading-tight truncate">Ghi chú sau nối</div>
              <div className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {customerName}
                {orderNumber ? ` · #${orderNumber}` : ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng ghi chú sau nối"
            className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              isDark ? 'hover:bg-white/10 text-neutral-400' : 'hover:bg-black/5 text-neutral-500'
            }`}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Quick Minimal Chips */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => {
              const active = selectedTags.includes(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleToggleChip(chip)}
                  className={`px-2.5 py-1 rounded-full border text-[11.5px] font-semibold cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#FFB400] text-black border-amber-400 font-bold'
                      : isDark
                        ? 'bg-[#2C2C2E] text-neutral-300 border-white/10 hover:border-amber-500/40'
                        : 'bg-[#F2F2F7] text-neutral-700 border-black/8 hover:border-amber-500/40'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              placeholder="Lưu ý cho lần ghé sau..."
              className={`w-full rounded-2xl border p-3 pb-6 text-[13px] leading-relaxed focus:outline-none focus:border-amber-400 resize-none ${
                isDark
                  ? 'border-white/10 bg-[#2C2C2E] text-neutral-100 placeholder-neutral-500'
                  : 'border-black/10 bg-[#F2F2F7] text-neutral-900 placeholder-neutral-400'
              }`}
            />
            <span
              className={`absolute bottom-2 right-3 text-[10.5px] tabular-nums ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              {noteText.length}/500
            </span>
          </div>

          {/* iOS Switch Row */}
          <button
            type="button"
            role="switch"
            aria-checked={isSticky}
            onClick={() => setIsSticky((prev) => !prev)}
            className={`w-full flex items-center justify-between rounded-2xl border px-3.5 py-2.5 cursor-pointer transition-colors ${
              isDark ? 'border-white/10 bg-[#2C2C2E]' : 'border-black/8 bg-[#F2F2F7]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold">
              <Pin className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
              <span>Ghim quan trọng</span>
            </span>
            <span
              className={`w-10 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                isSticky ? 'bg-[#FFB400]' : isDark ? 'bg-neutral-600' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isSticky ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
          </button>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11.5px] font-medium text-rose-500">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-4 py-2.5 rounded-xl border text-[12.5px] font-semibold cursor-pointer ${
                isDark
                  ? 'border-white/10 bg-[#2C2C2E] text-neutral-200'
                  : 'border-black/10 bg-[#F2F2F7] text-neutral-700'
              }`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !noteText.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#FFB400] text-black text-[12.5px] font-bold shadow-xs active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
