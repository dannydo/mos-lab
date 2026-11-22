'use client';

import React from 'react';
import dayjs from 'dayjs';
import { History, RotateCcw, Volume2, Zap } from 'lucide-react';
import type { MosChatConversation, MosChatMessage, MosChatQuotedMessage, SafeAny } from '@mos-lab/shared';
import { parsePureStickerMessage } from '../mos-chat-stickers';
import { buildMaiUrgentVoiceAnnouncement } from '../utils/chat-helpers';
import { playNeuralSpeech } from '../../voice-assistant/speech-utils';
import { MosChatForwardedHeader } from './MosChatForwardedHeader';

export interface MosChatMessageBubbleProps {
  m: MosChatMessage;
  quotedMessage: MosChatMessage | MosChatQuotedMessage | null | undefined;
  activeConversation: MosChatConversation | null;
  isMobile: boolean;
  isMine: boolean;
  isDannyAccount: boolean;
  isHeartFlying: boolean;
  isDark: boolean;
  ttsSpeed: number;
  token: SafeAny;
  surfaceRaised: string;
  borderColor: string;
  accentSoftBg: string;
  accentBorder: string;
  getMemberNickname: (staffId: string | number) => string | undefined;
  setHistoryModalMessage: (m: MosChatMessage | null) => void;
  setHistoryModalOpen: (open: boolean) => void;
  handleRestoreMessage: (msgId: string) => void;
  handleMessageTap: (m: MosChatMessage, e: React.MouseEvent) => void;
  handleReplyToMessage?: (m: MosChatMessage) => void;
  renderRichTextMessage: (text?: string, isMine?: boolean) => React.ReactNode;
  renderMessageAttachments?: (attachments?: SafeAny[], compact?: boolean, isMine?: boolean) => React.ReactNode;
  accessibleConversationIds?: Set<string>;
  onJumpToForwardedSource?: (sourceConversationId: string, sourceMessageId: string) => void;
}

