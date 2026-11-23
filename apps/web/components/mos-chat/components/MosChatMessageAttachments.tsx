'use client';

import React from 'react';
import { Dropdown, Tooltip, type GlobalToken } from 'antd';
import {
  Copy,
  Download,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Link as LinkIcon,
  ZoomIn,
} from 'lucide-react';
import type { MosChatImageAttachment } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { formatFileSize, getFileExtension, isImageAttachment } from '../utils/chat-helpers';
import { copyImageToClipboard, copyImageUrlToClipboard, downloadImage } from '../utils/chat-image-copy';
import { isVideoAttachment } from '../utils/chat-video';
import { MosChatVideoPlayer } from './MosChatVideoPlayer';

export interface MosChatMessageAttachmentsProps {
  attachments?: MosChatImageAttachment[];
  compact?: boolean;
  isMine?: boolean;
  isDark: boolean;
  token: GlobalToken;
  surfaceRaised: string;
  borderStrong: string;
  openLightbox: (attachments: MosChatImageAttachment[], initialIndex?: number) => void;
}

export const MosChatMessageAttachments: React.FC<MosChatMessageAttachmentsProps> = ({
  attachments,
  compact = false,
  isMine = false,
  isDark,
  token,
  surfaceRaised,
  borderStrong,
  openLightbox,
}) => {
  if (!attachments || attachments.length === 0) return null;
  const videos = attachments.filter(isVideoAttachment);
  const images = attachments.filter((att) => isImageAttachment(att) && !isVideoAttachment(att));
  const files = attachments.filter((att) => !isImageAttachment(att) && !isVideoAttachment(att));
  const totalImages = images.length;

  return (
    <div className={`mt-1.5 flex flex-col gap-2 w-full ${isMine ? 'items-end' : 'items-start'}`}>
      {videos.length > 0 && (
        <div className={`flex flex-col gap-2 w-full ${isMine ? 'items-end' : 'items-start'}`}>
          {videos.map((att) => (
            <MosChatVideoPlayer key={att.id} attachment={att} compact={compact} isMine={isMine} />
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
          {files.map((att) => {
            const fullUrl = resolveMediaUrl(att.url);
            const ext = getFileExtension(att.name || att.url).toLowerCase();
            const isPdf = ext === 'pdf' || att.mimeType === 'application/pdf';
            const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
            const isWord = ['doc', 'docx'].includes(ext);
            const isZip = ['zip', 'rar', '7z'].includes(ext);

            return (
              <div
                key={att.id}
                onClick={() => window.open(fullUrl, '_blank')}
                className="flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md select-none group/file"
                style={{
                  background: surfaceRaised,
                  borderColor: borderStrong,
                  maxWidth: compact ? 220 : 320,
                  minWidth: compact ? 180 : 240,
                }}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${
                    isPdf
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : isExcel
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : isWord
                          ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                          : isZip
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {isPdf ? (
                    <FileText size={20} className="text-rose-500" />
                  ) : isExcel ? (
                    <FileSpreadsheet size={20} className="text-emerald-500" />
                  ) : isWord ? (
                    <FileText size={20} className="text-blue-500" />
                  ) : isZip ? (
                    <FileArchive size={20} className="text-amber-500" />
                  ) : (
                    <File size={20} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold truncate group-hover/file:text-amber-400 transition-colors"
                    title={att.name}
                    style={{ color: token.colorText }}
                  >
                    {att.name}
                  </p>
                  <div
                    className="flex items-center gap-2 mt-0.5 text-[10.5px]"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <span
                      className="uppercase font-extrabold tracking-wider text-[9px] px-1 py-0.2 rounded"
                      style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                    >
                      {ext.toUpperCase()}
                    </span>
                    {att.sizeBytes > 0 && <span className="tabular-nums">{formatFileSize(att.sizeBytes)}</span>}
                  </div>
                </div>
                <Tooltip title="Mở / Tải về tệp này">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={att.name}
                    onClick={(e) => e.stopPropagation()}
                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <Download size={14} />
                  </a>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}

      {images.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
          {images.map((att, idx) => {
            const fullUrl = resolveMediaUrl(att.url);
            const imageContextMenuItems = [
              {
                key: 'copy-img',
                icon: <Copy size={14} style={{ color: '#fbbf24' }} />,
                label: 'Sao chép hình ảnh',
                onClick: () => copyImageToClipboard(fullUrl),
              },
              {
                key: 'copy-link',
                icon: <LinkIcon size={14} style={{ color: '#38bdf8' }} />,
                label: 'Sao chép liên kết hình ảnh',
                onClick: () => copyImageUrlToClipboard(fullUrl),
              },
              { type: 'divider' as const },
              {
                key: 'download',
                icon: <Download size={14} style={{ color: '#34d399' }} />,
                label: 'Tải hình ảnh về máy',
                onClick: () => downloadImage(fullUrl, att.name),
              },
              {
                key: 'zoom',
                icon: <ZoomIn size={14} />,
                label: 'Xem phóng to chi tiết',
                onClick: () => openLightbox(images, idx),
              },
            ];

            return (
              <Dropdown key={att.id} menu={{ items: imageContextMenuItems }} trigger={['contextMenu']}>
                <div
                  role="button"
                  tabIndex={0}
                  data-no-chat-autofocus="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(images, idx);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      openLightbox(images, idx);
                    }
                  }}
                  className="relative rounded-xl overflow-hidden group/img cursor-zoom-in text-left block p-0 select-none"
                  style={{
                    border: `1px solid ${borderStrong}`,
                    background: surfaceRaised,
                    maxWidth: compact ? 180 : 280,
                  }}
                >
                  <img
                    src={fullUrl}
                    alt={att.name || 'Hình đính kèm'}
                    style={{
                      maxHeight: compact ? 120 : 200,
                      maxWidth: compact ? 180 : 280,
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  <div className="opacity-0 group-hover/img:opacity-100 transition-opacity absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <span
                      className="w-8 h-8 rounded-full inline-flex items-center justify-center shadow-lg pointer-events-none"
                      style={{
                        background: 'rgba(15, 23, 42, 0.88)',
                        color: '#fbbf24',
                        border: '1px solid rgba(251, 191, 36, 0.45)',
                      }}
                    >
                      <ZoomIn size={15} />
                    </span>
                  </div>

                  <div className="opacity-0 group-hover/img:opacity-100 transition-opacity absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                    <Tooltip title="Sao chép hình ảnh">
                      <button
                        type="button"
                        aria-label="Sao chép hình ảnh"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyImageToClipboard(fullUrl);
                        }}
                        className="w-6 h-6 rounded-md bg-slate-900/85 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center shadow-md cursor-pointer transition-colors border border-white/20"
                      >
                        <Copy size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip title="Tải hình về máy">
                      <button
                        type="button"
                        aria-label="Tải hình về máy"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(fullUrl, att.name);
                        }}
                        className="w-6 h-6 rounded-md bg-slate-900/85 hover:bg-emerald-500 hover:text-white text-white flex items-center justify-center shadow-md cursor-pointer transition-colors border border-white/20"
                      >
                        <Download size={12} />
                      </button>
                    </Tooltip>
                  </div>

                  {totalImages > 1 && (
                    <span
                      className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums pointer-events-none group-hover/img:opacity-0 transition-opacity"
                      style={{
                        background: 'rgba(15, 23, 42, 0.82)',
                        color: '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                      }}
                    >
                      {idx + 1}/{totalImages}
                    </span>
                  )}
                  {att.source === 'drive' && (
                    <span
                      className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-flex items-center gap-1 pointer-events-none"
                      style={{ background: 'rgba(15, 23, 42, 0.82)', color: '#fbbf24' }}
                    >
                      <HardDrive size={10} />
                      <span>Drive</span>
                    </span>
                  )}
                </div>
              </Dropdown>
            );
          })}
        </div>
      )}
    </div>
  );
};
