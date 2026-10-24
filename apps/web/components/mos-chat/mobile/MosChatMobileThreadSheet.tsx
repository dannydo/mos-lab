'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SendHorizontal,
  MessageSquareReply,
  X,
  CheckCheck,
  Smile,
  ImageIcon,
  Copy,
  Trash2,
  Pencil,
  Loader2,
} from 'lucide-react';
import { message as antdMessage } from 'antd';
import dayjs from 'dayjs';
import { useMosChat } from '../context/MosChatContext';
import { MosChatMobileStickerSheet } from './MosChatMobileStickerSheet';
import { formatStickerToken, type MosChatStickerItem } from '../mos-chat-stickers';
import { MosChatRichText } from '../MosChatRichText';
import { MosChatMobileMentionAutocomplete } from './MosChatMobileMentionAutocomplete';
import { MosChatMobileEditModal } from './MosChatMobileEditModal';
import { MosChatMobileMediaGallery, type MosChatGalleryImage } from './MosChatMobileMediaGallery';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../constants/chat-constants';
import { apiClient } from '../../../lib/api-client';
import { uploadMultipleChatImages } from '../utils/chat-upload';
import type { MosChatImageAttachment, MosChatThreadReply, SafeAny } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { isUserMentionedInText, extractMentionedStaff, isStaffInConversationMembers } from '../utils/chat-helpers';

