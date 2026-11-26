'use client';

import React from 'react';
import { Tooltip, type GlobalToken } from 'antd';
import { AlertCircle, File, FileText, Film, Loader2, Play, RotateCcw, X, ZoomIn } from 'lucide-react';
import type { MosChatImageAttachment } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import type { PendingChatUploadItem } from '../shared/hooks/useChatUploadQueue';
import { formatFileSize, getFileExtension, isImageAttachment } from '../utils/chat-helpers';
import { formatVideoDuration, isVideoAttachment } from '../utils/chat-video';

export interface MosChatStagedAttachmentsStripProps {
  items: MosChatImageAttachment[];
  scope: 'main' | 'thread' | 'dock';
  convId?: string;
  uploadingCount: number;
  pendingUploads?: PendingChatUploadItem[];
  onCancelPendingUpload?: (tempId: string) => void;
  onRetryPendingUpload?: (tempId: string) => void;
  onDismissPendingUpload?: (tempId: string) => void;
  token: GlobalToken;
  surfaceRaised: string;
  borderStrong: string;
  openLightbox: (attachments: MosChatImageAttachment[], initialIndex?: number) => void;
  removeStagedAttachment: (attId: string, scope: 'main' | 'thread' | 'dock', convId?: string) => void;
}

export const MosChatStagedAttachmentsStrip: React.FC<MosChatStagedAttachmentsStripProps> = ({
  items,
  scope,
  convId,
  uploadingCount,
  pendingUploads = [],
  onCancelPendingUpload,
  onRetryPendingUpload,
  onDismissPendingUpload,
  token,
  surfaceRaised,
  borderStrong,
  openLightbox,
  removeStagedAttachment,
}) => {
  const scopedPending = pendingUploads.filter((p) => p.scope === scope && (scope !== 'dock' || p.convId === convId));
  const activeScopedCount = scopedPending.filter((p) => p.phase !== 'error').length;
  const nonVideoUploadingCount = Math.max(0, uploadingCount - activeScopedCount);
  const showGenericUploading = (scope === 'main' || scope === 'thread') && nonVideoUploadingCount > 0;
  if (items.length === 0 && scopedPending.length === 0 && !showGenericUploading) return null;

  return (
    <div className="flex items-center gap-2 pb-2 overflow-x-auto">
      {items.map((att, idx) => {
        const isVid = isVideoAttachment(att);
        const isImg = !isVid && isImageAttachment(att);
        const ext = getFileExtension(att.name || att.url);
        const isPdf = ext.toLowerCase() === 'pdf' || att.mimeType === 'application/pdf';

        if (isVid) {
          return (
            <div
              key={att.id}
              data-no-chat-autofocus="true"
              className="relative h-14 min-w-[150px] max-w-[220px] rounded-lg overflow-hidden shrink-0 group/stage border flex items-center gap-2 pr-2"
              style={{ border: `1px solid ${borderStrong}`, background: surfaceRaised }}
            >
              <div className="relative w-14 h-14 bg-black flex items-center justify-center shrink-0 overflow-hidden">
                {att.posterUrl ? (
                  <img src={att.posterUrl} alt={att.name} className="w-full h-full object-cover" />
                ) : (
                  <Film size={20} className="text-amber-400" />
                )}
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
                  <Play size={14} className="fill-white text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[11px] font-semibold truncate" style={{ color: token.colorText }} title={att.name}>
                  {att.name}
                </p>
                <div
                  className="flex items-center gap-1.5 mt-0.5 text-[9.5px]"
                  style={{ color: token.colorTextSecondary }}
                >
                  <span className="uppercase font-bold text-amber-500">VIDEO</span>
                  {att.durationSec ? (
                    <span className="tabular-nums font-medium">{formatVideoDuration(att.durationSec)}</span>
                  ) : att.sizeBytes > 0 ? (
                    <span className="tabular-nums">{formatFileSize(att.sizeBytes)}</span>
                  ) : null}
                </div>
              </div>
              <Tooltip title="Bỏ video này">
                <button
                  type="button"
                  aria-label="Bỏ video đính kèm"
                  data-no-chat-autofocus="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStagedAttachment(att.id, scope, convId);
                  }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white inline-flex items-center justify-center cursor-pointer hover:bg-rose-500 z-10"
                >
                  <X size={10} />
                </button>
              </Tooltip>
            </div>
          );
        }

        if (isImg) {
          return (
            <div
              key={att.id}
              data-no-chat-autofocus="true"
              className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 group/stage"
              style={{ border: `1px solid ${borderStrong}`, background: surfaceRaised }}
            >
              <Tooltip title="Nhấn để phóng to xem chi tiết">
                <button
                  type="button"
                  data-no-chat-autofocus="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(items.filter(isImageAttachment), idx);
                  }}
                  className="w-full h-full block p-0 cursor-zoom-in relative"
                >
                  <img src={resolveMediaUrl(att.url)} alt={att.name} className="w-full h-full object-cover block" />
                  <span className="opacity-0 group-hover/stage:opacity-100 transition-opacity absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <ZoomIn size={14} className="text-amber-400" />
                  </span>
                </button>
              </Tooltip>
              <span
                className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded text-[8.5px] font-bold leading-tight pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.75)', color: '#fbbf24' }}
              >
                {att.source === 'clipboard' ? '⌘V' : att.source === 'drive' ? 'Drive' : 'Ảnh'}
              </span>
              <Tooltip title="Bỏ hình này">
                <button
                  type="button"
                  aria-label="Bỏ hình đính kèm"
                  data-no-chat-autofocus="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStagedAttachment(att.id, scope, convId);
                  }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 text-white inline-flex items-center justify-center cursor-pointer hover:bg-rose-500 z-10"
                >
                  <X size={10} />
                </button>
              </Tooltip>
            </div>
          );
        }

        return (
          <div
            key={att.id}
            data-no-chat-autofocus="true"
            className="relative h-14 min-w-[130px] max-w-[200px] px-2.5 rounded-lg flex items-center gap-2 shrink-0 group/stage border"
            style={{ border: `1px solid ${borderStrong}`, background: surfaceRaised }}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-extrabold text-[10px] ${
                isPdf
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {isPdf ? <FileText size={18} /> : <File size={18} />}
            </div>
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-[11px] font-semibold truncate" title={att.name} style={{ color: token.colorText }}>
                {att.name}
              </p>
              <div className="flex items-center gap-1.5 text-[9.5px]" style={{ color: token.colorTextSecondary }}>
                <span className="font-extrabold">{ext}</span>
                {att.sizeBytes > 0 && <span className="tabular-nums">· {formatFileSize(att.sizeBytes)}</span>}
              </div>
            </div>
            <Tooltip title="Bỏ tệp này">
              <button
                type="button"
                aria-label="Bỏ tệp đính kèm"
                data-no-chat-autofocus="true"
                onClick={(e) => {
                  e.stopPropagation();
                  removeStagedAttachment(att.id, scope, convId);
                }}
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white inline-flex items-center justify-center cursor-pointer hover:bg-rose-500 z-10"
              >
                <X size={10} />
              </button>
            </Tooltip>
          </div>
        );
      })}
      {scopedPending.map((item) => {
        const isError = item.phase === 'error';
        const isFinalizing = item.phase === 'finalizing';
        const isQueued = item.phase === 'queued';
        return (
          <div
            key={item.tempId}
            data-no-chat-autofocus="true"
            className="relative h-14 min-w-[205px] max-w-[260px] rounded-lg overflow-hidden shrink-0 border flex items-center gap-2 px-2"
            style={{
              border: `1px solid ${isError ? 'rgba(244, 63, 94, 0.55)' : borderStrong}`,
              background: surfaceRaised,
            }}
          >
            <div className="w-9 h-9 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              {isError ? (
                <AlertCircle size={17} className="text-rose-500" />
              ) : (
                <Film size={17} className="text-amber-500" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-5">
              <p
                className="text-[11px] font-semibold truncate"
                style={{ color: token.colorText }}
                title={item.fileName}
              >
                {item.fileName}
              </p>
              {isError ? (
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                  <span className="text-rose-500 font-semibold truncate">{item.errorMessage || 'Lỗi tải lên'}</span>
                  {onRetryPendingUpload && (
                    <button
                      type="button"
                      data-no-chat-autofocus="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryPendingUpload(item.tempId);
                      }}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold hover:bg-amber-500/30 cursor-pointer shrink-0"
                    >
                      <RotateCcw size={10} />
                      <span>Thử lại</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className="flex items-center justify-between gap-2 mt-0.5 text-[9.5px] tabular-nums"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <span className="truncate font-medium text-amber-500">
                      {isQueued ? 'Đang chờ...' : isFinalizing ? 'Đang hoàn tất...' : `${item.percent}%`}
                    </span>
                    <span className="shrink-0">
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
            <Tooltip title={isError ? 'Đóng' : 'Hủy tải video'}>
              <button
                type="button"
                aria-label={isError ? 'Đóng thông báo lỗi tải video' : 'Hủy tải video'}
                data-no-chat-autofocus="true"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isError) {
                    onDismissPendingUpload?.(item.tempId);
                  } else {
                    onCancelPendingUpload?.(item.tempId);
                  }
                }}
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white inline-flex items-center justify-center cursor-pointer hover:bg-rose-500 z-10"
              >
                <X size={10} />
              </button>
            </Tooltip>
          </div>
        );
      })}
      {showGenericUploading && (
        <div
          className="h-14 px-3 rounded-lg inline-flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
          style={{ border: `1px dashed ${borderStrong}`, background: surfaceRaised, color: '#d4a84b' }}
        >
          <Loader2 size={14} className="animate-spin" />
          <span>Đang tải tệp ({nonVideoUploadingCount})...</span>
        </div>
      )}
    </div>
  );
};
