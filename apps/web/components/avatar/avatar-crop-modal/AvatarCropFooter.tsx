'use client';

import React from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';

export interface AvatarCropFooterProps {
  isDark: boolean;
  canSave: boolean;
  isUploading: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const AvatarCropFooter: React.FC<AvatarCropFooterProps> = ({
  isDark,
  canSave,
  isUploading,
  onClose,
  onSave,
}) => (
  <div
    className={`mt-5 pt-3 border-t flex items-center justify-end gap-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}
  >
    <button
      type="button"
      onClick={onClose}
      disabled={isUploading}
      className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
        isDark
          ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border-white/10'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300 shadow-xs'
      }`}
    >
      Hủy
    </button>
    <button
      type="button"
      disabled={!canSave || isUploading}
      onClick={onSave}
      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg border ${
        canSave && !isUploading
          ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 shadow-amber-500/25 border-amber-400/40'
          : isDark
            ? 'bg-white/10 text-slate-500 border-transparent cursor-not-allowed'
            : 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed'
      }`}
    >
      {isUploading ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          Đang lưu Avatar...
        </>
      ) : (
        <>
          Lưu Avatar &amp; Tỏa Sáng
          <ChevronRight size={14} />
        </>
      )}
    </button>
  </div>
);
