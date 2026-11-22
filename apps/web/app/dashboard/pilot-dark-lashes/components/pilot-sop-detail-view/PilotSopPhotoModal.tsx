'use client';

import React from 'react';
import { X } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import type { PreviewMediaState } from './pilot-sop-detail-helpers';

interface PilotSopPhotoModalProps {
  previewMedia: PreviewMediaState;
  onClose: () => void;
}

export function PilotSopPhotoModal({ previewMedia, onClose }: PilotSopPhotoModalProps) {
  if (!previewMedia.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
      data-testid="sop-photo-modal"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0">{previewMedia.title}</h4>
          <button
            type="button"
            aria-label="Đóng xem ảnh"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            <AppIcon icon={X} size={14} />
          </button>
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center max-h-[65vh]">
          <img
            src={previewMedia.imageUrl}
            alt={previewMedia.title}
            className="max-h-[63vh] w-auto object-contain rounded-lg"
          />
        </div>
        {previewMedia.note && (
          <p className="text-xs text-slate-600 dark:text-slate-300 m-0 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {previewMedia.note}
          </p>
        )}
      </div>
    </div>
  );
}
