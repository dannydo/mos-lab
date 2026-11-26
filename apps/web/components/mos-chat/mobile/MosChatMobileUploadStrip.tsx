'use client';

import React from 'react';
import { AlertCircle, Film, RotateCcw, X } from 'lucide-react';
import type { PendingChatUploadItem } from '../shared/hooks/useChatUploadQueue';
import { formatFileSize } from '../utils/chat-helpers';

export interface MosChatMobileUploadStripProps {
  items: PendingChatUploadItem[];
  onCancel: (tempId: string) => void;
  onRetry: (tempId: string) => void;
  onDismiss: (tempId: string) => void;
}

export const MosChatMobileUploadStrip: React.FC<MosChatMobileUploadStripProps> = ({
  items,
  onCancel,
  onRetry,
  onDismiss,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mb-2">
      {items.map((item) => {
        const isError = item.phase === 'error';
        const isFinalizing = item.phase === 'finalizing';
        const isQueued = item.phase === 'queued';
        return (
          <div
            key={item.tempId}
            className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl border bg-[var(--mos-surface-raised)] ${
              isError ? 'border-rose-500/50' : 'border-amber-500/40'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              {isError ? (
                <AlertCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <Film className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-semibold text-[var(--mos-text)] truncate pr-4" title={item.fileName}>
                {item.fileName}
              </p>
              {isError ? (
                <div className="flex items-center justify-between gap-2 mt-0.5 text-[10.5px]">
                  <span className="text-rose-500 truncate">{item.errorMessage || 'Lỗi tải video'}</span>
                  <button
                    type="button"
                    onClick={() => onRetry(item.tempId)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-bold shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Thử lại</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--mos-text-muted)] tabular-nums mt-0.5">
                    <span className="font-semibold text-amber-500">
                      {isQueued ? 'Đang chờ...' : isFinalizing ? 'Đang hoàn tất...' : `${item.percent}%`}
                    </span>
                    <span>
                      {formatFileSize(item.loadedBytes)} / {formatFileSize(item.totalBytes)}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-black/15 dark:bg-white/15 overflow-hidden mt-1">
                    <div
                      className="h-full bg-amber-500 transition-all duration-150"
                      style={{ width: `${Math.max(4, Math.min(100, item.percent))}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => (isError ? onDismiss(item.tempId) : onCancel(item.tempId))}
              className="w-5 h-5 rounded-full bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] hover:text-rose-500 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label={isError ? 'Đóng thông báo lỗi' : 'Hủy tải video'}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
