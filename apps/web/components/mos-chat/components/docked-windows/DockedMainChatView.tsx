'use client';

import React from 'react';
import {
  AlarmClockPlus,
  ArrowDown,
  Copy,
  Forward,
  ImagePlus,
  MessageSquareReply,
  Plus,
  SendHorizontal,
  SmilePlus,
} from 'lucide-react';
import { Dropdown, Popover, Tooltip } from 'antd';
import type { MosChatConversation, MosChatMessage, MosChatThreadReply, SafeAny } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import { copyMessageToClipboard } from '../../utils/chat-helpers';
import { findSourceMessage } from '../../utils/quoteUtils';
import { syncTextareaHeightSmart } from '../MosChatComposer';
import { MosChatForwardedHeader } from '../MosChatForwardedHeader';

interface DockedMainChatViewProps {
  cid: string;
  conv: MosChatConversation;
  conversations: MosChatConversation[];
  messagesToDisplay: MosChatMessage[];
  dockInputValue: string;
  dockStaged: SafeAny[];
  showScrollBottom: boolean;
  openStickerPopoverKey: string | null;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  accentContrast: string;
  isDark: boolean;
  token: SafeAny;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  isMessageFromCurrentUser: (m: MosChatMessage) => boolean;
  getMessageReadBreakdown: (conv: MosChatConversation, m: MosChatMessage) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  renderReadStatusCheckmark: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  openTaskModalFromMessage: (m: MosChatMessage | null) => void;
  renderRichTextMessage: (
    text: string,
    isMine?: boolean,
    opts?: { onQuoteClick?: (senderName: string, quotedContent: string) => void }
  ) => React.ReactNode;
  renderMessageAttachments: (atts?: SafeAny[], compact?: boolean) => React.ReactNode;
  renderStagedAttachmentsStrip: (attachments: SafeAny[], scope: SafeAny, convId?: string) => React.ReactNode;
  handleClipboardPaste: (e: React.ClipboardEvent<SafeAny>, scope?: SafeAny, convId?: string) => void;
  setOpenStickerPopoverKey: (key: string | null) => void;
  renderComposerEmojiPickerContent: (opts?: SafeAny) => React.ReactNode;
  triggerFilePicker: (scope: 'main' | 'thread' | 'dock', convId?: string) => void;
  handleOpenForwardModal?: (m: MosChatMessage, reply?: MosChatThreadReply | null, sourceConvId?: string) => void;
  onJumpToForwardedSource?: (sourceConversationId: string, sourceMessageId: string) => void;
  onAttachMessagesContainer: (cid: string, el: HTMLDivElement | null) => void;
  onAttachDockInput: (cid: string, el: HTMLTextAreaElement | null) => void;
  onFeedScroll: (cid: string, e: React.UIEvent<HTMLDivElement>) => void;
  onScrollToBottom: (cid: string, smooth?: boolean) => void;
  onScrollToDockMessage: (cid: string, messageId: string) => void;
  onOpenThread: (cid: string, msgId: string) => void;
  onChangeDockInput: (cid: string, value: string) => void;
  onMarkCompositionStart: () => void;
  onMarkCompositionEnd: () => void;
  isInputComposing: (nativeIsComposing: boolean, keyCode: number) => boolean;
  onSubmitDockMessage: (cid: string) => void;
}

