'use client';

import React, { useState, useMemo } from 'react';
import {
  Pin,
  PinOff,
  CornerDownRight,
  MessageSquare,
  Search,
  X,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
  MessageSquareReply,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { MosChatMessage, MosChatImageAttachment } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { MosChatAvatar } from '../MosChatAvatar';
import { MosChatRichText } from '../MosChatRichText';
import { MosChatCustomerCardAttachment } from '../components/MosChatCustomerCardAttachment';
import { resolveMediaUrl } from '../../../lib/api-base-url';

export interface MosChatMobilePinnedTabProps {
  onGoToMessage: (msg: MosChatMessage) => void;
  onBackToChat: () => void;
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MosChatMobilePinnedTab: React.FC<MosChatMobilePinnedTabProps> = ({
  onGoToMessage,
  onBackToChat,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const { pinnedMessages, activeConversation, togglePinMessage, staffDirectory } = useMosChat();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredPinned = useMemo(() => {
    if (!searchQuery.trim()) return pinnedMessages;
    const q = searchQuery.trim().toLowerCase();
    return pinnedMessages.filter(
      (m) =>
        (m.text || '').toLowerCase().includes(q) ||
        (m.senderName || '').toLowerCase().includes(q)
    );
  }, [pinnedMessages, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] text-[var(--mos-text)] overflow-hidden select-none">
      {/* Top Header / Bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[var(--mos-surface-border)] bg-[var(--mos-surface)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center ${
              isDark ? 'text-amber-400' : 'text-amber-600'
            }`}
          >
            <Pin className={`w-4 h-4 ${isDark ? 'fill-amber-400' : 'fill-amber-600'}`} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--mos-text)] tracking-tight flex items-center gap-1.5 leading-tight">
              <span>Tin nhắn đã ghim</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 border border-amber-500/30 tabular-nums ${
                  isDark ? 'text-amber-400' : 'text-amber-700'
                }`}
              >
                {pinnedMessages.length}
              </span>
            </h2>
            <p className="text-[11px] text-[var(--mos-text-muted)] truncate max-w-[220px]">
              {activeConversation?.name ? `#${activeConversation.name}` : 'Cuộc trò chuyện'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToChat}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--mos-surface-muted)] hover:opacity-90 text-xs font-semibold border border-[var(--mos-surface-border)] active:scale-95 transition-transform ${
            isDark ? 'text-amber-400' : 'text-amber-700'
          }`}
        >
          <span>Trò chuyện</span>
          <CornerDownRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input (only shown if there are pinned messages or search is active) */}
      {(pinnedMessages.length > 0 || searchQuery.trim()) && (
        <div className="px-4 py-2 border-b border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)]">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[var(--mos-text-muted)] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm trong tin nhắn ghim..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] text-xs text-[var(--mos-text)] placeholder-[var(--mos-text-muted)] focus:outline-none focus:border-[var(--mos-accent)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
        {pinnedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl text-center space-y-3 my-6 border border-dashed border-[var(--mos-surface-border)] bg-[var(--mos-surface)]">
            <div
              className={`w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center ${
                isDark ? 'text-amber-400/80' : 'text-amber-600'
              }`}
            >
              <Pin className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--mos-text)]">
                Chưa có tin nhắn nào được ghim
              </h3>
              <p className="text-xs text-[var(--mos-text-muted)] mt-1 max-w-xs leading-relaxed">
                Nhấn giữ vào bất kỳ tin nhắn nào trong cuộc trò chuyện và chọn &ldquo;Ghim tin nhắn&rdquo; để lưu nhanh tại đây.
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToChat}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold text-xs shadow-md active:scale-95 transition-transform"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Quay lại cuộc trò chuyện</span>
            </button>
          </div>
        ) : filteredPinned.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
            <Search className="w-8 h-8 text-[var(--mos-text-muted)] opacity-50 mb-1" />
            <p className="text-sm font-semibold text-[var(--mos-text-muted)]">Không tìm thấy tin nhắn ghim phù hợp</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`text-xs font-semibold underline mt-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          filteredPinned.map((m) => {
            const timeFormatted = m.timeLabel || dayjs(m.createdAt).format('HH:mm DD/MM');
            const threadCount = m.thread?.length || 0;
            const imageAttachments = (m.attachments || []).filter(
              (att) =>
                !att.mimeType ||
                att.mimeType.startsWith('image/') ||
                ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(getFileExtension(att.name || att.url).toLowerCase())
            );
            const fileAttachments = (m.attachments || []).filter(
              (att) =>
                att.mimeType &&
                !att.mimeType.startsWith('image/') &&
                !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(getFileExtension(att.name || att.url).toLowerCase())
            );

            return (
              <div
                key={m.id}
                onClick={() => onGoToMessage(m)}
                className="p-3.5 rounded-2xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] hover:border-amber-500/40 border-l-4 border-l-amber-500 text-xs transition-all shadow-sm active:scale-[0.99] cursor-pointer group"
              >
                {/* Header: Sender info & actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MosChatAvatar
                      size="sm"
                      src={m.senderAvatar}
                      name={m.senderName}
                      staffId={m.senderId}
                      staffDirectory={staffDirectory}
                    />
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="font-bold text-[var(--mos-text)] truncate">{m.senderName}</span>
                      {m.senderRole && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] font-medium uppercase border border-[var(--mos-surface-border)] shrink-0">
                          {m.senderRole}
                        </span>
                      )}
                      <span className="text-[var(--mos-text-muted)] text-[11px] tabular-nums shrink-0">
                        · {timeFormatted}
                      </span>
                    </div>
                  </div>

                  {threadCount > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 border border-sky-500/30 tabular-nums shrink-0 ${
                        isDark ? 'text-sky-400' : 'text-sky-700'
                      }`}
                    >
                      <MessageSquareReply className="w-3 h-3" />
                      <span>{threadCount}</span>
                    </span>
                  )}
                </div>

                {/* Message Body */}
                {m.text && (
                  <div className="text-[var(--mos-text)] line-clamp-4 break-words leading-relaxed pl-0.5">
                    <MosChatRichText content={m.text} isMe={false} isDark={isDark} />
                  </div>
                )}

                {/* Customer Card Attachment */}
                {m.customerCard && (
                  <MosChatCustomerCardAttachment card={m.customerCard} />
                )}

                {/* Attachments preview */}
                {imageAttachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 mt-2 rounded-xl overflow-hidden">
                    {imageAttachments.slice(0, 3).map((att) => (
                      <div key={att.id} className="relative aspect-video rounded-lg overflow-hidden bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)]">
                        <img
                          src={resolveMediaUrl(att.url)}
                          alt={att.name || 'Ảnh đính kèm'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {fileAttachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {fileAttachments.slice(0, 2).map((att) => {
                      const ext = getFileExtension(att.name || att.url).toLowerCase();
                      const isPdf = ext === 'pdf' || att.mimeType === 'application/pdf';
                      const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);

                      return (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 p-2 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text)]"
                        >
                          {isPdf ? (
                            <FileText size={16} className={`shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                          ) : isExcel ? (
                            <FileSpreadsheet size={16} className={`shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          ) : (
                            <File size={16} className="text-[var(--mos-text-muted)] shrink-0" />
                          )}
                          <span className="text-xs font-semibold truncate flex-1">{att.name}</span>
                          {att.sizeBytes && att.sizeBytes > 0 && (
                            <span className="text-[10px] text-[var(--mos-text-muted)] tabular-nums shrink-0">
                              {formatFileSize(att.sizeBytes)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Card Actions */}
                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[var(--mos-surface-border)] text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoToMessage(m);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 font-semibold border border-amber-500/30 hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer ${
                      isDark ? 'text-amber-400' : 'text-amber-700'
                    }`}
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Đi đến tin nhắn</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinMessage(m.id);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[var(--mos-text-muted)] hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer ${
                      isDark ? 'hover:text-rose-400' : 'hover:text-rose-600'
                    }`}
                    aria-label="Bỏ ghim tin nhắn này"
                    title="Bỏ ghim"
                  >
                    <PinOff className="w-3.5 h-3.5" />
                    <span>Bỏ ghim</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
