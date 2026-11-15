'use client';

import React, { useMemo, useState } from 'react';
import {
  CornerDownRight,
  ExternalLink,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  PanelRightOpen,
  Search,
  Sparkles,
} from 'lucide-react';
import { Tooltip } from 'antd';
import {
  extractGoogleWorkspaceLinksFromText,
  type MosChatConversation,
  type MosChatImageAttachment,
  type ParsedGoogleWorkspaceLink,
} from '@mos-lab/shared';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { formatFileSize, getFileExtension, isImageAttachment } from '../utils/chat-helpers';
import { isVideoAttachment } from '../utils/chat-video';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { getCachedGoogleWorkspaceMeta, openGoogleWorkspaceReader } from '../utils/google-workspace-bridge';

type FilesFilterCategory = 'all' | 'spreadsheet' | 'document' | 'attachments';

interface CollectedGoogleWorkspaceItem {
  id: string;
  kind: 'spreadsheet' | 'document';
  link: ParsedGoogleWorkspaceLink;
  senderName: string;
  senderId?: number | string;
  timeLabel: string;
  createdAt: string;
  messageId: string;
  isThreadReply?: boolean;
  messageSnippet: string;
}

interface CollectedAttachmentItem {
  id: string;
  attachment: MosChatImageAttachment;
  senderName: string;
  timeLabel: string;
  createdAt: string;
  messageId: string;
  isThreadReply?: boolean;
}

export interface MosChatFilesPaneProps {
  activeConversation: MosChatConversation | null;
  setActiveSubtab: (tab: MosChatActiveSubtab) => void;
  navigateToMessage: (convId: string, msgId: string) => void;
  isDark: boolean;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  borderStrong?: string;
  isMobile?: boolean;
}

export function countConversationSharedWorkspaceItems(conversation: MosChatConversation | null | undefined): number {
  if (!conversation?.messages?.length) return 0;
  const seenGw = new Set<string>();
  let attCount = 0;

  for (const msg of conversation.messages) {
    if (msg.isDeleted) continue;
    if (msg.text) {
      for (const link of extractGoogleWorkspaceLinksFromText(msg.text)) {
        seenGw.add(link.cacheKey);
      }
    }
    if (msg.attachments?.length) {
      attCount += msg.attachments.length;
    }
    for (const reply of msg.thread || []) {
      if (reply.isDeleted) continue;
      if (reply.text) {
        for (const link of extractGoogleWorkspaceLinksFromText(reply.text)) {
          seenGw.add(link.cacheKey);
        }
      }
      if (reply.attachments?.length) {
        attCount += reply.attachments.length;
      }
    }
  }
  return seenGw.size + attCount;
}

