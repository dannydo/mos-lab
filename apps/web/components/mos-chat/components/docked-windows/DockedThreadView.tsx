'use client';

import React from 'react';
import { ArrowDown, Copy, Forward, MessageSquareReply, SendHorizontal } from 'lucide-react';
import type { MosChatMessage, MosChatThreadReply, SafeAny } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import { copyMessageToClipboard } from '../../utils/chat-helpers';
import { findSourceMessage } from '../../utils/quoteUtils';

interface DockedThreadViewProps {
  cid: string;
  activeThreadMsg: MosChatMessage;
  replyValue: string;
  showScrollBottom: boolean;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  accentContrast: string;
  token: SafeAny;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  isMessageFromCurrentUser: (m: MosChatMessage) => boolean;
  renderRichTextMessage: (
    text: string,
    isMine?: boolean,
    opts?: { onQuoteClick?: (senderName: string, quotedContent: string) => void }
  ) => React.ReactNode;
  renderMessageAttachments: (atts?: SafeAny[], compact?: boolean) => React.ReactNode;
  onAttachThreadFeed: (cid: string, el: HTMLDivElement | null) => void;
  onThreadFeedScroll: (cid: string, e: React.UIEvent<HTMLDivElement>) => void;
  onScrollToBottomThread: (cid: string, smooth?: boolean) => void;
  onScrollToThreadMessage: (cid: string, messageId: string) => void;
  onChangeReplyInput: (cid: string, value: string) => void;
  onQuoteReply: (cid: string, senderName: string, text: string) => void;
  onSendThreadReply?: (convId: string, rootMsgId: string, text: string, atts?: SafeAny[]) => Promise<void> | void;
  handleOpenForwardModal?: (m: MosChatMessage, reply?: MosChatThreadReply | null, sourceConvId?: string) => void;
}