export const DockedMainChatView: React.FC<DockedMainChatViewProps> = ({
  cid,
  conv,
  conversations,
  messagesToDisplay,
  dockInputValue,
  dockStaged,
  showScrollBottom,
  openStickerPopoverKey,
  surfaceBg,
  surfaceRaised,
  borderColor,
  accentColor,
  accentSoftBg,
  accentBorder,
  accentContrast,
  isDark,
  token,
  renderUserAvatarNode,
  isMessageFromCurrentUser,
  getMessageReadBreakdown,
  renderReadStatusCheckmark,
  openTaskModalFromMessage,
  renderRichTextMessage,
  renderMessageAttachments,
  renderStagedAttachmentsStrip,
  handleClipboardPaste,
  setOpenStickerPopoverKey,
  renderComposerEmojiPickerContent,
  triggerFilePicker,
  handleOpenForwardModal,
  onJumpToForwardedSource,
  onAttachMessagesContainer,
  onAttachDockInput,
  onFeedScroll,
  onScrollToBottom,
  onScrollToDockMessage,
  onOpenThread,
  onChangeDockInput,
  onMarkCompositionStart,
  onMarkCompositionEnd,
  isInputComposing,
  onSubmitDockMessage,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-150 relative">
      <div
        ref={(el) => onAttachMessagesContainer(cid, el)}
        onScroll={(e) => onFeedScroll(cid, e)}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {messagesToDisplay.map((m) => {
          const isDockMine = isMessageFromCurrentUser(m);
          const dockBreakdown = isDockMine ? getMessageReadBreakdown(conv, m) : { seenBy: [], unseenBy: [] };
          const threadCount = m.thread?.length || m.unreadThreadReplyCount || 0;
          const dockQuotedMessage =
            m.replyTo || (m.replyToId ? conv?.messages.find((x) => x.id === m.replyToId) : null);

          return (
            <div
              key={m.id}
              data-message-id={m.id}
              className={`group/msg flex gap-2 items-start ${isDockMine ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {renderUserAvatarNode({
                name: m.senderName,
                avatarUrl: m.senderAvatar,
                sizeClass: 'w-6 h-6 mt-0.5 shrink-0',
                textClass: 'text-[9.5px]',
                bgStyle: isDockMine ? accentColor || '#d4a84b' : '#2563eb',
                textColor: isDockMine ? '#000' : '#fff',
              })}

              <div
                className={`max-w-[84%] p-2.5 rounded-2xl text-[12px] shadow-sm relative group/bubble ${
                  isDockMine ? 'rounded-tr-xs' : 'rounded-tl-xs'
                }`}
                style={{
                  background: isDockMine ? accentSoftBg : surfaceRaised,
                  border: `1px solid ${isDockMine ? accentBorder : borderColor}`,
                  color: token.colorText,
                }}
              >
                {/* Message Header: Sender name, time, read status */}
                <div
                  className={`flex items-center justify-between gap-2 mb-1 ${
                    isDockMine ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <span
                    className="text-[10.5px] font-bold inline-flex items-center gap-1"
                    style={{ color: token.colorText }}
                  >
                    <span>{m.senderName}</span>
                    {isDockMine && (
                      <span
                        className="inline-flex items-center justify-center leading-none px-1 py-0.2 rounded-full text-[8.5px] font-extrabold"
                        style={{
                          background: 'rgba(212, 168, 75, 0.2)',
                          color: accentColor || '#d4a84b',
                        }}
                      >
                        Bạn
                      </span>
                    )}
                    <span style={{ color: token.colorTextSecondary }}>·</span>
                    <span className="tabular-nums font-normal" style={{ color: token.colorTextSecondary }}>
                      {m.timeLabel}
                    </span>
                    {isDockMine &&
                      !m.isDeleted &&
                      renderReadStatusCheckmark(dockBreakdown.seenBy, dockBreakdown.unseenBy, {
                        compact: true,
                        scopeLabel: 'Trạng thái đọc',
                      })}
                  </span>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                    <Tooltip title="Vào luồng trả lời (Thread)">
                      <button
                        type="button"
                        onClick={() => onOpenThread(cid, m.id)}
                        className="w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-amber-400"
                      >
                        <MessageSquareReply size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip title="Tạo Task từ tin nhắn này">
                      <button
                        type="button"
                        onClick={() => openTaskModalFromMessage(m)}
                        className="w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-amber-400"
                      >
                        <AlarmClockPlus size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip title="Sao chép tin nhắn">
                      <button
                        type="button"
                        aria-label="Sao chép tin nhắn"
                        onClick={async () => {
                          await copyMessageToClipboard(m.text, m.attachments);
                        }}
                        className="w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-amber-400"
                      >
                        <Copy size={12} />
                      </button>
                    </Tooltip>
                    {!m.isDeleted && cid !== AI_COPILOT_CONV_ID && handleOpenForwardModal && (
                      <Tooltip title="Chuyển tiếp tin nhắn">
                        <button
                          type="button"
                          aria-label="Chuyển tiếp tin nhắn"
                          onClick={() => handleOpenForwardModal(m, null, cid)}
                          className="w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-amber-400"
                        >
                          <Forward size={12} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {m.forwardedFrom && (
                  <MosChatForwardedHeader
                    compact
                    forwardedFrom={m.forwardedFrom}
                    isDark={isDark}
                    canJumpToSource={Boolean(
                      onJumpToForwardedSource &&
                      conversations.some((c) => c.id === m.forwardedFrom?.sourceConversationId)
                    )}
                    onJumpToSource={onJumpToForwardedSource}
                    renderNoteText={(t) => renderRichTextMessage(t, isDockMine)}
                  />
                )}

                {dockQuotedMessage && (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Đi tới tin nhắn gốc của ${dockQuotedMessage.senderName}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dockQuotedMessage.id) {
                        onScrollToDockMessage(cid, dockQuotedMessage.id);
                      }
                    }}
                    className="text-[11px] px-2 py-1 rounded mb-1.5 border-l-2 flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-90 select-none"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      borderLeftColor: accentColor || '#d4a84b',
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[10.5px] truncate text-amber-500">{dockQuotedMessage.senderName}</p>
                      <p className="line-clamp-1 text-[10.5px] opacity-80" style={{ color: token.colorText }}>
                        {dockQuotedMessage.text}
                      </p>
                    </div>
                  </div>
                )}

                {m.text && (
                  <div className="break-words leading-relaxed text-[12.5px]" style={{ color: token.colorText }}>
                    {renderRichTextMessage(m.text, isDockMine, {
                      onQuoteClick: (senderName, quotedContent) => {
                        const allMsgs = (conv?.messages ?? []) as Array<{
                          id: string;
                          senderName?: string;
                          text?: string | null;
                        }>;
                        const foundId = findSourceMessage(allMsgs, { senderName, content: quotedContent });
                        if (foundId) onScrollToDockMessage(cid, foundId);
                      },
                    })}
                  </div>
                )}

                {renderMessageAttachments(m.attachments, true)}

                {threadCount > 0 && (
                  <div
                    className="mt-2 pt-1.5 border-t"
                    style={{ borderColor: borderColor || 'rgba(255, 255, 255, 0.08)' }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenThread(cid, m.id)}
                      className="w-full py-1 px-2 rounded-lg text-[11px] font-bold inline-flex items-center justify-between cursor-pointer transition-all bg-amber-400/15 text-amber-400 hover:bg-amber-400/25 border border-amber-400/20"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquareReply size={12} />
                        <span>{threadCount} phản hồi</span>
                      </span>
                      <span>›</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Scroll to Bottom Button in Main Chat */}
      {showScrollBottom && (
        <div className="absolute bottom-16 right-4 z-30 animate-in fade-in zoom-in-90 duration-150">
          <button
            type="button"
            onClick={() => onScrollToBottom(cid, true)}
            className="px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border select-none"
            style={{
              background: 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)',
              color: '#000',
              borderColor: 'rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.7), 0 0 14px rgba(212, 168, 75, 0.5)',
            }}
          >
            <span>Tin nhắn mới</span>
            <ArrowDown size={13} className="animate-bounce" />
          </button>
        </div>
      )}

      {/* ================= iOS PILL COMPOSER ================= */}
      <div
        className="p-2.5 border-t select-none"
        style={{
          background: surfaceBg || 'rgba(20, 20, 20, 0.98)',
          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
        }}
      >
        {renderStagedAttachmentsStrip(dockStaged, 'dock', cid)}

        <div className="flex items-center gap-1.5">
          <Dropdown
            menu={{
              items: [
                {
                  key: 'create-task',
                  icon: <AlarmClockPlus size={14} className="text-amber-400" />,
                  label: 'Tạo việc cần làm (Task)',
                  onClick: () => openTaskModalFromMessage(null),
                },
                {
                  key: 'upload-image',
                  icon: <ImagePlus size={14} className="text-sky-400" />,
                  label: 'Tải hình ảnh lên',
                  onClick: () => triggerFilePicker('dock', cid),
                },
                {
                  key: 'emoji-sticker',
                  icon: <SmilePlus size={14} className="text-emerald-400" />,
                  label: 'Nhãn dán & Emoji',
                  onClick: () => setOpenStickerPopoverKey(`composer:dock:${cid}`),
                },
              ],
            }}
            trigger={['click']}
            placement="topLeft"
          >
            <button
              type="button"
              title="Tùy chọn thêm"
              className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer transition-colors bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-amber-400 shrink-0"
            >
              <Plus size={16} />
            </button>
          </Dropdown>

          <textarea
            ref={(el) => onAttachDockInput(cid, el)}
            rows={1}
            value={dockInputValue}
            onChange={(e) => {
              onChangeDockInput(cid, e.target.value);
              syncTextareaHeightSmart(e.target, 96);
            }}
            onPaste={(e) => handleClipboardPaste(e, 'dock', cid)}
            onCompositionStart={onMarkCompositionStart}
            onCompositionEnd={onMarkCompositionEnd}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (isInputComposing(e.nativeEvent.isComposing, e.keyCode)) {
                  return;
                }
                e.preventDefault();
                onSubmitDockMessage(cid);
              }
            }}
            placeholder="Nhắn tin..."
            className="flex-1 min-h-[32px] max-h-[96px] rounded-2xl px-3.5 py-1.5 text-[12.5px] outline-none focus:outline-none focus-visible:outline-none resize-none leading-relaxed transition-all focus:ring-1 focus:ring-amber-500/40"
            style={{
              outline: 'none',
              background: surfaceRaised || 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${borderColor || 'rgba(255, 255, 255, 0.1)'}`,
              color: token.colorText,
            }}
          />

          <Popover
            trigger="click"
            placement="topRight"
            open={openStickerPopoverKey === `composer:dock:${cid}`}
            onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `composer:dock:${cid}` : null)}
            content={
              openStickerPopoverKey === `composer:dock:${cid}`
                ? renderComposerEmojiPickerContent({ dockConvId: cid })
                : null
            }
          >
            <button
              type="button"
              aria-label="Gửi Sticker động hoặc Emoji"
              onClick={(e) => {
                e.stopPropagation();
                const key = `composer:dock:${cid}`;
                setOpenStickerPopoverKey(openStickerPopoverKey === key ? null : key);
              }}
              className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-neutral-400 hover:text-neutral-200 shrink-0"
            >
              <SmilePlus size={15} />
            </button>
          </Popover>

          <button
            type="button"
            onClick={() => onSubmitDockMessage(cid)}
            disabled={!dockInputValue.trim() && dockStaged.length === 0}
            className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
            style={{ background: accentColor || '#d4a84b', color: accentContrast || '#000' }}
          >
            <SendHorizontal size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
