'use client';

import React from 'react';
import { Loader2, Send } from 'lucide-react';

export interface ForwardModalFooterProps {
  isDark: boolean;
  selectedCount: number;
  isSubmitting: boolean;
  canNavigateToConversation: boolean;
  openTargetAfterForward: boolean;
  onChangeOpenTargetAfterForward: (checked: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const ForwardModalFooter: React.FC<ForwardModalFooterProps> = ({
  isDark,
  selectedCount,
  isSubmitting,
  canNavigateToConversation,
  openTargetAfterForward,
  onChangeOpenTargetAfterForward,
  onClose,
  onConfirm,
}) => {
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 ${
        isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
      }`}
    >
      {canNavigateToConversation ? (
        <label className={`inline-flex items-center gap-2 text-[12px] cursor-pointer select-none ${mutedTextClass}`}>
          <input
            type="checkbox"
            checked={openTargetAfterForward}
            onChange={(e) => onChangeOpenTargetAfterForward(e.target.checked)}
            className="accent-amber-500 rounded cursor-pointer"
          />
          <span>Mở phòng đích sau khi gửi</span>
        </label>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold cursor-pointer transition-colors border bg-transparent ${
            isDark
              ? 'border-zinc-800 text-slate-400 hover:bg-white/5'
              : 'border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={selectedCount === 0 || isSubmitting}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[12.5px] font-bold cursor-pointer transition-all disabled:opacity-45 disabled:cursor-not-allowed tabular-nums bg-amber-500 hover:bg-amber-400 text-slate-900"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
          <span>{selectedCount > 0 ? `Chuyển tiếp (${selectedCount})` : 'Chuyển tiếp'}</span>
        </button>
      </div>
    </div>
  );
};