export const MosChatMessageBubble: React.FC<MosChatMessageBubbleProps> = ({
  m,
  quotedMessage,
  activeConversation,
  isMobile,
  isMine,
  isDannyAccount,
  isHeartFlying,
  isDark,
  ttsSpeed,
  token,
  surfaceRaised,
  borderColor,
  accentSoftBg,
  accentBorder,
  getMemberNickname,
  setHistoryModalMessage,
  setHistoryModalOpen,
  handleRestoreMessage,
  handleMessageTap,
  handleReplyToMessage,
  renderRichTextMessage,
  renderMessageAttachments,
  accessibleConversationIds,
  onJumpToForwardedSource,
}) => {
  if (m.isDeleted) {
    return (
      <div
        className={`relative inline-block text-left px-3.5 py-2 rounded-2xl ${
          isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
        } text-[12.5px] italic max-w-[85%] select-none transition-all`}
        style={{
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
          border: `1px dashed ${borderColor}`,
          color: token.colorTextSecondary,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="opacity-75">💬 Tin nhắn này đã bị xoá</span>
          <button
            type="button"
            onClick={() => {
              setHistoryModalMessage(m);
              setHistoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold not-italic hover:underline cursor-pointer"
            style={{ color: '#d4a84b' }}
          >
            <History size={12} />
            <span>Xem lịch sử</span>
          </button>
          {(isMine || isDannyAccount) && (
            <button
              type="button"
              onClick={() => handleRestoreMessage(m.id)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold not-italic hover:underline cursor-pointer text-emerald-400 hover:text-emerald-300"
            >
              <RotateCcw size={11} />
              <span>Khôi phục</span>
            </button>
          )}
        </div>
        {m.deletedByName && (
          <div className="text-[10px] text-slate-400 not-italic mt-0.5 tabular-nums">
            Bởi {m.deletedByName} · {m.deletedAt ? dayjs(m.deletedAt).format('HH:mm') : m.timeLabel}
          </div>
        )}
      </div>
    );
  }

  const isPureSticker = Boolean(m.text && parsePureStickerMessage(m.text));
  const hasSubthread = Boolean(m.thread && m.thread.length > 0);

  return (
    <>
      {m.forwardedFrom && (
        <MosChatForwardedHeader
          forwardedFrom={m.forwardedFrom}
          isDark={isDark}
          canJumpToSource={Boolean(
            onJumpToForwardedSource && accessibleConversationIds?.has(m.forwardedFrom.sourceConversationId)
          )}
          onJumpToSource={onJumpToForwardedSource}
          renderNoteText={(noteText) => renderRichTextMessage(noteText, isMine)}
        />
      )}
      {m.text ? (
        <div
          onClick={(e) => handleMessageTap(m, e)}
          onDoubleClick={(e) => {
            if (!m.isDeleted) {
              e.stopPropagation();
              handleReplyToMessage?.(m);
            }
          }}
          title={hasSubthread ? `Nhấn để mở luồng trả lời phụ (${m.thread?.length} phản hồi)` : undefined}
          className={`relative inline-block text-left ${
            isPureSticker
              ? 'px-1 py-0.5 rounded-2xl'
              : `px-3.5 py-2 rounded-2xl ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`
          } text-[13px] leading-relaxed break-words max-w-[85%] cursor-pointer select-text active:scale-[0.985] transition-all ${
            m.isBuzzed ? 'ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/15' : ''
          } ${hasSubthread ? 'hover:ring-1 hover:ring-amber-500/50' : ''}`}
          style={{
            background: isPureSticker
              ? 'transparent'
              : m.isBuzzed
                ? isDark
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(225, 29, 72, 0.14) 100%)'
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(225, 29, 72, 0.1) 100%)'
                : isMine
                  ? accentSoftBg
                  : surfaceRaised,
            border: isPureSticker
              ? 'none'
              : m.isBuzzed
                ? '1px solid rgba(245, 158, 11, 0.8)'
                : `1px solid ${isMine ? accentBorder : borderColor}`,
            color: token.colorText,
          }}
        >
          {m.isBuzzed && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mb-1.5 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/50 flex items-center justify-between gap-1 text-[11px] font-bold text-amber-500 select-none animate-pulse"
            >
              <div className="flex items-center gap-1.5">
                <Zap size={12} className="fill-amber-500" />
                <span>
                  TIN NHẮN KHẨN CẤP · BUZZ {m.buzzCount && m.buzzCount > 1 ? `(x${m.buzzCount})` : ''}
                  {m.latestBuzz?.senderName ? ` · bởi ${m.latestBuzz.senderName}` : ''}
                </span>
                {m.buzzCount && m.buzzCount > 1 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9.5px] font-extrabold">
                    x{m.buzzCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label="Nghe @MAI đọc tin nhắn khẩn cấp"
                onClick={() => {
                  const spokenText = buildMaiUrgentVoiceAnnouncement({
                    senderName: m.latestBuzz?.senderName || m.senderName || 'Đồng nghiệp',
                    conversationName: activeConversation?.name,
                    isSpace: activeConversation?.type === 'space',
                    messageText: m.text || '',
                    note: m.latestBuzz?.note,
                  });
                  void playNeuralSpeech(spokenText, {
                    voice: 'vi-VN-HoaiMyNeural',
                    speed: ttsSpeed || 1.0,
                  });
                }}
                className="text-[10px] font-semibold text-amber-400/90 hover:underline hover:text-amber-300 cursor-pointer inline-flex items-center gap-1 shrink-0 ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20"
                title="Nghe @MAI đọc tin nhắn khẩn cấp"
              >
                <Volume2 size={10} />
                <span>@MAI đọc</span>
              </button>
            </div>
          )}

          {quotedMessage && (
            <div
              role="button"
              tabIndex={0}
              aria-label={`Đi tới tin nhắn gốc của ${
                ((quotedMessage as SafeAny).senderId && getMemberNickname((quotedMessage as SafeAny).senderId)) ||
                quotedMessage.senderName
              }`}
              onClick={(e) => {
                e.stopPropagation();
                const targetEl = document.getElementById(`mos-chat-msg-${quotedMessage.id}`);
                if (targetEl) {
                  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  targetEl.classList.remove('mos-chat-quote-flash');
                  requestAnimationFrame(() => {
                    targetEl.classList.add('mos-chat-quote-flash');
                    setTimeout(() => targetEl.classList.remove('mos-chat-quote-flash'), 900);
                  });
                }
              }}
              className={`text-xs px-2.5 py-1.5 rounded-lg mb-1.5 border-l-2 flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-90 select-none ${
                isMine
                  ? 'bg-amber-500/20 border-amber-400 text-slate-200'
                  : 'bg-black/10 dark:bg-white/5 border-amber-500 text-slate-300'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[11px] truncate text-amber-400">
                  {((quotedMessage as SafeAny).senderId && getMemberNickname((quotedMessage as SafeAny).senderId)) ||
                    quotedMessage.senderName}
                </p>
                <p className="line-clamp-1 text-[11px] opacity-80">{quotedMessage.text}</p>
              </div>
            </div>
          )}

          {renderRichTextMessage(m.text, isMine)}

          {m.editHistory && m.editHistory.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHistoryModalMessage(m);
                setHistoryModalOpen(true);
              }}
              className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-amber-500/80 hover:text-amber-400 hover:underline cursor-pointer select-none ml-1.5 align-baseline"
              title="Xem lịch sử chỉnh sửa"
            >
              <History size={10} />
              <span>(đã chỉnh sửa)</span>
            </button>
          )}

          {isHeartFlying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 select-none overflow-hidden">
              <span className="text-[38px] drop-shadow-xl animate-heart-burst leading-none">❤️</span>
            </div>
          )}
        </div>
      ) : null}

      {renderMessageAttachments && renderMessageAttachments(m.attachments, isMobile, isMine)}
    </>
  );
};