export const MosChatFilesPane: React.FC<MosChatFilesPaneProps> = React.memo(
  ({
    activeConversation,
    setActiveSubtab,
    navigateToMessage,
    isDark,
    surfaceBg,
    surfaceRaised,
    borderColor,
    isMobile = false,
  }) => {
    const [category, setCategory] = useState<FilesFilterCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const { googleItems, attachmentItems } = useMemo(() => {
      const gwList: CollectedGoogleWorkspaceItem[] = [];
      const seenGwKeys = new Set<string>();
      const attList: CollectedAttachmentItem[] = [];
      const msgs = activeConversation?.messages || [];

      for (let i = msgs.length - 1; i >= 0; i--) {
        const msg = msgs[i];
        if (msg.isDeleted) continue;

        const pushTextLinks = (
          text: string | undefined | null,
          meta: {
            senderName: string;
            senderId?: number | string;
            timeLabel: string;
            createdAt: string;
            messageId: string;
            isThreadReply?: boolean;
          }
        ) => {
          if (!text) return;
          for (const link of extractGoogleWorkspaceLinksFromText(text)) {
            if (seenGwKeys.has(link.cacheKey)) continue;
            seenGwKeys.add(link.cacheKey);
            gwList.push({
              id: `${meta.messageId}:${link.cacheKey}`,
              kind: link.kind,
              link,
              senderName: meta.senderName,
              senderId: meta.senderId,
              timeLabel: meta.timeLabel,
              createdAt: meta.createdAt,
              messageId: meta.messageId,
              isThreadReply: meta.isThreadReply,
              messageSnippet: text.replace(/https?:\/\/\S+/g, '').trim(),
            });
          }
        };

        const pushAttachments = (
          attachments: MosChatImageAttachment[] | undefined,
          meta: {
            senderName: string;
            timeLabel: string;
            createdAt: string;
            messageId: string;
            isThreadReply?: boolean;
          }
        ) => {
          if (!attachments?.length) return;
          for (const att of attachments) {
            attList.push({
              id: `${meta.messageId}:${att.id || att.url}`,
              attachment: att,
              senderName: meta.senderName,
              timeLabel: meta.timeLabel,
              createdAt: meta.createdAt,
              messageId: meta.messageId,
              isThreadReply: meta.isThreadReply,
            });
          }
        };

        // Thread replies newest first, then root message
        const replies = msg.thread || [];
        for (let j = replies.length - 1; j >= 0; j--) {
          const r = replies[j];
          if (r.isDeleted) continue;
          pushTextLinks(r.text, {
            senderName: r.senderName,
            senderId: r.senderId,
            timeLabel: r.timeLabel,
            createdAt: r.createdAt,
            messageId: msg.id,
            isThreadReply: true,
          });
          pushAttachments(r.attachments, {
            senderName: r.senderName,
            timeLabel: r.timeLabel,
            createdAt: r.createdAt,
            messageId: msg.id,
            isThreadReply: true,
          });
        }

        pushTextLinks(msg.text, {
          senderName: msg.senderName,
          senderId: msg.senderId,
          timeLabel: msg.timeLabel,
          createdAt: msg.createdAt,
          messageId: msg.id,
        });
        pushAttachments(msg.attachments, {
          senderName: msg.senderName,
          timeLabel: msg.timeLabel,
          createdAt: msg.createdAt,
          messageId: msg.id,
        });
      }

      return { googleItems: gwList, attachmentItems: attList };
    }, [activeConversation?.messages]);

    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredGoogleItems = useMemo(() => {
      return googleItems.filter((item) => {
        if (category === 'attachments') return false;
        if (category === 'spreadsheet' && item.kind !== 'spreadsheet') return false;
        if (category === 'document' && item.kind !== 'document') return false;
        if (!normalizedQuery) return true;
        const cachedTitle = getCachedGoogleWorkspaceMeta(item.link.rawUrl)?.title || '';
        const haystack =
          `${cachedTitle} ${item.link.shortChipLabel} ${item.senderName} ${item.messageSnippet} ${item.link.range || ''}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }, [googleItems, category, normalizedQuery]);

    const filteredAttachments = useMemo(() => {
      if (category === 'spreadsheet' || category === 'document') return [];
      return attachmentItems.filter((item) => {
        if (!normalizedQuery) return true;
        const haystack = `${item.attachment.name || ''} ${item.senderName}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }, [attachmentItems, category, normalizedQuery]);

    const sheetCount = googleItems.filter((i) => i.kind === 'spreadsheet').length;
    const docCount = googleItems.filter((i) => i.kind === 'document').length;
    const totalCount = googleItems.length + attachmentItems.length;

    const handleJumpToMessage = (messageId: string) => {
      if (!activeConversation) return;
      setActiveSubtab('chat');
      setTimeout(() => {
        navigateToMessage(activeConversation.id, messageId);
      }, 60);
    };

    const filterButtons: Array<{ id: FilesFilterCategory; label: string; count: number }> = [
      { id: 'all', label: 'Tất cả', count: totalCount },
      { id: 'spreadsheet', label: 'Google Sheets', count: sheetCount },
      { id: 'document', label: 'Google Docs', count: docCount },
      { id: 'attachments', label: 'Tệp & Ảnh', count: attachmentItems.length },
    ];

    return (
      <div data-testid="mos-chat-files-pane" className={`flex-1 overflow-y-auto space-y-3 ${isMobile ? 'p-3' : 'p-4'}`}>
        {/* Header Summary */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[13.5px] font-extrabold flex items-center gap-2">
            <FolderOpen size={16} className="text-emerald-500" />
            <span>Tài liệu & Google Workspace</span>
            <span
              className="inline-flex items-center justify-center leading-none text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums"
              style={{ background: 'rgba(16, 185, 129, 0.16)', color: '#10b981' }}
            >
              {totalCount}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubtab('chat')}
            className="text-[12px] font-semibold text-amber-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Quay lại trò chuyện</span>
            <CornerDownRight size={13} />
          </button>
        </div>

        {/* Search & Filter Chips */}
        <div className="space-y-2">
          <div className="relative">
            <Search
              size={14}
              className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên Sheet, Docs, người gửi hoặc ghi chú..."
              aria-label="Tìm kiếm tài liệu"
              className="w-full h-8 pl-8 pr-3 rounded-lg text-[12px] focus:outline-none"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderColor}`,
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {filterButtons.map((btn) => {
              const active = category === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setCategory(btn.id)}
                  className={`inline-flex items-center justify-center gap-1.5 leading-none px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition-colors ${
                    active
                      ? isDark
                        ? 'bg-emerald-500/20 border-emerald-400/55 text-emerald-200'
                        : 'bg-emerald-100 border-emerald-400 text-emerald-900'
                      : isDark
                        ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{btn.label}</span>
                  <span className="tabular-nums text-[10px] opacity-80">{btn.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {filteredGoogleItems.length === 0 && filteredAttachments.length === 0 && (
          <div
            className="flex flex-col items-center justify-center p-8 rounded-xl text-center space-y-2 mt-4"
            style={{
              background: surfaceBg,
              border: `1px dashed ${borderColor}`,
            }}
          >
            <FolderOpen size={32} className="text-slate-400/60 mb-1" />
            <div className="text-[13px] font-bold text-slate-400">
              {totalCount === 0
                ? 'Chưa có Google Sheet, Docs hay tệp nào được chia sẻ trong cuộc trò chuyện này'
                : 'Không tìm thấy tài liệu nào khớp bộ lọc'}
            </div>
            <div className="text-[11.5px] text-slate-500 max-w-sm">
              Khi thành viên gửi đường dẫn Google Sheets / Google Docs hoặc tệp đính kèm, toàn bộ sẽ được tự động gom
              gọn tại đây để mở đọc nhanh bất cứ lúc nào.
            </div>
            <button
              type="button"
              onClick={() => setActiveSubtab('chat')}
              className="mt-2 h-7 px-3 rounded-md text-[11.5px] font-bold text-amber-500 hover:bg-amber-400/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              style={{ border: '1px solid rgba(212, 168, 75, 0.3)' }}
            >
              <MessageSquare size={13} />
              <span>Quay lại cuộc trò chuyện</span>
            </button>
          </div>
        )}

        {/* Google Workspace Section */}
        {filteredGoogleItems.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-0.5 tabular-nums">
              Google Sheets & Docs ({filteredGoogleItems.length})
            </div>
            <div className="space-y-2">
              {filteredGoogleItems.map((item) => {
                const cachedMeta = getCachedGoogleWorkspaceMeta(item.link.rawUrl);
                const isSheet = item.kind === 'spreadsheet';
                const title = cachedMeta?.title || (isSheet ? 'Google Sheet' : 'Google Docs');
                return (
                  <div
                    key={item.id}
                    data-testid="mos-chat-files-gw-item"
                    className="p-3 rounded-xl flex items-start justify-between gap-3 transition-all hover:shadow-sm"
                    style={{
                      background: surfaceBg,
                      border: `1px solid ${borderColor}`,
                      borderLeft: `4px solid ${isSheet ? '#10b981' : '#38bdf8'}`,
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSheet
                            ? isDark
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-emerald-100 text-emerald-700'
                            : isDark
                              ? 'bg-sky-500/20 text-sky-400'
                              : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {isSheet ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12.5px] font-bold truncate max-w-[260px]">{title}</span>
                          {cachedMeta?.tabTitle && (
                            <span
                              className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {cachedMeta.tabTitle}
                            </span>
                          )}
                          {item.link.range && (
                            <span
                              className={`inline-flex items-center gap-0.5 leading-none px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                                isDark
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/35'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              <MapPin size={9} />
                              <span>{item.link.range}</span>
                            </span>
                          )}
                        </div>

                        {item.messageSnippet && (
                          <div className="text-[11.5px] opacity-85 line-clamp-1">{item.messageSnippet}</div>
                        )}

                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap tabular-nums">
                          <span className="font-semibold text-amber-500">{item.senderName}</span>
                          <span>·</span>
                          <span>{item.timeLabel}</span>
                          {item.isThreadReply && <span>· Trong luồng trả lời</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          openGoogleWorkspaceReader({
                            url: item.link.rawUrl,
                            gid: item.link.gid,
                            range: item.link.range,
                            conversationId: activeConversation?.id,
                            messageId: item.messageId,
                            initialMode: 'fast',
                          })
                        }
                        className={`inline-flex items-center justify-center gap-1 leading-none px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                          isSheet
                            ? isDark
                              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : isDark
                              ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                              : 'bg-sky-600 text-white hover:bg-sky-700'
                        }`}
                      >
                        <PanelRightOpen size={12} />
                        <span>Đọc bên cạnh</span>
                      </button>

                      <Tooltip title="Hỏi @AI phân tích tài liệu này">
                        <button
                          type="button"
                          onClick={() =>
                            openGoogleWorkspaceReader({
                              url: item.link.rawUrl,
                              gid: item.link.gid,
                              range: item.link.range,
                              conversationId: activeConversation?.id,
                              messageId: item.messageId,
                              initialMode: 'fast',
                              openAiBar: true,
                              initialAiPrompt: 'Tóm tắt nhanh các nội dung chính trong tài liệu này.',
                            })
                          }
                          aria-label="Hỏi AI về tài liệu"
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border cursor-pointer ${
                            isDark
                              ? 'border-purple-500/35 text-purple-300 hover:bg-purple-500/15'
                              : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                          }`}
                        >
                          <Sparkles size={12} />
                        </button>
                      </Tooltip>

                      <Tooltip title="Đi tới tin nhắn gốc">
                        <button
                          type="button"
                          onClick={() => handleJumpToMessage(item.messageId)}
                          aria-label="Đi tới tin nhắn gốc"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                          style={{ borderColor }}
                        >
                          <CornerDownRight size={12} />
                        </button>
                      </Tooltip>

                      <Tooltip title="Mở trên Google">
                        <a
                          href={item.link.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Mở trên Google"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10"
                          style={{ borderColor }}
                        >
                          <ExternalLink size={12} />
                        </a>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Uploaded Attachments Section */}
        {filteredAttachments.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-0.5 tabular-nums">
              Tệp đính kèm & Hình ảnh ({filteredAttachments.length})
            </div>
            <div className="space-y-1.5">
              {filteredAttachments.map((item) => {
                const isImg = isImageAttachment(item.attachment);
                const isVid = isVideoAttachment(item.attachment);
                const ext = getFileExtension(item.attachment.name);
                const resolvedHref = resolveMediaUrl(item.attachment.url);
                return (
                  <div
                    key={item.id}
                    data-testid="mos-chat-files-att-item"
                    className="p-2.5 rounded-xl flex items-center justify-between gap-2.5"
                    style={{
                      background: surfaceBg,
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isImg ? (
                          <ImageIcon size={15} className="text-sky-400" />
                        ) : isVid ? (
                          <Film size={15} className="text-purple-400" />
                        ) : ['xls', 'xlsx', 'csv'].includes(ext) ? (
                          <FileSpreadsheet size={15} className="text-emerald-400" />
                        ) : ['zip', 'rar', '7z'].includes(ext) ? (
                          <FileArchive size={15} className="text-amber-400" />
                        ) : (
                          <File size={15} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold truncate">{item.attachment.name || 'Tệp đính kèm'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 tabular-nums">
                          <span>{item.senderName}</span>
                          <span>·</span>
                          <span>{item.timeLabel}</span>
                          {item.attachment.sizeBytes ? (
                            <>
                              <span>·</span>
                              <span>{formatFileSize(item.attachment.sizeBytes)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleJumpToMessage(item.messageId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ borderColor }}
                      >
                        <CornerDownRight size={11} />
                        <span>Tin nhắn</span>
                      </button>
                      <a
                        href={resolvedHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Mở tệp đính kèm"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md border hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ borderColor }}
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

MosChatFilesPane.displayName = 'MosChatFilesPane';
