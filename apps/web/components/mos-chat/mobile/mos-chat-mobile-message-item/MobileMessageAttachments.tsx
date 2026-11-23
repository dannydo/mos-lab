'use client';

import React from 'react';
import { Download, File, FileArchive, FileSpreadsheet, FileText } from 'lucide-react';
import type { MosChatMessage } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../../lib/api-base-url';
import { formatFileSize } from '../../utils/chat-helpers';
import { MosChatVideoPlayer } from '../../components/MosChatVideoPlayer';
import { getFileAttachmentDisplayMeta, partitionMessageAttachments } from './mobileMessageItemHelpers';

export interface MobileMessageAttachmentsProps {
  message: MosChatMessage;
  isMe: boolean;
  isDark: boolean;
  onOpenGallery?: (message: MosChatMessage, attachmentIndex: number) => void;
}

export const MobileMessageAttachments: React.FC<MobileMessageAttachmentsProps> = ({
  message,
  isMe,
  isDark,
  onOpenGallery,
}) => {
  if (!message.attachments || message.attachments.length === 0) return null;

  const { videoAttachments, imageAttachments, fileAttachments } = partitionMessageAttachments(message.attachments);

  return (
    <div className="mt-2 space-y-2">
      {/* Inline Video Player */}
      {videoAttachments.length > 0 && (
        <div className="space-y-2">
          {videoAttachments.map((att) => (
            <MosChatVideoPlayer key={att.id} attachment={att} compact={true} isMine={isMe} />
          ))}
        </div>
      )}

      {/* File / PDF attachments */}
      {fileAttachments.length > 0 && (
        <div className="space-y-1.5">
          {fileAttachments.map((att) => {
            const { fullUrl, ext, isPdf, isExcel, isWord, isZip } = getFileAttachmentDisplayMeta(att);

            return (
              <div
                key={att.id}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(fullUrl, '_blank');
                }}
                className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer active:scale-[0.98] transition-transform ${
                  isMe
                    ? isDark
                      ? 'bg-black/25 border-amber-400/30 text-[var(--mos-text)]'
                      : 'bg-black/5 border-amber-600/30 text-[var(--mos-text)]'
                    : 'bg-[var(--mos-surface-raised)] border-[var(--mos-surface-border)] text-[var(--mos-text)]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${
                    isPdf
                      ? `bg-rose-500/20 border border-rose-500/30 ${isDark ? 'text-rose-400' : 'text-rose-600'}`
                      : isExcel
                        ? `bg-emerald-500/20 border border-emerald-500/30 ${
                            isDark ? 'text-emerald-400' : 'text-emerald-700'
                          }`
                        : isWord
                          ? `bg-blue-500/20 border border-blue-500/30 ${isDark ? 'text-blue-400' : 'text-blue-700'}`
                          : isZip
                            ? `bg-amber-500/20 border border-amber-500/30 ${
                                isDark ? 'text-amber-400' : 'text-amber-700'
                              }`
                            : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border border-[var(--mos-surface-border)]'
                  }`}
                >
                  {isPdf ? (
                    <FileText size={18} />
                  ) : isExcel ? (
                    <FileSpreadsheet size={18} />
                  ) : isWord ? (
                    <FileText size={18} />
                  ) : isZip ? (
                    <FileArchive size={18} />
                  ) : (
                    <File size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">{att.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] opacity-75">
                    <span className="uppercase font-bold tracking-wider">{ext}</span>
                    {att.sizeBytes > 0 && <span className="tabular-nums">· {formatFileSize(att.sizeBytes)}</span>}
                  </div>
                </div>
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={att.name}
                  onClick={(e) => e.stopPropagation()}
                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center opacity-75 hover:opacity-100 active:scale-95 transition-transform shrink-0"
                  aria-label={`Tải ${att.name}`}
                >
                  <Download size={14} />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Image attachments gallery */}
      {imageAttachments.length > 0 && (
        <div>
          {imageAttachments.length === 1 ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenGallery?.(message, 0);
              }}
              className="rounded-xl overflow-hidden border border-black/10 cursor-pointer active:opacity-90 transition-opacity"
            >
              <img
                src={resolveMediaUrl(imageAttachments[0].url)}
                alt="Đính kèm"
                className="max-h-60 w-full object-cover rounded-xl"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
              {imageAttachments.slice(0, 4).map((att, idx) => {
                const total = imageAttachments.length;
                const isFirstOfThree = total === 3 && idx === 0;
                const isFourthInMany = total > 4 && idx === 3;
                const remaining = total - 3;

                return (
                  <div
                    key={att.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenGallery?.(message, idx);
                    }}
                    className={`relative overflow-hidden cursor-pointer active:opacity-90 transition-opacity rounded-lg ${
                      isFirstOfThree ? 'col-span-2 h-36' : 'h-28'
                    }`}
                  >
                    <img
                      src={resolveMediaUrl(att.url)}
                      alt={att.name || `Hình ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isFourthInMany && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-base tabular-nums">
                        +{remaining}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