export const DockedThreadView: React.FC<DockedThreadViewProps> = ({
  cid,
  activeThreadMsg,
  replyValue,
  showScrollBottom,
  surfaceBg,
  surfaceRaised,
  borderColor,
  accentColor,
  accentSoftBg,
  accentBorder,
  accentContrast,
  token,
  renderUserAvatarNode,
  isMessageFromCurrentUser,
  renderRichTextMessage,
  renderMessageAttachments,
  onAttachThreadFeed,
  onThreadFeedScroll,
  onScrollToBottomThread,
  onScrollToThreadMessage,
  onChangeReplyInput,
  onQuoteReply,
  onSendThreadReply,
  handleOpenForwardModal,
}) => {
  const handleSend = () => {
    if (!replyValue.trim()) return;
    if (onSendThreadReply) {
      onSendThreadReply(cid, activeThreadMsg.id, replyValue);
    }
    onChangeReplyInput(cid, '');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-200 relative">
      {/* Parent Message Card (Pinned Top) */}
      <div
        className="p-3 border-b shrink-0 flex flex-col gap-1.5 text-[12px]"
        style={{
          background: surfaceRaised ? `${surfaceRaised}cc` : 'rgba(255,255,255,0.03)',
          borderColor: borderColor || 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {renderUserAvatarNode({
              name: activeThreadMsg.senderName,
              avatarUrl: activeThreadMsg.senderAvatar,
              sizeClass: 'w-5 h-5',
              textClass: 'text-[9px]',
            })}
            <span className="font-bold text-amber-500 text-[11px]">{activeThreadMsg.senderName}</span>
            <span className="text-[10px] text-neutral-400 tabular-nums">· {activeThreadMsg.timeLabel}</span>
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            Tin nhắn gốc
          </span>
        </div>
        <div
          className="pl-6 border-l-2 text-[12px] leading-relaxed break-words"
          style={{
            borderLeftColor: accentBorder || 'rgba(212, 168, 75, 0.4)',
            color: token.colorText,
          }}
        >
          {renderRichTextMessage(activeThreadMsg.text, false)}
          {renderMessageAttachments(activeThreadMsg.attachments, true)}
        </div>
      </div>

      {/* Thread Replies Feed */}
      <div
        ref={(el) => onAttachThreadFeed(cid, el)}
        onScroll={(e) => onThreadFeedScroll(cid, e)}
        className="flex-1 overflow-y-auto p-3 space-y-2.5"
      >
        {(!activeThreadMsg.thread || activeThreadMsg.thread.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center text-[12px] py-8">
            <MessageSquareReply size={28} className="mb-2 opacity-60" style={{ color: token.colorTextSecondary }} />
            <p className="font-medium" style={{ color: token.colorText }}>
              Chưa có phản hồi nào trong luồng
            </p>
            <p className="text-[11px]" style={{ color: token.colorTextSecondary }}>
              Hãy là người đầu tiên trả lời câu hỏi này nhé.
            </p>
          </div>
        )}

        {(activeThreadMsg.thread || []).map((reply: MosChatThreadReply) => {
          const isMine = isMessageFromCurrentUser(reply as SafeAny);
          return (
            <div
              key={reply.id}
              data-message-id={reply.id}
              className={`flex gap-2 items-start ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {renderUserAvatarNode({
                name: reply.senderName,
                avatarUrl: reply.senderAvatar,
                sizeClass: 'w-6 h-6 mt-0.5',
                textClass: 'text-[9px]',
                bgStyle: isMine ? accentColor || '#d4a84b' : '#2563eb',
                textColor: isMine ? '#000' : '#fff',
              })}
              <div
                className={`max-w-[82%] px-3 py-2 rounded-2xl text-[12px] shadow-sm ${
                  isMine ? 'rounded-tr-xs' : 'rounded-tl-xs'
                }`}
                style={{
                  background: isMine ? accentSoftBg : surfaceRaised,
                  border: `1px solid ${isMine ? accentBorder : borderColor}`,
                  color: token.colorText,
                }}
              >
                <div
                  className={`flex items-center gap-1.5 mb-0.5 ${isMine ? 'justify-end' : 'justify-start'} text-[10px]`}
                >
                  <span className="font-bold inline-flex items-center gap-1" style={{ color: token.colorText }}>
                    <span>{reply.senderName}</span>
                    {isMine && (
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
                  </span>
                  <span style={{ color: token.colorTextSecondary }}>·</span>
                  <span className="tabular-nums font-normal" style={{ color: token.colorTextSecondary }}>
                    {reply.timeLabel}
                  </span>
                  <button
                    type="button"
                    aria-label="Trả lời trong luồng"
                    title="Trả lời phản hồi này"
                    onClick={() => onQuoteReply(cid, reply.senderName, reply.text)}
                    className="opacity-60 hover:opacity-100 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer transition-opacity text-amber-500"
                  >
                    <MessageSquareReply size={10} />
                  </button>
                  <button
                    type="button"
                    aria-label="Sao chép phản hồi"
                    title="Sao chép phản hồi này"
                    onClick={async () => {
                      await copyMessageToClipboard(reply.text, reply.attachments, {
                        customSuccessMsg: 'Đã sao chép phản hồi',
                      });
                    }}
                    className="opacity-60 hover:opacity-100 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer transition-opacity text-slate-400 hover:text-amber-400"
                  >
                    <Copy size={10} />
                  </button>
                  {!reply.isDeleted && cid !== AI_COPILOT_CONV_ID && handleOpenForwardModal && (
                    <button
                      type="button"
                      aria-label="Chuyển tiếp phản hồi này"
                      title="Chuyển tiếp phản hồi này"
                      onClick={() => handleOpenForwardModal(activeThreadMsg, reply, cid)}
                      className="opacity-60 hover:opacity-100 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer transition-opacity text-slate-400 hover:text-amber-400"
                    >
                      <Forward size={10} />
                    </button>
                  )}
                </div>
                <div className="break-words leading-relaxed" style={{ color: token.colorText }}>
                  {renderRichTextMessage(reply.text, isMine, {
                    onQuoteClick: (senderName, quotedContent) => {
                      const threadMsgs = (activeThreadMsg?.thread ?? []) as Array<{
                        id: string;
                        senderName?: string;
                        text?: string | null;
                      }>;
                      const foundId = findSourceMessage(threadMsgs, { senderName, content: quotedContent });
                      if (foundId) onScrollToThreadMessage(cid, foundId);
                    },
                  })}
                </div>
                {renderMessageAttachments(reply.attachments, true)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Scroll to Bottom Button in Thread */}
      {showScrollBottom && (
        <div className="absolute bottom-14 right-3 z-30 animate-in fade-in zoom-in-90 duration-150">
          <button
            type="button"
            onClick={() => onScrollToBottomThread(cid, true)}
            className="px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border select-none"
            style={{
              background: 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)',
              color: '#000',
              borderColor: 'rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.7), 0 0 14px rgba(212, 168, 75, 0.5)',
            }}
          >
            <span>Mới nhất</span>
            <ArrowDown size={12} className="animate-bounce" />
          </button>
        </div>
      )}

      {/* Dedicated Thread Composer */}
      <div
        className="p-2 border-t"
        style={{
          background: surfaceBg || 'rgba(20, 20, 20, 0.98)',
          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={replyValue}
            onChange={(e) => onChangeReplyInput(cid, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Trả lời trong luồng... (Enter gửi)"
            className="flex-1 h-9 rounded-full px-3.5 text-[12px] outline-none focus:outline-none focus-visible:outline-none transition-all focus:ring-1 focus:ring-amber-500/50"
            style={{
              outline: 'none',
              background: surfaceRaised || 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${borderColor || 'rgba(255, 255, 255, 0.1)'}`,
              color: token.colorText,
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!replyValue.trim()}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
            style={{ background: accentColor || '#d4a84b', color: accentContrast || '#000' }}
          >
            <SendHorizontal size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