export const MosChatMobileThreadSheet: React.FC = () => {
  const {
    activeConversation,
    staffDirectory,
    activeThreadMsg,
    threadReplies,
    sendThreadReply,
    reactToMessage,
    deleteThreadReply,
    editMessage,
    currentUser,
    setMobileView,
  } = useMosChat();

  const [text, setText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parent Message Swipe & Double-tap
  const lastTapParentRef = useRef<number>(0);
  const [showHeartFlyParent, setShowHeartFlyParent] = useState<boolean>(false);
  const [parentSwipeOffset, setParentSwipeOffset] = useState<number>(0);
  const parentSwipeOffsetRef = useRef<number>(0);
  const parentTouchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isParentSwipingRef = useRef<boolean>(false);
  const isParentScrollingRef = useRef<boolean>(false);

  // Replies Swipe & Double-tap
  const lastTapReplyRef = useRef<Record<string, number>>({});
  const [showHeartFlyReplyId, setShowHeartFlyReplyId] = useState<string | null>(null);
  const [swipeOffsetMap, setSwipeOffsetMap] = useState<Record<string, number>>({});
  const replySwipeOffsetRef = useRef<Record<string, number>>({});
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isReplySwipingRef = useRef<Record<string, boolean>>({});
  const isReplyScrollingRef = useRef<Record<string, boolean>>({});
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Action sheet for long-pressed reply
  const [actionSheetReply, setActionSheetReply] = useState<MosChatThreadReply | null>(null);

  // Edit reply modal state
  const [editingReply, setEditingReply] = useState<MosChatThreadReply | null>(null);

  // Media Gallery Lightbox state
  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);

  // All images in active thread (parent message + replies in chronological order)
  const threadGalleryImages: MosChatGalleryImage[] = useMemo(() => {
    if (!activeThreadMsg) return [];
    const list: MosChatGalleryImage[] = [];

    // 1. Parent message attachments
    if (activeThreadMsg.attachments && activeThreadMsg.attachments.length > 0) {
      activeThreadMsg.attachments.forEach((att, idx) => {
        list.push({
          id: att.id || `parent-${activeThreadMsg.id}-att-${idx}`,
          url: att.url,
          name: att.name,
          senderName: activeThreadMsg.senderName,
          senderRole: activeThreadMsg.senderRole,
          createdAt: activeThreadMsg.createdAt,
        });
      });
    }

    // 2. Thread replies attachments
    (threadReplies || []).forEach((reply) => {
      if (reply.attachments && reply.attachments.length > 0) {
        reply.attachments.forEach((att, idx) => {
          list.push({
            id: att.id || `reply-${reply.id}-att-${idx}`,
            url: att.url,
            name: att.name,
            senderName: reply.senderName,
            senderRole: reply.senderRole,
            createdAt: reply.createdAt,
          });
        });
      }
    });

    return list;
  }, [activeThreadMsg, threadReplies]);

  const handleOpenGallery = (targetUrl: string, targetId?: string) => {
    const idx = threadGalleryImages.findIndex((img) => (targetId && img.id === targetId) || img.url === targetUrl);
    setGalleryInitialIndex(idx >= 0 ? idx : 0);
    setGalleryOpen(true);
  };

  // Replying quote inside thread
  const [replyingToReply, setReplyingToReply] = useState<MosChatThreadReply | null>(null);

  // Auto focus textarea when quoting in thread
  useEffect(() => {
    if (replyingToReply) {
      textareaRef.current?.focus();
    }
  }, [replyingToReply]);

  // Image attachments
  const [attachedImages, setAttachedImages] = useState<MosChatImageAttachment[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);

  // Sticker & Emoji Sheet
  const [stickerPickerOpen, setStickerPickerOpen] = useState<boolean>(false);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  // iOS Safari Virtual Keyboard listener using visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Auto scroll to bottom of thread
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [threadReplies.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(100, el.scrollHeight)}px`;
  }, [text]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && attachedImages.length === 0) || isSending || isUploadingImages) return;

    // Enforce in-group tagging check for group spaces
    if (activeConversation && activeConversation.type?.toLowerCase() === 'space') {
      const mentionedStaff = extractMentionedStaff(trimmed, staffDirectory || [], {
        nicknames: activeConversation.memberNicknames,
      });

      const nonMemberMentions = mentionedStaff.filter(
        (s) => !isStaffInConversationMembers(s, activeConversation, staffDirectory)
      );

      if (nonMemberMentions.length > 0) {
        const names = nonMemberMentions.map((s) => s.displayName || s.username).join(', ');
        antdMessage.warning(
          `Đồng nghiệp ${names} chưa tham gia nhóm này. Bạn hãy mời vào nhóm trước khi nhắc tên nhé!`
        );
        return;
      }
    }

    let payloadText = trimmed;
    if (replyingToReply) {
      payloadText = `> Trích dẫn @${replyingToReply.senderName}: ${replyingToReply.text}\n\n${trimmed}`;
    }

    setIsSending(true);
    const success = await sendThreadReply(payloadText, {
      attachments: attachedImages.length > 0 ? attachedImages : undefined,
    });
    setIsSending(false);

    if (success) {
      setText('');
      setAttachedImages([]);
      setReplyingToReply(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Image upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const count = files.length;
    setIsUploadingImages(true);
    const hideMsg = antdMessage.loading(`Đang tải ${count} ảnh lên...`, 0);

    try {
      const uploaded = await uploadMultipleChatImages(files);
      hideMsg();
      if (uploaded.length > 0) {
        setAttachedImages((prev) => [...prev, ...uploaded]);
        if (uploaded.length === count) {
          antdMessage.success(`Đã đính kèm ${uploaded.length} ảnh trong luồng`);
        } else {
          antdMessage.warning(`Đã tải ${uploaded.length}/${count} ảnh`);
        }
      } else {
        antdMessage.error('Không thể tải ảnh lên');
      }
    } catch {
      hideMsg();
      antdMessage.error('Không thể tải ảnh lên');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Swipe & Double-tap on Parent Message
  const handleTouchStartParent = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    parentTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    parentSwipeOffsetRef.current = 0;
    isParentSwipingRef.current = false;
    isParentScrollingRef.current = false;
  };

  const handleTouchMoveParent = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - parentTouchStartRef.current.x;
    const deltaY = currentY - parentTouchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (isParentScrollingRef.current) return;

    if (!isParentSwipingRef.current) {
      if (absY > 7 && absY > absX) {
        isParentScrollingRef.current = true;
        return;
      }
      if (absX > 7 && absX > absY) {
        isParentSwipingRef.current = true;
      }
    }

    if (isParentSwipingRef.current) {
      const direction = deltaX > 0 ? 1 : -1;
      const clampedDist = Math.min(absX, 90);
      const damped = direction * (clampedDist * 0.85);

      parentSwipeOffsetRef.current = damped;
      setParentSwipeOffset(damped);
    }
  };

  const handleTouchEndParent = () => {
    if (!activeThreadMsg) return;

    const currentOffset = parentSwipeOffsetRef.current;
    if (Math.abs(currentOffset) >= 35) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      setReplyingToReply({
        id: activeThreadMsg.id,
        senderId: activeThreadMsg.senderId,
        senderName: activeThreadMsg.senderName,
        text: activeThreadMsg.text,
        createdAt: activeThreadMsg.createdAt,
      } as MosChatThreadReply);
    }

    parentSwipeOffsetRef.current = 0;
    setParentSwipeOffset(0);
    isParentSwipingRef.current = false;
    isParentScrollingRef.current = false;

    // Double-tap to heart (only when not performing a swipe)
    if (Math.abs(currentOffset) < 10) {
      const now = Date.now();
      if (now - lastTapParentRef.current < 280) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(10);
        }
        reactToMessage(activeThreadMsg.id, '❤️');
        setShowHeartFlyParent(true);
        setTimeout(() => setShowHeartFlyParent(false), 900);
        lastTapParentRef.current = 0;
      } else {
        lastTapParentRef.current = now;
      }
    }
  };

  // Touch handlers for Replies
  const handleTouchStartReply = (e: React.TouchEvent, reply: MosChatThreadReply) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartPosRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    replySwipeOffsetRef.current[reply.id] = 0;
    isReplySwipingRef.current[reply.id] = false;
    isReplyScrollingRef.current[reply.id] = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(20);
      }
      setActionSheetReply(reply);
    }, 450);
  };

  const handleTouchMoveReply = (e: React.TouchEvent, replyId: string) => {
    if (!e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartPosRef.current.x;
    const deltaY = currentY - touchStartPosRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (isReplyScrollingRef.current[replyId]) return;

    if (!isReplySwipingRef.current[replyId]) {
      if (absY > 7 && absY > absX) {
        isReplyScrollingRef.current[replyId] = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        return;
      }
      if (absX > 7 && absX > absY) {
        isReplySwipingRef.current[replyId] = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }

    if (isReplySwipingRef.current[replyId]) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const direction = deltaX > 0 ? 1 : -1;
      const clampedDist = Math.min(absX, 90);
      const damped = direction * (clampedDist * 0.85);

      replySwipeOffsetRef.current[replyId] = damped;
      setSwipeOffsetMap((prev) => ({ ...prev, [replyId]: damped }));
    }
  };

  const handleTouchEndReply = (reply: MosChatThreadReply) => {
    if (!activeThreadMsg) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const currentOffset = replySwipeOffsetRef.current[reply.id] || 0;
    if (Math.abs(currentOffset) >= 35) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      setReplyingToReply(reply);
    }

    replySwipeOffsetRef.current[reply.id] = 0;
    setSwipeOffsetMap((prev) => ({ ...prev, [reply.id]: 0 }));
    isReplySwipingRef.current[reply.id] = false;
    isReplyScrollingRef.current[reply.id] = false;

    // Double-tap to heart (only when not performing a swipe)
    if (Math.abs(currentOffset) < 10) {
      const now = Date.now();
      const lastTap = lastTapReplyRef.current[reply.id] || 0;
      if (now - lastTap < 280) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(10);
        }
        reactToMessage(activeThreadMsg.id, '❤️', reply.id);
        setShowHeartFlyReplyId(reply.id);
        setTimeout(() => setShowHeartFlyReplyId(null), 900);
        lastTapReplyRef.current[reply.id] = 0;
      } else {
        lastTapReplyRef.current[reply.id] = now;
      }
    }
  };

  const handleSelectSticker = async (sticker: MosChatStickerItem) => {
    setStickerPickerOpen(false);
    const token = formatStickerToken(sticker.id);
    await sendThreadReply(token);
  };

  if (!activeThreadMsg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <MessageSquareReply className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-sm font-medium">Chưa chọn luồng thảo luận nào</p>
        <button
          type="button"
          onClick={() => setMobileView('room')}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          Quay lại phòng chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Hidden File Input for Multi-Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif,.HEIC,.HEIF"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải nhiều ảnh đính kèm trong luồng"
      />

      {/* Scrollable Replies Feed */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
        {/* Parent Message Highlight Card with Swipe to Quote & Double-Tap to Heart */}
        <div
          onTouchStart={handleTouchStartParent}
          onTouchMove={handleTouchMoveParent}
          onTouchEnd={handleTouchEndParent}
          style={{
            transform: `translateX(${parentSwipeOffset}px)`,
            transition: parentSwipeOffset === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            touchAction: 'pan-y',
          }}
          className="relative bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer select-none"
        >
          {/* Swipe Right Indicator */}
          {parentSwipeOffset > 10 && (
            <div
              style={{
                opacity: Math.min(1, parentSwipeOffset / 35),
                transform: `scale(${Math.min(1, 0.5 + parentSwipeOffset / 70)}) translateY(-50%)`,
              }}
              className="absolute left-2 top-1/2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md z-30 pointer-events-none"
            >
              <MessageSquareReply className="w-4 h-4" />
            </div>
          )}

          {/* Swipe Left Indicator */}
          {parentSwipeOffset < -10 && (
            <div
              style={{
                opacity: Math.min(1, Math.abs(parentSwipeOffset) / 35),
                transform: `scale(${Math.min(1, 0.5 + Math.abs(parentSwipeOffset) / 70)}) translateY(-50%)`,
              }}
              className="absolute right-2 top-1/2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md z-30 pointer-events-none"
            >
              <MessageSquareReply className="w-4 h-4" />
            </div>
          )}

          {/* Floating Heart Animation for Parent Message */}
          {showHeartFlyParent && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-bounce">
              <span className="text-4xl filter drop-shadow-md">❤️</span>
            </div>
          )}

          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500/30 to-indigo-500/30 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-300 font-bold uppercase">
              {activeThreadMsg.senderName?.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-bold text-white">{activeThreadMsg.senderName}</span>
            <span className="text-[10px] text-slate-500 tabular-nums flex items-center gap-1">
              {activeThreadMsg.editedAt && <span className="italic text-slate-400">đã sửa</span>}
              <span>{dayjs(activeThreadMsg.createdAt).format('HH:mm DD/MM')}</span>
            </span>
          </div>

          {/* Parent Message Content */}
          <div className="text-sm text-slate-200 select-text">
            <MosChatRichText
              content={activeThreadMsg.text}
              isMe={
                String(activeThreadMsg.senderId) === String(currentUser?.id) ||
                String(activeThreadMsg.senderName) === String(currentUser?.fullName || currentUser?.name)
              }
              isDark={true}
            />
          </div>

          {/* Parent Message Attachments */}
          {activeThreadMsg.attachments && activeThreadMsg.attachments.length > 0 && (
            <div className="mt-2.5">
              {activeThreadMsg.attachments.length === 1 ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGallery(activeThreadMsg.attachments![0].url, activeThreadMsg.attachments![0].id);
                  }}
                  className="rounded-xl overflow-hidden bg-slate-950/40 cursor-pointer active:opacity-90 transition-opacity"
                >
                  <img
                    src={resolveMediaUrl(activeThreadMsg.attachments[0].url)}
                    alt={activeThreadMsg.attachments[0].name || 'Ảnh đính kèm'}
                    className="max-h-60 w-full object-cover rounded-xl"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                  {activeThreadMsg.attachments.slice(0, 4).map((att, idx) => {
                    const total = activeThreadMsg.attachments!.length;
                    const isFirstOfThree = total === 3 && idx === 0;
                    const isFourthInMany = total > 4 && idx === 3;
                    const remaining = total - 3;

                    return (
                      <div
                        key={att.id || idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGallery(att.url, att.id);
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

          {/* Reaction badges for Parent Message */}
          {activeThreadMsg.reactions && Object.keys(activeThreadMsg.reactions).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-2.5 pt-2 border-t border-slate-800/80">
              {Object.entries(activeThreadMsg.reactions).map(([emoji, count]) => {
                if (count <= 0) return null;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reactToMessage(activeThreadMsg.id, emoji);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 active:scale-95 transition-all shadow-sm"
                  >
                    <span>{emoji}</span>
                    <span className="tabular-nums text-[11px] font-semibold text-amber-400">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 my-2 text-slate-500 text-xs font-medium">
          <span className="h-px flex-1 bg-slate-800" />
          <span>{threadReplies.length} phản hồi</span>
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Replies List */}
        {threadReplies.map((reply) => {
          const isMe =
            String(reply.senderId) === String(currentUser?.id) ||
            String(reply.senderName) === String(currentUser?.fullName || currentUser?.name);

          const swipeOffset = swipeOffsetMap[reply.id] || 0;
          const showHeartFly = showHeartFlyReplyId === reply.id;

          const replyOffset = swipeOffsetMap[reply.id] || 0;

          return (
            <div
              key={reply.id}
              onTouchStart={(e) => handleTouchStartReply(e, reply)}
              onTouchMove={(e) => handleTouchMoveReply(e, reply.id)}
              onTouchEnd={() => handleTouchEndReply(reply)}
              style={{
                transform: `translateX(${replyOffset}px)`,
                transition: replyOffset === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                touchAction: 'pan-y',
              }}
              className={`relative flex flex-col my-1 select-none ${isMe ? 'items-end' : 'items-start'}`}
            >
              {/* Swipe Right Indicator */}
              {replyOffset > 10 && (
                <div
                  style={{
                    opacity: Math.min(1, replyOffset / 35),
                    transform: `scale(${Math.min(1, 0.5 + replyOffset / 70)}) translateY(-50%)`,
                  }}
                  className="absolute left-2 top-1/2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md z-30 pointer-events-none"
                >
                  <MessageSquareReply className="w-4 h-4" />
                </div>
              )}

              {/* Swipe Left Indicator */}
              {replyOffset < -10 && (
                <div
                  style={{
                    opacity: Math.min(1, Math.abs(replyOffset) / 35),
                    transform: `scale(${Math.min(1, 0.5 + Math.abs(replyOffset) / 70)}) translateY(-50%)`,
                  }}
                  className="absolute right-2 top-1/2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md z-30 pointer-events-none"
                >
                  <MessageSquareReply className="w-4 h-4" />
                </div>
              )}

              {/* Floating Heart Fly Animation */}
              {showHeartFly && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-bounce">
                  <span className="text-3xl filter drop-shadow-md">❤️</span>
                </div>
              )}

              {!isMe && (
                <span className="text-[11px] font-semibold text-slate-400 mb-0.5 px-1">{reply.senderName}</span>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm ${
                  isMe
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-sm'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-sm'
                }`}
              >
                {/* Image Attachments */}
                {reply.attachments && reply.attachments.length > 0 && (
                  <div className="mb-1.5">
                    {reply.attachments.length === 1 ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGallery(reply.attachments![0].url, reply.attachments![0].id);
                        }}
                        className="rounded-xl overflow-hidden bg-slate-950/40 cursor-pointer active:opacity-90 transition-opacity"
                      >
                        <img
                          src={resolveMediaUrl(reply.attachments[0].url)}
                          alt={reply.attachments[0].name || 'Ảnh đính kèm'}
                          className="max-h-56 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                        {reply.attachments.slice(0, 4).map((att, idx) => {
                          const total = reply.attachments!.length;
                          const isFirstOfThree = total === 3 && idx === 0;
                          const isFourthInMany = total > 4 && idx === 3;
                          const remaining = total - 3;

                          return (
                            <div
                              key={att.id || idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenGallery(att.url, att.id);
                              }}
                              className={`relative overflow-hidden cursor-pointer active:opacity-90 transition-opacity rounded-lg ${
                                isFirstOfThree ? 'col-span-2 h-36' : 'h-24'
                              }`}
                            >
                              <img
                                src={resolveMediaUrl(att.url)}
                                alt={att.name || `Hình ${idx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {isFourthInMany && (
                                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-sm">
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

                <div className="select-text">
                  <MosChatRichText content={reply.text} isMe={isMe} isDark={true} />
                </div>

                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums ${
                    isMe ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {reply.editedAt && <span className="italic mr-0.5">đã sửa</span>}
                  <span>{dayjs(reply.createdAt).format('HH:mm')}</span>
                  {isMe && <CheckCheck className="w-3.5 h-3.5 text-slate-800" />}
                </div>
              </div>

              {/* Reaction Badges for Reply */}
              {reply.reactions && Object.keys(reply.reactions).length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                  {Object.entries(reply.reactions).map(([emoji, count]) => {
                    if (count <= 0) return null;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reactToMessage(activeThreadMsg.id, emoji, reply.id);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 active:scale-95 transition-all shadow-sm"
                      >
                        <span>{emoji}</span>
                        <span className="tabular-nums text-[11px] font-semibold text-amber-400">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Bottom Thread Composer with Sticker & Image Attachments */}
      <div
        style={{
          transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : 'none',
          transition: 'transform 0.15s ease-out',
          paddingBottom: keyboardOffset > 50 ? '8px' : 'max(env(safe-area-inset-bottom, 14px), 12px)',
        }}
        className="sticky bottom-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-3 pt-2 shadow-lg"
      >
        {/* Autocomplete when typing @mention in subthread */}
        <MosChatMobileMentionAutocomplete
          text={text}
          onSelectMention={(nextText) => setText(nextText)}
          textareaRef={textareaRef}
        />

        {/* Quoting Preview Banner */}
        {replyingToReply && (
          <div className="flex items-center justify-between bg-slate-800/90 border border-amber-500/30 rounded-xl px-3 py-1.5 mb-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <MessageSquareReply className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-amber-300">Trả lời {replyingToReply.senderName}:</span>{' '}
                <span className="text-slate-300 truncate">{replyingToReply.text}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingToReply(null)}
              className="p-0.5 text-slate-400 hover:text-white"
              aria-label="Hủy trích dẫn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attached Images Preview */}
        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar py-1">
            {attachedImages.map((att) => (
              <div
                key={att.id}
                className="relative w-14 h-14 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 bg-slate-800 shadow-sm"
              >
                {}
                <img src={resolveMediaUrl(att.url)} alt={att.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setAttachedImages((prev) => prev.filter((img) => img.id !== att.id))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-900/90 text-white flex items-center justify-center text-[10px]"
                  aria-label="Xóa ảnh đính kèm"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {isUploadingImages && (
              <div className="w-14 h-14 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-[9px] text-amber-300 mt-0.5 font-medium">Tải...</span>
              </div>
            )}
          </div>
        )}

        {/* Uploading Banner when no images are ready yet */}
        {isUploadingImages && attachedImages.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />
            <span>Đang tải hình ảnh lên...</span>
          </div>
        )}

        {/* Composer Input Bar */}
        <div className="flex items-end gap-1.5">
          {/* Sticker & Emoji Button */}
          <button
            type="button"
            onClick={() => setStickerPickerOpen(true)}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-amber-400 active:scale-95 flex items-center justify-center shrink-0 mb-0.5"
            aria-label="Biểu cảm & Nhãn dán"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImages}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-amber-400 active:scale-95 flex items-center justify-center shrink-0 mb-0.5 disabled:opacity-50"
            aria-label="Đính kèm nhiều ảnh"
            title="Đính kèm nhiều ảnh"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Text Area */}
          <div className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-1.5 focus-within:border-amber-400/80 transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Trả lời trong luồng..."
              className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 resize-none max-h-[100px] py-1 leading-snug"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && attachedImages.length === 0) || isSending || isUploadingImages}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 active:scale-90 transition-transform shrink-0 mb-0.5 disabled:opacity-50"
            aria-label="Gửi phản hồi luồng"
          >
            {isSending || isUploadingImages ? (
              <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
            ) : (
              <SendHorizontal className="w-4 h-4 text-slate-950 font-bold" />
            )}
          </button>
        </div>
      </div>

      {/* Long-press Action Sheet for Subthread Reply */}
      {actionSheetReply && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
          <div
            onClick={() => setActionSheetReply(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

            {/* Quick Reactions */}
            <div className="flex items-center justify-around bg-slate-800/90 border border-slate-700/60 rounded-2xl py-2 px-3 mb-4 shadow-sm">
              {GOOGLE_CHAT_QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    reactToMessage(activeThreadMsg.id, emoji, actionSheetReply.id);
                    setActionSheetReply(null);
                  }}
                  className="text-2xl p-1 active:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Actions List */}
            <div className="space-y-1 divide-y divide-slate-800/60">
              <button
                type="button"
                onClick={() => {
                  setReplyingToReply(actionSheetReply);
                  setActionSheetReply(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-98"
              >
                <MessageSquareReply className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Trả lời trích dẫn trong luồng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(actionSheetReply.text);
                    antdMessage.success('Đã sao chép phản hồi');
                  }
                  setActionSheetReply(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-98"
              >
                <Copy className="w-4 h-4 text-sky-400" />
                <span className="font-medium">Sao chép phản hồi</span>
              </button>

              {(String(actionSheetReply.senderId) === String(currentUser?.id) ||
                String(currentUser?.role || '')
                  .toLowerCase()
                  .includes('admin')) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingReply(actionSheetReply);
                    setActionSheetReply(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors active:scale-98"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="font-medium">Chỉnh sửa phản hồi</span>
                </button>
              )}

              {(String(actionSheetReply.senderId) === String(currentUser?.id) ||
                String(currentUser?.role || '')
                  .toLowerCase()
                  .includes('admin')) && (
                <button
                  type="button"
                  onClick={() => {
                    deleteThreadReply(activeThreadMsg.id, actionSheetReply.id);
                    setActionSheetReply(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors active:scale-98"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-medium">Xóa phản hồi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Reply Modal */}
      {editingReply && activeThreadMsg && (
        <MosChatMobileEditModal
          open={!!editingReply}
          initialText={editingReply.text}
          onClose={() => setEditingReply(null)}
          onSave={async (newText) => {
            await editMessage(activeThreadMsg.id, newText, { replyId: editingReply.id });
            antdMessage.success('Đã lưu chỉnh sửa phản hồi');
            setEditingReply(null);
          }}
          title="Chỉnh sửa phản hồi"
        />
      )}

      {/* Thread Image Media Gallery Modal */}
      <MosChatMobileMediaGallery
        open={galleryOpen}
        images={threadGalleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryOpen(false)}
      />

      {/* Sticker & Emoji Sheet */}
      <MosChatMobileStickerSheet
        open={stickerPickerOpen}
        onClose={() => setStickerPickerOpen(false)}
        initialPack="emoji"
        onSelectSticker={handleSelectSticker}
        onSelectEmoji={(emoji) => {
          setText((prev) => `${prev}${emoji}`);
        }}
        currentText={text}
        onSend={() => {
          handleSend();
        }}
      />
    </div>
  );
};
