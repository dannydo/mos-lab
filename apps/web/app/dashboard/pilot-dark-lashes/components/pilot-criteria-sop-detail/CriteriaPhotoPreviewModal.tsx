'use client';

import React from 'react';
import type { PreviewPhotoState } from './pilot-criteria-sop.types';

interface CriteriaPhotoPreviewModalProps {
  previewPhoto: PreviewPhotoState | null;
  onClose: () => void;
}

export function CriteriaPhotoPreviewModal({ previewPhoto, onClose }: CriteriaPhotoPreviewModalProps) {
  if (!previewPhoto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
      data-testid="sop-photo-modal"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-0.5">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0">{previewPhoto.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{previewPhoto.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center font-bold text-xs"
            title="Đóng"
          >
            ✕
          </button>
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center max-h-[65vh]">
          <img src={previewPhoto.url} alt={previewPhoto.title} className="max-h-[63vh] w-auto object-contain" />
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400">
            Minh chứng thực tế chi nhánh Đề Thám · Uốn Mi Bóng Tối Pilot
          </span>
        </div>
      </div>
    </div>
  );
}
