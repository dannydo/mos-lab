'use client';

import React, { useRef, useState } from 'react';
import {
  Pin,
  MessageSquareReply,
  CheckCheck,
  Heart,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Volume2,
  VolumeX,
  Copy,
} from 'lucide-react';
import { message as antdMessage } from 'antd';
import dayjs from 'dayjs';
import type { MosChatMessage } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { parsePureStickerMessage, MosChatStickerVisual } from '../mos-chat-stickers';
import { MosChatRichText } from '../MosChatRichText';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { isImageAttachment, formatFileSize, getFileExtension, isUserMessageOwner } from '../utils/chat-helpers';
import { speakText, stopSpeaking } from '../../voice-assistant/speech-utils';
import { MosChatAvatar } from '../MosChatAvatar';
import { MosChatCustomerCardAttachment } from '../components/MosChatCustomerCardAttachment';

export interface MosChatMobileMessageItemProps {
  message: MosChatMessage;
  prevMessage?: MosChatMessage;
  onOpenThread?: (msg: MosChatMessage) => void;
  onOpenGallery?: (message: MosChatMessage, attachmentIndex: number) => void;
  onOpenCustomer?: (customerId: number) => void;
}

export const MosChatMobileMessageItem: React.FC<MosChatMobileMessageItemProps> = React.memo(
  ({ message, prevMessage, onOpenThread, onOpenGallery, onOpenCustomer }) => {
    const {
      currentUser,
      reactToMessage,
      setSelectedMsgForAction,
      setReplyingToMessage,
      messages,
      staffDirectory,
      openCustomerDetail,
    } = useMosChat();

    const isMe = isUserMessageOwner(message, currentUser);

    // Grouping consecutive messages from same sender within 2 minutes
    const isConsecutive =
      prevMessage &&
      prevMessage.senderId === message.senderId &&
      Math.abs(dayjs(message.createdAt).diff(dayjs(prevMessage.createdAt), 'minute')) < 2;

    // Touch Gesture: Swipe to reply
    const touchStartXRef = useRef<number>(0);
    const touchStartYRef = useRef<number>(0);
    const swipeOffsetRef = useRef<number>(0);
    const isSwipingRef = useRef<boolean>(false);
    const isScrollingRef = useRef<boolean>(false);
    const [swipeOffset, setSwipeOffset] = useState<number>(0);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastTapRef = useRef<number>(0);
    const [showHeartFly, setShowHeartFly] = useState<boolean>(false);
    const [thinkingOpen, setThinkingOpen] = useState<boolean>(false);
    const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const isAiBot = Boolean(message.isAiBot || message.senderId === 'wings-ai-copilot');

    const handleTouchStart = (e: React.TouchEvent) => {
      if (message.isDeleted) return;
      if (!e.touches || e.touches.length === 0) return;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      swipeOffsetRef.current = 0;
      isSwipingRef.current = false;
      isScrollingRef.current = false;

      // Start long-press timer for context menu (450ms)
      longPressTimerRef.current = setTimeout(() => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(25);
        }
        setSelectedMsgForAction(message);
      }, 450);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (message.isDeleted) return;
      if (!e.touches || e.touches.length === 0) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartXRef.current;
      const deltaY = currentY - touchStartYRef.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (isScrollingRef.current) return;

      if (!isSwipingRef.current) {
        if (absY > 7 && absY > absX) {
          isScrollingRef.current = true;
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          return;
        }
        if (absX > 7 && absX > absY) {
          isSwipingRef.current = true;
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }

      if (isSwipingRef.current) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        const direction = deltaX > 0 ? 1 : -1;
        const clampedDist = Math.min(absX, 90);
        const damped = direction * (clampedDist * 0.85);

        swipeOffsetRef.current = damped;
        setSwipeOffset(damped);
      }
    };

    const handleTouchEnd = () => {
      if (message.isDeleted) return;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const currentOffset = swipeOffsetRef.current;
      if (Math.abs(currentOffset) >= 35) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(15);
        }
        setReplyingToMessage(message);
      }

      swipeOffsetRef.current = 0;
      setSwipeOffset(0);
      isSwipingRef.current = false;
      isScrollingRef.current = false;

      // Double-tap to heart (only when not performing a swipe)
      if (Math.abs(currentOffset) < 10) {
        const now = Date.now();
        if (now - lastTapRef.current < 280) {
          reactToMessage(message.id, '❤️');
          setShowHeartFly(true);
          setTimeout(() => setShowHeartFly(false), 900);
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
    };

    // Find quoted message if replying
    const quotedMessage = (message as any).replyToId ? messages.find((m) => m.id === (message as any).replyToId) : null;

    // Check pure sticker message
    const stickerItem = parsePureStickerMessage(message.text);

    // Time format
    const timeFormatted = message.timeLabel || dayjs(message.createdAt).format('HH:mm');
    const threadCount = message.thread?.length || 0;

    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        id={`mos-chat-msg-${message.id}`}
        onContextMenu={(e) => {
          e.preventDefault();
          if (message.isDeleted) return;
          setSelectedMsgForAction(message);
        }}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          touchAction: 'pan-y',
        }}
        className={`relative flex flex-col my-1 select-none transition-all duration-300 rounded-2xl ${isMe ? 'items-end' : 'items-start'}`}
      >
        {/* Swipe Right Indicator */}
        {swipeOffset > 10 && (
          <div
            style={{
              opacity: Math.min(1, swipeOffset / 35),
              transform: `scale(${Math.min(1, 0.5 + swipeOffset / 70)}) translateY(-50%)`,
            }}
            className="absolute left-2 top-1/2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shadow-md z-30 pointer-events-none"
          >
            <MessageSquareReply className="w-4 h-4" />
          </div>
        )}

        {/* Swipe Left Indicator */}
        {swipeOffset < -10 && (
          <div
            style={{
              opacity: Math.min(1, Math.abs(swipeOffset) / 35),
              transform: `scale(${Math.min(1, 0.5 + Math.abs(swipeOffset) / 70)}) translateY(-50%)`,
            }}
            className="absolute right-2 top-1/2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shadow-md z-30 pointer-events-none"
          >
            <MessageSquareReply className="w-4 h-4" />
          </div>
        )}

        {/* Floating Heart Fly Animation */}
        {showHeartFly && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-bounce">
            <Heart className="w-12 h-12 text-rose-500 fill-rose-500 drop-shadow-lg" />
          </div>
        )}

        {/* Sender info & avatar for both own and other messages */}
        {!isConsecutive && (
          <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            {isAiBot ? (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            ) : message.senderId === 'mos-mission-bot' ? (
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500/30 to-indigo-500/30 border border-amber-500/50 flex items-center justify-center text-[11px] shadow-sm shrink-0">
                🚀
              </div>
            ) : (
              <MosChatAvatar
                size="sm"
                src={message.senderAvatar}
                name={message.senderName}
                staffId={message.senderId}
                staffDirectory={staffDirectory}
              />
            )}
            <span
              className={`text-xs font-semibold ${
                isAiBot ? 'text-purple-300' : isMe ? 'text-amber-300' : 'text-slate-300'
              }`}
            >
              {message.senderName}
            </span>
            {isAiBot ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold uppercase border border-purple-500/40">
                mOS AI
              </span>
            ) : message.senderRole ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium uppercase border border-slate-700/50">
                {message.senderRole}
              </span>
            ) : null}
          </div>
        )}

        {/* Message Bubble Box */}
        {message.isDeleted ? (
          <div
            className={`relative max-w-[85%] rounded-2xl px-3.5 py-2 text-xs italic break-words shadow-sm transition-colors flex items-center gap-2 select-none ${
              isMe
                ? 'bg-amber-500/10 text-amber-300/80 border border-dashed border-amber-500/30 rounded-tr-sm'
                : 'bg-slate-800/60 text-slate-400 border border-dashed border-slate-700/60 rounded-tl-sm'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <span>Tin nhắn này đã bị xoá</span>
            {message.deletedByName && <span className="opacity-75">({message.deletedByName})</span>}
          </div>
        ) : (
          <div
            className={`relative max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm transition-colors ${
              isMe
                ? 'bg-amber-500/20 text-slate-100 border border-amber-500/40 font-normal rounded-tr-sm shadow-amber-500/10'
                : isAiBot
                  ? 'bg-slate-900 text-slate-100 border border-purple-500/40 rounded-tl-sm shadow-md shadow-purple-950/20'
                  : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-tl-sm'
            }`}
          >
            {/* Pinned Badge */}
            {message.pinned && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 mb-1 pb-1 border-b border-white/20">
                <Pin className="w-3 h-3 fill-amber-300" />
                Đã ghim trong kênh
              </div>
            )}

            {/* Quoted Message Preview */}
            {quotedMessage && (
              <div
                className={`text-xs px-2.5 py-1.5 rounded-lg mb-2 border-l-2 flex items-center gap-2 ${
                  isMe
                    ? 'bg-amber-500/20 border-amber-400 text-slate-200'
                    : 'bg-slate-900/60 border-amber-500 text-slate-300'
                }`}
              >
                <MosChatAvatar
                  size="xs"
                  src={quotedMessage.senderAvatar}
                  name={quotedMessage.senderName}
                  staffId={quotedMessage.senderId}
                  staffDirectory={staffDirectory}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[11px] truncate">{quotedMessage.senderName}</p>
                  <p className="line-clamp-1 text-[11px] opacity-80">{quotedMessage.text}</p>
                </div>
              </div>
            )}

            {/* Collapsible AI Reasoning (<thinking>) Block */}
            {message.aiThinking && (
              <div className="mb-2 rounded-xl overflow-hidden w-full bg-purple-950/40 border border-purple-500/30">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setThinkingOpen((prev) => !prev);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center justify-between text-xs font-bold text-purple-300 active:bg-purple-900/40 transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Quá trình suy luận của MAI</span>
                  </span>
                  {thinkingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {thinkingOpen && (
                  <div className="px-2.5 pb-2 pt-1 text-xs leading-relaxed whitespace-pre-wrap text-slate-300 border-t border-dashed border-purple-500/20 text-left">
                    {message.aiThinking}
                  </div>
                )}
              </div>
            )}

            {/* Rich Text / Markdown / Mermaid / Sticker Render */}
            <MosChatRichText content={message.text} isMe={isMe} isDark={true} />

            {/* Customer Card Attachment */}
            {message.customerCard && (
              <MosChatCustomerCardAttachment
                card={message.customerCard}
                isMe={isMe}
                onOpenCustomer={onOpenCustomer || openCustomerDetail}
              />
            )}

            {/* Attachments */}
            {message.attachments &&
              message.attachments.length > 0 &&
              (() => {
                const imageAttachments = message.attachments.filter(isImageAttachment);
                const fileAttachments = message.attachments.filter((att) => !isImageAttachment(att));

                return (
                  <div className="mt-2 space-y-2">
                    {/* File / PDF attachments */}
                    {fileAttachments.length > 0 && (
                      <div className="space-y-1.5">
                        {fileAttachments.map((att) => {
                          const fullUrl = resolveMediaUrl(att.url);
                          const ext = getFileExtension(att.name || att.url).toLowerCase();
                          const isPdf = ext === 'pdf' || att.mimeType === 'application/pdf';
                          const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
                          const isWord = ['doc', 'docx'].includes(ext);
                          const isZip = ['zip', 'rar', '7z'].includes(ext);

                          return (
                            <div
                              key={att.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(fullUrl, '_blank');
                              }}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer active:scale-[0.98] transition-transform ${
                                isMe
                                  ? 'bg-amber-600/20 border-amber-900/40 text-slate-900'
                                  : 'bg-slate-900/70 border-slate-700/60 text-slate-100'
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${
                                  isPdf
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : isExcel
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : isWord
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : isZip
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                }`}
                              >
                                {isPdf ? (
                                  <FileText size={18} className="text-rose-400" />
                                ) : isExcel ? (
                                  <FileSpreadsheet size={18} className="text-emerald-400" />
                                ) : isWord ? (
                                  <FileText size={18} className="text-blue-400" />
                                ) : isZip ? (
                                  <FileArchive size={18} className="text-amber-400" />
                                ) : (
                                  <File size={18} className="text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate leading-tight">{att.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] opacity-75">
                                  <span className="uppercase font-bold tracking-wider">{ext}</span>
                                  {att.sizeBytes > 0 && (
                                    <span className="tabular-nums">· {formatFileSize(att.sizeBytes)}</span>
                                  )}
                                </div>
                              </div>
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={att.name}
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-amber-400 active:scale-95 transition-transform shrink-0"
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
                                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-base">
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
              })()}

            {/* AI Action Buttons */}
            {(() => {
              const actions = message.aiActions || (message.aiAction ? [message.aiAction] : []);
              if (!actions || actions.length === 0) return null;
              return (
                <div className="mt-2.5 pt-2 border-t border-purple-500/20 flex flex-wrap gap-1.5">
                  {actions.map((act, aIdx) => {
                    const actionKey = `${message.id}_${aIdx}`;
                    const isApplied = Boolean(appliedActions[actionKey]);
                    return (
                      <button
                        key={actionKey}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof window !== 'undefined' && act.payload) {
                            window.dispatchEvent(
                              new CustomEvent('mos-ai-copilot-apply-customer-filter', { detail: act.payload })
                            );
                          }
                          setAppliedActions((prev) => ({ ...prev, [actionKey]: true }));
                          antdMessage.success(`Đã kích hoạt: ${act.label}`);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm ${
                          isApplied
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                            : 'bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
                        }`}
                      >
                        {isApplied ? <Check className="w-3.5 h-3.5" /> : <Sliders className="w-3.5 h-3.5" />}
                        <span>{isApplied ? `Đã áp dụng: ${act.label}` : act.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Quick Voice TTS & Copy Bar for AI Bot Replies */}
            {isAiBot && message.text && (
              <div className="mt-2 pt-1.5 border-t border-purple-500/20 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSpeaking) {
                      stopSpeaking();
                      setIsSpeaking(false);
                    } else {
                      setIsSpeaking(true);
                      speakText(message.text, {
                        onEnd: () => setIsSpeaking(false),
                        onError: () => setIsSpeaking(false),
                      });
                    }
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                    isSpeaking ? 'bg-purple-500/30 text-purple-200' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isSpeaking ? 'Dừng đọc' : 'Đọc'}</span>
                </button>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      await navigator.clipboard.writeText(message.text);
                      antdMessage.success('Đã sao chép câu trả lời của MAI');
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
              </div>
            )}

            {/* Time & Read status */}
            <div
              className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums ${
                isMe ? 'text-amber-300/80' : 'text-slate-400'
              }`}
            >
              {message.editedAt && <span className="italic mr-0.5">đã sửa</span>}
              <span>{timeFormatted}</span>
              {isMe && <CheckCheck className="w-3.5 h-3.5 text-amber-400" />}
            </div>
          </div>
        )}

        {/* Reactions Bar Below Bubble */}
        {!message.isDeleted && message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={`flex flex-wrap items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(message.reactions).map(([emoji, count]) => {
              if (count <= 0) return null;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => reactToMessage(message.id, emoji)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800/90 border border-slate-700 text-slate-200 shadow-sm active:scale-90 transition-transform"
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-semibold tabular-nums text-slate-400">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread reply counter badge (Google Chat style) */}
        {threadCount > 0 &&
          (() => {
            const unreadThreadCount = message.unreadThreadReplyCount || 0;
            return (
              <button
                type="button"
                onClick={() => onOpenThread?.(message)}
                className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  unreadThreadCount > 0
                    ? 'bg-indigo-900/90 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/50'
                    : 'bg-indigo-950/80 border-indigo-700/60 text-indigo-300'
                } border active:scale-95 transition-all ${isMe ? 'self-end' : 'self-start'}`}
              >
                <MessageSquareReply
                  className={`w-3.5 h-3.5 ${unreadThreadCount > 0 ? 'text-indigo-300' : 'text-indigo-400'}`}
                />
                <span>{threadCount} câu trả lời trong luồng</span>
                {unreadThreadCount > 0 && (
                  <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums">
                    +{unreadThreadCount} mới
                  </span>
                )}
              </button>
            );
          })()}
      </div>
    );
  }
);

MosChatMobileMessageItem.displayName = 'MosChatMobileMessageItem';
