'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Rocket,
  CheckCircle2,
  CheckSquare,
  Square,
  ListTodo,
  ExternalLink,
  Check,
  RotateCcw,
  CornerDownLeft,
  CornerDownRight,
  Sparkles,
  UserCheck,
  Plus,
  Users,
  ChevronRight,
  Film,
  Play,
  FileText,
  File,
} from 'lucide-react';
import { message as antdMessage, Avatar } from 'antd';
import dayjs from 'dayjs';
import { useMosChat } from '../context/MosChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { MosChatMobileStickerSheet } from './MosChatMobileStickerSheet';
import { MosChatMobileActionSheet } from './MosChatMobileActionSheet';
import { formatStickerToken, type MosChatStickerItem } from '../mos-chat-stickers';
import { MosChatRichText } from '../MosChatRichText';
import { MosChatMobileMentionAutocomplete } from './MosChatMobileMentionAutocomplete';
import { MosChatMobileEditModal } from './MosChatMobileEditModal';
import { MosChatMobileMediaGallery, type MosChatGalleryImage } from './MosChatMobileMediaGallery';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../constants/chat-constants';
import { handleSmartListEnterKey } from '../MosChatRichEditorModal';
import { syncTextareaHeightSmart } from '../components/MosChatComposer';
import { apiClient } from '../../../lib/api-client';
import { uploadMultipleChatImages } from '../utils/chat-upload';
import { cleanQuotedText, formatQuotePayload } from '../utils/quoteUtils';
import { MosChatAvatar } from '../MosChatAvatar';
import { MosChatCustomerCardAttachment } from '../components/MosChatCustomerCardAttachment';
import { MosChatCustomerPickerModal } from '../MosChatCustomerPickerModal';
import type {
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatMissionActionType,
  MosChatThreadReply,
  MosChatMessage,
  MosChatTaskItem,
  SafeAny,
} from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { MosChatThreadChecklist } from '../components/MosChatThreadChecklist';
import {
  isUserMentionedInText,
  extractMentionedStaff,
  isStaffInConversationMembers,
  isUserMessageOwner,
  isImageAttachment,
  getFileExtension,
} from '../utils/chat-helpers';
import { isVideoAttachment, formatVideoDuration } from '../utils/chat-video';
import { MosChatVideoPlayer } from '../components/MosChatVideoPlayer';

export interface MosChatMobileThreadSheetProps {
  onOpenTaskModal?: (params?: {
    initialTitle?: string;
    sourceMsg?: MosChatMessage | null;
    existingTask?: MosChatTaskItem | null;
    sourceReply?: MosChatThreadReply | null;
    isNew?: boolean;
  }) => void;
  onOpenMoveReply?: (sourceMsg: MosChatMessage, replyId: string) => void;
}

export const MosChatMobileThreadSheet: React.FC<MosChatMobileThreadSheetProps> = ({
  onOpenTaskModal,
  onOpenMoveReply,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const {
    activeConversation,
    staffDirectory,
    activeThreadMsg,
    threadReplies,
    sendThreadReply,
    reactToMessage,
    hasUserReacted,
    openReactionUsersSheet,
    deleteThreadReply,
    moveThreadItem,
    markThreadAsRead,
    editMessage,
    currentUser,
    setMobileView,
    tasks,
    toggleTaskDone,
    updateTask,
    executeMissionAction,
    isAiThinking,
    openCustomerDetail,
  } = useMosChat();

  const [text, setText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Auto mark open thread as read
  useEffect(() => {
    if (activeThreadMsg && activeConversation?.id && (activeThreadMsg.unreadThreadReplyCount || 0) > 0) {
      markThreadAsRead(activeConversation.id, activeThreadMsg.id);
    }
  }, [activeThreadMsg?.id, activeThreadMsg?.unreadThreadReplyCount, activeConversation?.id, markThreadAsRead]);

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

  // Live Thread Message & Linked Mission State
  const liveThreadMsg = useMemo(() => {
    if (!activeThreadMsg) return null;
    const found = activeConversation?.messages?.find((m) => m.id === activeThreadMsg.id);
    return found || activeThreadMsg;
  }, [activeConversation, activeThreadMsg]);

  const linkedTask = useMemo(() => {
    if (!liveThreadMsg) return null;
    return (
      (tasks || []).find(
        (t) => t.sourceMessageId === liveThreadMsg.id || (liveThreadMsg.taskId && t.id === liveThreadMsg.taskId)
      ) || null
    );
  }, [tasks, liveThreadMsg]);

  const mission = useMemo(() => {
    return liveThreadMsg?.mission || linkedTask?.mission || null;
  }, [liveThreadMsg, linkedTask]);

  const isStrictDannySuperAdmin = useMemo(() => {
    const username = (currentUser?.username || '').toLowerCase().trim();
    const email = (currentUser?.email || '').toLowerCase().trim();
    const displayName = (currentUser?.displayName || currentUser?.name || '').toLowerCase().trim();
    const role = (currentUser?.role || '').toLowerCase().trim();
    const id = Number(currentUser?.id) || 0;
    return (
      username === 'dannydo' ||
      email.includes('danhdo') ||
      displayName.includes('danny') ||
      (role === 'admin' && id === 1) ||
      role === 'super_admin'
    );
  }, [currentUser]);

  const canApproveImplementation = Boolean(
    mission &&
    (mission.superAdminActions?.canApproveImplementation ||
      mission.status === 'NEW' ||
      (mission.status === 'APPROVED' && !mission.superAdminActions?.activeJobId))
  );

  const canSuperAdminApproveCommit = Boolean(
    mission &&
    (mission.canSuperAdminApproveCommit ||
      mission.superAdminActions?.canApproveCommit ||
      mission.status === 'AWAITING_DANNY_COMMIT_REVIEW' ||
      mission.superAdminActions?.executionPhase === 'AWAITING_COMMIT_REVIEW')
  );

  const canSuperAdminApproveDeploy = Boolean(
    mission &&
    (mission.canSuperAdminApproveDeploy ||
      mission.superAdminActions?.canApproveDeploy ||
      mission.status === 'AWAITING_DANNY_DEPLOY_APPROVAL' ||
      mission.superAdminActions?.executionPhase === 'AWAITING_DEPLOY_REVIEW')
  );

  const canReporterAccept = Boolean(
    mission &&
    (mission.canReporterAccept ||
      mission.reporterActions?.canAcceptOrReopen ||
      mission.status === 'FIXED' ||
      mission.status === 'AWAITING_REPORTER_ACCEPTANCE')
  );

  const canRequestUpgradeOrRework = Boolean(
    mission && (canReporterAccept || mission.stage === 'COMPLETED' || mission.status === 'CLOSED')
  );

  const hasAnyPendingAction = Boolean(
    (isStrictDannySuperAdmin &&
      (canApproveImplementation || canSuperAdminApproveCommit || canSuperAdminApproveDeploy)) ||
    canReporterAccept
  );

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isReopenOpen, setIsReopenOpen] = useState<boolean>(false);
  const [reopenFeedback, setReopenFeedback] = useState<string>('');

  const handleExecuteMissionAction = async (action: MosChatMissionActionType, feedback?: string) => {
    if (!mission) return;
    setActionLoading(action);
    try {
      await executeMissionAction(mission, action, feedback);
      if (action === 'APPROVE_COMMIT') {
        antdMessage.success(`✅ Đã duyệt Commit (Cổng 2) cho #${mission.missionKey}!`);
      } else if (action === 'APPROVE_DEPLOY') {
        antdMessage.success(`🚀 Đã duyệt Deploy lên Web (Cổng 3) cho #${mission.missionKey}!`);
      } else if (action === 'APPROVE_IMPLEMENTATION') {
        antdMessage.success(`🚀 Đã duyệt Cổng 1 mOS Mission #${mission.missionKey}!`);
      } else if (action === 'REPORTER_ACCEPT') {
        antdMessage.success(`🎉 Đã nghiệm thu hoàn tất #${mission.missionKey}!`);
      } else if (action === 'REPORTER_REOPEN') {
        antdMessage.info(`🔄 Đã gửi yêu cầu chỉnh sửa tiếp cho #${mission.missionKey}!`);
        setIsReopenOpen(false);
        setReopenFeedback('');
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi thực hiện');
    } finally {
      setActionLoading(null);
    }
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

  // Customer Card Attachment inside Thread
  const [customerPickerOpen, setCustomerPickerOpen] = useState<boolean>(false);
  const [stagedCustomerCard, setStagedCustomerCard] = useState<MosChatCustomerCard | null>(null);

  // Bottom Action Sheet (Tác vụ đính kèm & Tiện ích)
  const [actionSheetOpen, setActionSheetOpen] = useState<boolean>(false);

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

  // Robust scroll to bottom helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (el) {
      if (typeof el.scrollTo === 'function') {
        try {
          el.scrollTo({ top: el.scrollHeight, behavior });
        } catch {}
      }
      try {
        el.scrollTop = el.scrollHeight;
      } catch {}
    }
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      try {
        bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      } catch {}
    }
  }, []);

  // Auto scroll to bottom of thread on initial open and replies update
  useEffect(() => {
    const execute = () => scrollToBottom('auto');
    execute();
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        execute();
        window.setTimeout(execute, 40);
        window.setTimeout(execute, 150);
        window.setTimeout(execute, 300);
      });
    }
  }, [activeThreadMsg?.id, threadReplies.length, isAiThinking, scrollToBottom]);

  // Auto-resize textarea without layout thrashing
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    syncTextareaHeightSmart(el, 100);
  }, [text]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && attachedImages.length === 0 && !stagedCustomerCard) || isSending || isUploadingImages) return;

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

    const sendBaseText =
      trimmed || (stagedCustomerCard?.name ? `Đính kèm thẻ khách hàng ${stagedCustomerCard.name}:` : '');

    let payloadText = sendBaseText;
    if (replyingToReply) {
      payloadText = formatQuotePayload(replyingToReply.senderName, replyingToReply.text, sendBaseText);
    }

    setIsSending(true);
    const success = await sendThreadReply(payloadText, {
      attachments: attachedImages.length > 0 ? attachedImages : undefined,
      customerCard: stagedCustomerCard || undefined,
    });
    setIsSending(false);

    if (success) {
      setText('');
      setAttachedImages([]);
      setStagedCustomerCard(null);
      setReplyingToReply(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInsertNewline = () => {
    const el = textareaRef.current;
    if (!el) return;
    const isFocused = typeof document !== 'undefined' && document.activeElement === el;
    const start = isFocused ? (el.selectionStart ?? text.length) : text.length;
    const end = isFocused ? (el.selectionEnd ?? text.length) : text.length;
    const smart = handleSmartListEnterKey(text, start, end);
    if (smart?.handled) {
      setText(smart.nextText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(smart.nextCursor, smart.nextCursor);
      }, 0);
    } else {
      const nextText = text.substring(0, start) + '\n' + text.substring(end);
      setText(nextText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + 1, start + 1);
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      const el = e.currentTarget;
      const smart = handleSmartListEnterKey(text, el.selectionStart || 0, el.selectionEnd || 0);
      if (smart?.handled) {
        e.preventDefault();
        setText(smart.nextText);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(smart.nextCursor, smart.nextCursor);
        }, 0);
        return;
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || (e as SafeAny).keyCode === 229) {
        return;
      }
      // Khi đang gõ danh sách tự động (•, 1., - [ ]), cho phép Enter tiếp tục danh sách
      const el = e.currentTarget;
      const smart = handleSmartListEnterKey(text, el.selectionStart || 0, el.selectionEnd || 0);
      if (smart?.handled) {
        e.preventDefault();
        setText(smart.nextText);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(smart.nextCursor, smart.nextCursor);
        }, 0);
        return;
      }
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
    const hideMsg = antdMessage.loading(`Đang tải ${count} tệp lên...`, 0);

    try {
      const uploaded = await uploadMultipleChatImages(files);
      hideMsg();
      if (uploaded.length > 0) {
        setAttachedImages((prev) => [...prev, ...uploaded]);
        if (uploaded.length === count) {
          antdMessage.success(`Đã đính kèm ${uploaded.length} tệp trong luồng`);
        } else {
          antdMessage.warning(`Đã tải ${uploaded.length}/${count} tệp`);
        }
      } else {
        antdMessage.error('Không thể tải tệp lên');
      }
    } catch {
      hideMsg();
      antdMessage.error('Không thể tải tệp lên');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
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
        text: cleanQuotedText(activeThreadMsg.text),
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
    if (reply.isDeleted) return;
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
    const r = threadReplies.find((item) => item.id === replyId);
    if (r?.isDeleted) return;
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
    if (reply.isDeleted) return;
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
      setReplyingToReply({
        ...reply,
        text: cleanQuotedText(reply.text),
      });
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
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] text-[var(--mos-text)] overflow-hidden select-none">
      {/* Hidden File Input for Multi-File & Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.mp4,.webm,.mov,.heic,.heif,.HEIC,.HEIF,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải nhiều ảnh đính kèm trong luồng"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.mov"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải video đính kèm trong luồng"
      />

      {/* Scrollable Replies Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
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
          data-testid="mos-thread-parent-card"
          className="relative bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer select-none"
        >
          {/* Swipe Right Indicator */}
          {parentSwipeOffset > 10 && (
            <div
              style={{
                opacity: Math.min(1, parentSwipeOffset / 35),
                transform: `scale(${Math.min(1, 0.5 + parentSwipeOffset / 70)}) translateY(-50%)`,
              }}
              className="absolute left-2 top-1/2 w-8 h-8 rounded-full bg-[var(--mos-accent)] flex items-center justify-center text-[var(--mos-accent-contrast)] shadow-md z-30 pointer-events-none"
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
              className="absolute right-2 top-1/2 w-8 h-8 rounded-full bg-[var(--mos-accent)] flex items-center justify-center text-[var(--mos-accent-contrast)] shadow-md z-30 pointer-events-none"
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
            {activeThreadMsg.isAiBot || activeThreadMsg.senderId === 'wings-ai-copilot' ? (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            ) : (
              <MosChatAvatar
                size="sm"
                src={activeThreadMsg.senderAvatar}
                name={activeThreadMsg.senderName}
                staffId={activeThreadMsg.senderId}
                staffDirectory={staffDirectory}
              />
            )}
            <span className="text-xs font-bold text-[var(--mos-text)]">{activeThreadMsg.senderName}</span>
            {activeThreadMsg.senderRole && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] font-medium uppercase border border-[var(--mos-surface-border)]">
                {activeThreadMsg.senderRole}
              </span>
            )}
            <span className="text-[10px] text-[var(--mos-text-muted)] tabular-nums flex items-center gap-1">
              {activeThreadMsg.editedAt && <span className="italic">đã sửa</span>}
              <span>{dayjs(activeThreadMsg.createdAt).format('HH:mm DD/MM')}</span>
            </span>
          </div>

          {/* Parent Message Content */}
          {activeThreadMsg.isDeleted ? (
            <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[var(--mos-surface-muted)] border border-dashed border-[var(--mos-surface-border)] text-xs italic text-[var(--mos-text-muted)] select-none">
              <Trash2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <span>Tin nhắn gốc đã bị xoá</span>
              {activeThreadMsg.deletedByName && <span className="opacity-75">({activeThreadMsg.deletedByName})</span>}
            </div>
          ) : (
            <div className="text-sm text-[var(--mos-text)] select-text">
              <MosChatRichText
                content={activeThreadMsg.text}
                isMe={
                  String(activeThreadMsg.senderId) === String(currentUser?.id) ||
                  String(activeThreadMsg.senderName) === String(currentUser?.fullName || currentUser?.name)
                }
                isDark={isDark}
              />
            </div>
          )}

          {/* Customer Card Attachment */}
          {!activeThreadMsg.isDeleted && activeThreadMsg.customerCard && (
            <MosChatCustomerCardAttachment card={activeThreadMsg.customerCard} onOpenCustomer={openCustomerDetail} />
          )}

          {/* Parent Message Attachments */}
          {!activeThreadMsg.isDeleted &&
            activeThreadMsg.attachments &&
            activeThreadMsg.attachments.length > 0 &&
            (() => {
              const isParentFromMe = isUserMessageOwner(activeThreadMsg, currentUser);
              const parentVideos = activeThreadMsg.attachments.filter(isVideoAttachment);
              const parentImages = activeThreadMsg.attachments.filter(
                (att) => isImageAttachment(att) && !isVideoAttachment(att)
              );
              const parentFiles = activeThreadMsg.attachments.filter(
                (att) => !isImageAttachment(att) && !isVideoAttachment(att)
              );

              return (
                <div className="mt-2.5 space-y-2">
                  {/* Videos */}
                  {parentVideos.length > 0 && (
                    <div className="space-y-2">
                      {parentVideos.map((att) => (
                        <MosChatVideoPlayer key={att.id} attachment={att} compact={true} isMine={isParentFromMe} />
                      ))}
                    </div>
                  )}

                  {/* Single Image */}
                  {parentImages.length === 1 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenGallery(parentImages[0].url, parentImages[0].id);
                      }}
                      className="rounded-xl overflow-hidden bg-[var(--mos-surface-muted)] cursor-pointer active:opacity-90 transition-opacity"
                    >
                      <img
                        src={resolveMediaUrl(parentImages[0].url)}
                        alt={parentImages[0].name || 'Ảnh đính kèm'}
                        className="max-h-60 w-full object-cover rounded-xl"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Multiple Images Grid */}
                  {parentImages.length > 1 && (
                    <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                      {parentImages.slice(0, 4).map((att, idx) => {
                        const total = parentImages.length;
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

                  {/* Files / Documents */}
                  {parentFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {parentFiles.map((att) => {
                        const fullUrl = resolveMediaUrl(att.url);
                        const ext = getFileExtension(att.name || att.url).toLowerCase();
                        const isPdf = ext === 'pdf' || att.mimeType === 'application/pdf';
                        return (
                          <div
                            key={att.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(fullUrl, '_blank');
                            }}
                            className="flex items-center gap-2 p-2 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text)] cursor-pointer active:scale-[0.98] transition-transform"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                                isPdf
                                  ? `bg-rose-500/20 ${isDark ? 'text-rose-400' : 'text-rose-600'}`
                                  : `bg-emerald-500/20 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`
                              }`}
                            >
                              {isPdf ? <FileText size={16} /> : <File size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate leading-tight">{att.name}</p>
                              <span className="text-[10px] text-[var(--mos-text-muted)] uppercase font-bold">{ext}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Reaction badges for Parent Message */}
          {!activeThreadMsg.isDeleted &&
            activeThreadMsg.reactions &&
            Object.keys(activeThreadMsg.reactions).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-[var(--mos-surface-border)]">
                {Object.entries(activeThreadMsg.reactions).map(([emoji, count]) => {
                  if (count <= 0) return null;
                  const isReacted = hasUserReacted(activeThreadMsg, emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        reactToMessage(activeThreadMsg.id, emoji);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openReactionUsersSheet(activeThreadMsg, emoji);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium active:scale-95 transition-all shadow-sm ${
                        isReacted
                          ? `bg-amber-500/20 border border-amber-500/60 ring-1 ring-amber-500/40 font-semibold ${
                              isDark ? 'text-amber-300' : 'text-amber-800'
                            }`
                          : 'bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] text-[var(--mos-text)]'
                      }`}
                      title={isReacted ? `Đã thả ${emoji} (Nhấn để gỡ / huỷ react)` : `Thả ${emoji}`}
                    >
                      <span>{emoji}</span>
                      <span
                        className={`tabular-nums text-[11px] font-semibold ${
                          isReacted ? (isDark ? 'text-amber-400' : 'text-amber-700') : 'text-[var(--mos-text-muted)]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openReactionUsersSheet(activeThreadMsg);
                  }}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-all shadow-sm"
                  title="Xem người đã thả cảm xúc"
                  aria-label="Xem người thả cảm xúc"
                >
                  <Users className="w-3 h-3" />
                </button>
              </div>
            )}

          {/* Interactive Main Task Card embedded in Parent Message */}
          {linkedTask ? (
            <div className="mt-3 p-2.5 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:border-[var(--mos-surface-border-strong)] transition-colors shadow-sm">
              <div
                className="flex items-start gap-2.5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTaskModal?.({
                    sourceMsg: liveThreadMsg,
                    existingTask: linkedTask,
                  });
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskDone(linkedTask.id, !linkedTask.done);
                  }}
                  className={`mt-0.5 p-1 rounded-lg hover:bg-[var(--mos-surface)] text-[var(--mos-text-muted)] active:scale-90 transition-transform ${
                    isDark ? 'hover:text-emerald-400' : 'hover:text-emerald-600'
                  }`}
                  aria-label={linkedTask.done ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                >
                  {linkedTask.done ? (
                    <CheckCircle2 className={`w-5 h-5 fill-emerald-500/20 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  ) : (
                    <Square className="w-5 h-5 text-[var(--mos-text-muted)]" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        isDark ? 'text-amber-400' : 'text-amber-700'
                      }`}
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Main Task</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        linkedTask.priority === 'URGENT'
                          ? `bg-rose-500/20 border border-rose-500/30 ${isDark ? 'text-rose-300' : 'text-rose-700'}`
                          : linkedTask.priority === 'HIGH'
                            ? `bg-amber-500/20 border border-amber-500/30 ${isDark ? 'text-amber-300' : 'text-amber-800'}`
                            : 'bg-[var(--mos-surface)] text-[var(--mos-text-muted)] border border-[var(--mos-surface-border)]'
                      }`}
                    >
                      {linkedTask.priority === 'URGENT' ? 'Khẩn' : linkedTask.priority === 'HIGH' ? 'Cao' : 'Thường'}
                    </span>
                  </div>

                  <p
                    className={`text-xs font-semibold leading-snug line-clamp-2 ${
                      linkedTask.done ? 'line-through text-[var(--mos-text-muted)]' : 'text-[var(--mos-text)]'
                    }`}
                  >
                    {linkedTask.title}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-[var(--mos-text-muted)]">
                    <span className="flex items-center gap-1.5 text-[var(--mos-text)] font-medium">
                      <MosChatAvatar
                        size="xs"
                        staffId={linkedTask.assigneeId}
                        name={linkedTask.assigneeName || 'Chưa gán'}
                        staffDirectory={staffDirectory}
                      />
                      <span>{linkedTask.assigneeName || 'Chưa gán'}</span>
                    </span>
                    {(linkedTask.dueAt || linkedTask.deadline) && (
                      <span
                        className={`tabular-nums ${
                          !linkedTask.done && dayjs(linkedTask.dueAt || linkedTask.deadline).isBefore(dayjs())
                            ? `${isDark ? 'text-rose-400' : 'text-rose-600'} font-semibold`
                            : 'text-[var(--mos-text-muted)]'
                        }`}
                      >
                        ⏱️ {dayjs(linkedTask.dueAt || linkedTask.deadline).format('HH:mm DD/MM')}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTaskModal?.({
                      sourceMsg: liveThreadMsg,
                      existingTask: linkedTask,
                    });
                  }}
                  className="p-1 rounded-lg hover:bg-[var(--mos-surface)] text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-all"
                  aria-label="Chỉnh sửa Main Task"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mobile Thread Task Checklist */}
              {liveThreadMsg && (
                <div
                  className="mt-2.5"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MosChatThreadChecklist
                    task={linkedTask}
                    activeThreadMessage={liveThreadMsg}
                    onUpdateTask={updateTask}
                    staffList={staffDirectory || []}
                    onToggleChecklistItem={async (itemId) => {
                      await updateTask(linkedTask.id, {
                        checklistAction: 'toggle',
                        checklistItemId: itemId,
                      });
                    }}
                    onAddChecklistItem={async (title, sourceReplyId) => {
                      await updateTask(linkedTask.id, {
                        checklistAction: 'add',
                        checklistItem: { title, sourceReplyId: sourceReplyId || null },
                      });
                    }}
                    onDeleteChecklistItem={async (itemId) => {
                      await updateTask(linkedTask.id, {
                        checklistAction: 'delete',
                        checklistItemId: itemId,
                      });
                    }}
                    onScrollToReply={(replyId) => {
                      const el = document.getElementById(`reply-bubble-${replyId}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-2', 'ring-amber-500');
                        setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 2000);
                      }
                    }}
                    isDark={isDark}
                    isMobile={true}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2.5 pt-2 border-t border-[var(--mos-surface-border)] flex items-center justify-between">
              <span className="text-[11px] text-[var(--mos-text-muted)]">Chưa gắn công việc chính</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTaskModal?.({
                    initialTitle: liveThreadMsg?.text.slice(0, 100) || '',
                    sourceMsg: liveThreadMsg,
                    existingTask: null,
                  });
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 active:scale-95 transition-all ${
                  isDark ? 'text-emerald-400' : 'text-emerald-700'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>+ Giao việc cho tin nhắn này</span>
              </button>
            </div>
          )}
        </div>

        {/* Pinned Live mOS Mission Card in Thread */}
        {mission && (
          <div
            className={`my-2 p-3 rounded-2xl border space-y-2.5 shadow-sm ${
              isDark ? 'bg-purple-950/30 border-purple-800/50' : 'bg-purple-500/10 border-purple-500/30'
            }`}
          >
            {/* Mission header, badge, external link */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Rocket className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className={`text-xs font-black truncate ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>
                  mOS Mission #{mission.missionKey || `MSN-${mission.reportId}`}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 border border-purple-500/30 shrink-0 ${
                    isDark ? 'text-purple-300' : 'text-purple-800'
                  }`}
                >
                  {mission.requestType || 'FEATURE'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border border-purple-400/30 ${
                    isDark ? 'bg-purple-500/30 text-purple-200' : 'bg-purple-500/20 text-purple-800'
                  }`}
                >
                  {mission.stageLabel || mission.humanBadge || mission.status}
                </span>
                <a
                  href={`/dashboard/bug-reports?reportId=${mission.reportId}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`p-1 rounded border border-purple-500/30 active:scale-95 transition-transform cursor-pointer ${
                    isDark
                      ? 'text-purple-300 hover:text-white bg-purple-900/40'
                      : 'text-purple-700 hover:text-purple-900 bg-purple-500/15'
                  }`}
                  aria-label="Xem chi tiết trên mOS Mission"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Title */}
            <p className="text-xs font-bold text-[var(--mos-text)] line-clamp-2 leading-snug">{mission.title}</p>

            {/* 4-Step Progress Bar */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[
                { idx: 1, label: '1. Tiếp nhận' },
                { idx: 2, label: '2. Đang xử lý' },
                { idx: 3, label: '3. Nghiệm thu' },
                { idx: 4, label: '4. Hoàn tất' },
              ].map((s) => {
                const active = (mission.stepIndex || 1) >= s.idx;
                const current = (mission.stepIndex || 1) === s.idx;
                return (
                  <div key={s.idx} className="space-y-1">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        active ? 'bg-purple-500' : 'bg-[var(--mos-surface-muted)]'
                      } ${current ? 'ring-2 ring-purple-400/60 shadow-sm shadow-purple-500/50' : ''}`}
                    />
                    <div
                      className={`text-[9.5px] truncate font-medium ${
                        active ? (isDark ? 'text-purple-300 font-bold' : 'text-purple-700 font-bold') : 'text-[var(--mos-text-muted)]'
                      }`}
                    >
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Human Explanation Box */}
            <div className="p-2.5 rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] text-[11px] text-[var(--mos-text)] leading-relaxed">
              {mission.humanStatusSummary ||
                mission.humanSummary ||
                'Nhiệm vụ đang được triển khai trên hệ thống mOS Mission.'}
            </div>

            {/* Super Admin Inline Gate Controls (Cổng 1, Cổng 2, Cổng 3) */}
            {isStrictDannySuperAdmin && (
              <div className="space-y-2 pt-1">
                {/* Gate 1: Approve Implementation */}
                {canApproveImplementation && (
                  <button
                    type="button"
                    disabled={actionLoading === 'APPROVE_IMPLEMENTATION'}
                    onClick={() => handleExecuteMissionAction('APPROVE_IMPLEMENTATION')}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/40 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading === 'APPROVE_IMPLEMENTATION' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4" />
                    )}
                    <span>Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)</span>
                  </button>
                )}

                {/* Gate 2: Approve Commit */}
                {canSuperAdminApproveCommit && (
                  <button
                    type="button"
                    disabled={actionLoading === 'APPROVE_COMMIT'}
                    onClick={() => handleExecuteMissionAction('APPROVE_COMMIT')}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading === 'APPROVE_COMMIT' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    )}
                    <span>✅ Duyệt Commit (Cổng 2)</span>
                  </button>
                )}

                {/* Gate 3: Approve Deploy */}
                {canSuperAdminApproveDeploy && (
                  <button
                    type="button"
                    disabled={actionLoading === 'APPROVE_DEPLOY'}
                    onClick={() => handleExecuteMissionAction('APPROVE_DEPLOY')}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading === 'APPROVE_DEPLOY' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Rocket className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    )}
                    <span>🚀 Duyệt Deploy lên Web (Cổng 3)</span>
                  </button>
                )}
              </div>
            )}

            {/* Reporter & Staff Acceptance & Rework Controls */}
            {canReporterAccept && (
              <button
                type="button"
                disabled={actionLoading === 'REPORTER_ACCEPT'}
                onClick={() => handleExecuteMissionAction('REPORTER_ACCEPT')}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
              >
                {actionLoading === 'REPORTER_ACCEPT' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>🎉 Đã đúng ý (Nghiệm thu hoàn tất)</span>
              </button>
            )}

            {canRequestUpgradeOrRework && (
              <div className="pt-1">
                {!isReopenOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsReopenOpen(true)}
                    className={`w-full py-1.5 px-3 rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-transform cursor-pointer ${
                      isDark ? 'text-amber-300' : 'text-amber-700'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>🔄 Yêu cầu chỉnh sửa thêm / Nâng cấp tiếp</span>
                  </button>
                ) : (
                  <div className="space-y-2 p-2.5 rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)]">
                    <label className="text-[11px] font-semibold text-[var(--mos-text)] block">
                      Nội dung cần chỉnh thêm hoặc nâng cấp:
                    </label>
                    <textarea
                      rows={2}
                      value={reopenFeedback}
                      onChange={(e) => setReopenFeedback(e.target.value)}
                      placeholder="Nhập nội dung cần điều chỉnh thêm..."
                      className="w-full p-2 bg-[var(--background)] border border-[var(--mos-surface-border)] rounded-lg text-xs text-[var(--mos-text)] placeholder-[var(--mos-text-muted)] focus:outline-none focus:border-[var(--mos-accent)]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsReopenOpen(false);
                          setReopenFeedback('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={!reopenFeedback.trim() || actionLoading === 'REPORTER_REOPEN'}
                        onClick={() => handleExecuteMissionAction('REPORTER_REOPEN', reopenFeedback.trim())}
                        className="px-3 py-1 rounded-lg bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] text-xs font-bold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        {actionLoading === 'REPORTER_REOPEN' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        <span>Gửi yêu cầu</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2 my-2 text-[var(--mos-text-muted)] text-xs font-medium">
          <span className="h-px flex-1 bg-[var(--mos-surface-border)]" />
          <span>{threadReplies.length} phản hồi</span>
          <span className="h-px flex-1 bg-[var(--mos-surface-border)]" />
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
              id={`thread-reply-${reply.id}`}
              data-reply-id={reply.id}
              onTouchStart={(e) => handleTouchStartReply(e, reply)}
              onTouchMove={(e) => handleTouchMoveReply(e, reply.id)}
              onTouchEnd={() => handleTouchEndReply(reply)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (reply.isDeleted) return;
                setActionSheetReply(reply);
              }}
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

              {!reply.isDeleted && (
                <div className={`flex items-center gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {reply.isAiBot || reply.senderId === 'wings-ai-copilot' ? (
                    <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  ) : reply.senderId === 'mos-mission-bot' ? (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500/30 to-indigo-500/30 border border-amber-500/50 flex items-center justify-center text-[10px] shadow-sm shrink-0">
                      🚀
                    </div>
                  ) : (
                    <MosChatAvatar
                      size="xs"
                      src={reply.senderAvatar}
                      name={reply.senderName}
                      staffId={reply.senderId}
                      staffDirectory={staffDirectory}
                    />
                  )}
                  <span
                    className={`text-[11px] font-semibold ${
                      reply.isAiBot || reply.senderId === 'wings-ai-copilot'
                        ? isDark
                          ? 'text-purple-300'
                          : 'text-purple-700'
                        : isMe
                          ? isDark
                            ? 'text-amber-300'
                            : 'text-[var(--mos-text)]'
                          : 'text-[var(--mos-text)]'
                    }`}
                  >
                    {reply.senderName}
                  </span>
                  {reply.senderRole && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] font-medium uppercase border border-[var(--mos-surface-border)]">
                      {reply.senderRole}
                    </span>
                  )}
                </div>
              )}

              {reply.isDeleted ? (
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs italic break-words flex items-center gap-2 select-none ${
                    isMe
                      ? `bg-amber-500/10 border border-dashed border-amber-500/30 rounded-tr-sm self-end ${
                          isDark ? 'text-amber-300/80' : 'text-amber-800/80'
                        }`
                      : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border border-dashed border-[var(--mos-surface-border)] rounded-tl-sm self-start'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  <span>Phản hồi này đã bị xoá</span>
                  {reply.deletedByName && <span className="opacity-75">({reply.deletedByName})</span>}
                </div>
              ) : (
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm ${
                    isMe
                      ? 'mos-accent-bubble-ink bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] border border-black/10 font-normal rounded-tr-sm'
                      : 'bg-[var(--mos-surface)] text-[var(--mos-text)] border border-[var(--mos-surface-border)] rounded-tl-sm'
                  }`}
                >
                  {/* Attachments (Video, Images, Files) */}
                  {reply.attachments &&
                    reply.attachments.length > 0 &&
                    (() => {
                      const replyVideos = reply.attachments.filter(isVideoAttachment);
                      const replyImages = reply.attachments.filter(
                        (att) => isImageAttachment(att) && !isVideoAttachment(att)
                      );
                      const replyFiles = reply.attachments.filter(
                        (att) => !isImageAttachment(att) && !isVideoAttachment(att)
                      );

                      return (
                        <div className="mb-1.5 space-y-1.5">
                          {/* Inline Video Player */}
                          {replyVideos.length > 0 && (
                            <div className="space-y-1.5">
                              {replyVideos.map((att) => (
                                <MosChatVideoPlayer key={att.id} attachment={att} compact={true} isMine={isMe} />
                              ))}
                            </div>
                          )}

                          {/* Image Gallery */}
                          {replyImages.length === 1 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenGallery(replyImages[0].url, replyImages[0].id);
                              }}
                              className="rounded-xl overflow-hidden bg-black/15 cursor-pointer active:opacity-90 transition-opacity"
                            >
                              <img
                                src={resolveMediaUrl(replyImages[0].url)}
                                alt={replyImages[0].name || 'Ảnh đính kèm'}
                                className="max-h-56 w-full object-cover"
                              />
                            </div>
                          )}
                          {replyImages.length > 1 && (
                            <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                              {replyImages.slice(0, 4).map((att, idx) => {
                                const total = replyImages.length;
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

                          {/* File Attachments */}
                          {replyFiles.length > 0 && (
                            <div className="space-y-1">
                              {replyFiles.map((att) => {
                                const fullUrl = resolveMediaUrl(att.url);
                                const ext = getFileExtension(att.name || att.url).toLowerCase();
                                const isPdf = ext === 'pdf' || att.mimeType === 'application/pdf';
                                return (
                                  <div
                                    key={att.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(fullUrl, '_blank');
                                    }}
                                    className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform ${
                                      isMe
                                        ? 'bg-black/15 border-current/25 text-[var(--mos-accent-contrast)]'
                                        : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text)]'
                                    }`}
                                  >
                                    <div
                                      className={`w-7 h-7 rounded flex items-center justify-center shrink-0 font-bold text-[10px] ${
                                        isPdf
                                          ? `bg-rose-500/20 ${isDark ? 'text-rose-400' : 'text-rose-600'}`
                                          : `bg-emerald-500/20 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`
                                      }`}
                                    >
                                      {isPdf ? <FileText size={14} /> : <File size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-semibold truncate leading-tight">{att.name}</p>
                                      <span className="text-[9px] opacity-75 uppercase font-bold">{ext}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  <div className="select-text">
                    <MosChatRichText content={reply.text} isMe={isMe} isDark={isDark} />
                  </div>

                  {/* Customer Card Attachment for Reply */}
                  {!reply.isDeleted && reply.customerCard && (
                    <MosChatCustomerCardAttachment
                      card={reply.customerCard}
                      isMe={isMe}
                      onOpenCustomer={openCustomerDetail}
                    />
                  )}

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums ${
                      isMe ? 'text-[var(--mos-accent-contrast)] opacity-75' : 'text-[var(--mos-text-muted)]'
                    }`}
                  >
                    {reply.editedAt && <span className="italic mr-0.5">đã sửa</span>}
                    <span>{dayjs(reply.createdAt).format('HH:mm')}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-[var(--mos-accent-contrast)]" />}
                  </div>
                </div>
              )}

              {/* Reaction Badges for Reply */}
              {!reply.isDeleted && reply.reactions && Object.keys(reply.reactions).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1 px-1">
                  {Object.entries(reply.reactions).map(([emoji, count]) => {
                    if (count <= 0) return null;
                    const isReacted = hasUserReacted(reply, emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reactToMessage(activeThreadMsg.id, emoji, reply.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openReactionUsersSheet(
                            {
                              messageId: activeThreadMsg.id,
                              replyId: reply.id,
                              reactions: reply.reactions,
                              reactionUsers: reply.reactionUsers,
                            },
                            emoji
                          );
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium active:scale-95 transition-all shadow-sm ${
                          isReacted
                            ? `bg-amber-500/20 border border-amber-500/60 ring-1 ring-amber-500/40 font-semibold ${
                                isDark ? 'text-amber-300' : 'text-amber-800'
                              }`
                            : 'bg-[var(--mos-surface)] hover:bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text)]'
                        }`}
                        title={isReacted ? `Đã thả ${emoji} (Nhấn để gỡ / huỷ react)` : `Thả ${emoji}`}
                      >
                        <span>{emoji}</span>
                        <span
                          className={`tabular-nums text-[11px] font-semibold ${
                            isReacted ? (isDark ? 'text-amber-400' : 'text-amber-700') : 'text-[var(--mos-text-muted)]'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openReactionUsersSheet({
                        messageId: activeThreadMsg.id,
                        replyId: reply.id,
                        reactions: reply.reactions,
                        reactionUsers: reply.reactionUsers,
                      });
                    }}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mos-surface)] hover:bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-all shadow-sm"
                    title="Xem người đã thả cảm xúc"
                    aria-label="Xem người thả cảm xúc"
                  >
                    <Users className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* MAI Copilot Thinking Shimmer Pill */}
        {isAiThinking && (
          <div
            className={`flex items-center gap-2.5 p-3 my-2 rounded-2xl border text-xs animate-pulse shadow-lg ${
              isDark
                ? 'bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-950/70 border-purple-500/40 text-purple-200'
                : 'bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-purple-500/15 border-purple-500/35 text-purple-900'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <span className={`font-semibold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>MAI Copilot:</span> Đang suy nghĩ và phân tích luồng thảo
              luận...
            </div>
            <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Bottom Thread Composer with Sticker & Image Attachments */}
      <div
        style={{
          transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : 'none',
          transition: 'transform 0.15s ease-out',
          paddingBottom: keyboardOffset > 50 ? '8px' : 'max(env(safe-area-inset-bottom, 14px), 12px)',
        }}
        className="sticky bottom-0 z-30 bg-[var(--mos-surface)] backdrop-blur-md border-t border-[var(--mos-surface-border)] px-3 pt-2 shadow-lg"
      >
        {/* Sticky Action Bar for mOS Mission Gate Controls & Acceptance */}
        {hasAnyPendingAction && mission && (
          <div
            className={`mb-2 p-2 rounded-xl border shadow-md backdrop-blur-md ${
              isDark ? 'bg-purple-950/40 border-purple-800/50' : 'bg-purple-500/10 border-purple-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 px-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Rocket className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className={`text-[11px] font-bold truncate ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>
                  {mission.stageLabel || mission.humanBadge || 'Chờ duyệt'}
                </span>
              </div>
              <span className={`text-[10px] font-semibold truncate ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                #{mission.missionKey || `MSN-${mission.reportId}`}
              </span>
            </div>

            <div className="space-y-1.5">
              {isStrictDannySuperAdmin && canApproveImplementation && (
                <button
                  type="button"
                  disabled={actionLoading === 'APPROVE_IMPLEMENTATION'}
                  onClick={() => handleExecuteMissionAction('APPROVE_IMPLEMENTATION')}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/40 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading === 'APPROVE_IMPLEMENTATION' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  <span>Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)</span>
                </button>
              )}

              {isStrictDannySuperAdmin && canSuperAdminApproveCommit && (
                <button
                  type="button"
                  disabled={actionLoading === 'APPROVE_COMMIT'}
                  onClick={() => handleExecuteMissionAction('APPROVE_COMMIT')}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading === 'APPROVE_COMMIT' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  )}
                  <span>✅ Duyệt Commit (Cổng 2)</span>
                </button>
              )}

              {isStrictDannySuperAdmin && canSuperAdminApproveDeploy && (
                <button
                  type="button"
                  disabled={actionLoading === 'APPROVE_DEPLOY'}
                  onClick={() => handleExecuteMissionAction('APPROVE_DEPLOY')}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading === 'APPROVE_DEPLOY' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Rocket className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  )}
                  <span>🚀 Duyệt Deploy lên Web (Cổng 3)</span>
                </button>
              )}

              {canReporterAccept && (
                <button
                  type="button"
                  disabled={actionLoading === 'REPORTER_ACCEPT'}
                  onClick={() => handleExecuteMissionAction('REPORTER_ACCEPT')}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading === 'REPORTER_ACCEPT' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>🎉 Đã đúng ý (Nghiệm thu hoàn tất)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Autocomplete when typing @mention in subthread */}
        <MosChatMobileMentionAutocomplete
          text={text}
          onSelectMention={(nextText) => setText(nextText)}
          textareaRef={textareaRef}
        />

        {/* Quoting Preview Banner */}
        {replyingToReply && (
          <div className="flex items-center justify-between bg-[var(--mos-surface-muted)] border border-amber-500/30 rounded-xl px-3 py-1.5 mb-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <MessageSquareReply className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <div className="truncate">
                <span className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  Trả lời {replyingToReply.senderName}:
                </span>{' '}
                <span className="text-[var(--mos-text)] truncate">{replyingToReply.text}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingToReply(null)}
              className="p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]"
              aria-label="Hủy trích dẫn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attached Files, Videos & Images Preview Strip */}
        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar py-1">
            {attachedImages.map((att, idx) => {
              const isVid = isVideoAttachment(att);
              const isImg = !isVid && isImageAttachment(att);
              const ext = getFileExtension(att.name || att.url);
              const isPdf = ext.toLowerCase() === 'pdf' || att.mimeType === 'application/pdf';

              if (isVid) {
                return (
                  <div
                    key={att.id || idx}
                    className="relative w-14 h-14 rounded-xl overflow-hidden border border-purple-500/50 shrink-0 group bg-[var(--mos-surface-raised)] shadow-sm flex items-center justify-center"
                  >
                    {att.posterUrl ? (
                      <img src={att.posterUrl} alt={att.name || 'Video'} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className={`w-full h-full bg-[var(--background)] flex items-center justify-center ${
                          isDark ? 'text-purple-400' : 'text-purple-600'
                        }`}
                      >
                        <Film size={22} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center shadow">
                        <Play size={10} className="fill-white translate-x-0.5" />
                      </div>
                    </div>
                    {att.durationSec ? (
                      <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/75 text-[9px] text-white font-mono leading-tight">
                        {formatVideoDuration(att.durationSec)}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setAttachedImages((prev) => prev.filter((img) => img.id !== att.id))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] active:scale-90 shadow"
                      aria-label={`Xóa video ${idx + 1}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              }

              if (isImg) {
                return (
                  <div
                    key={att.id || idx}
                    className="relative w-14 h-14 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 bg-[var(--mos-surface-raised)] shadow-sm"
                  >
                    <img src={resolveMediaUrl(att.url)} alt={att.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAttachedImages((prev) => prev.filter((img) => img.id !== att.id))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px]"
                      aria-label="Xóa ảnh đính kèm"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={att.id || idx}
                  className="relative h-14 min-w-[120px] max-w-[170px] px-2.5 rounded-xl border border-amber-500/40 shrink-0 flex items-center gap-2 bg-[var(--mos-surface-raised)] shadow-sm"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] ${
                      isPdf
                        ? `bg-rose-500/20 border border-rose-500/30 ${isDark ? 'text-rose-400' : 'text-rose-600'}`
                        : `bg-emerald-500/20 border border-emerald-500/30 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`
                    }`}
                  >
                    {isPdf ? <FileText size={16} /> : <File size={16} />}
                  </div>
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[11px] font-semibold text-[var(--mos-text)] truncate" title={att.name}>
                      {att.name}
                    </p>
                    <span className="text-[9.5px] text-[var(--mos-text-muted)] uppercase font-extrabold">{ext}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedImages((prev) => prev.filter((img) => img.id !== att.id))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] active:scale-90 shadow"
                    aria-label={`Xóa tệp ${idx + 1}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
            {isUploadingImages && (
              <div className="w-14 h-14 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center shrink-0">
                <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className={`text-[9px] mt-0.5 font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  Tải...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Uploading Banner when no images are ready yet */}
        {isUploadingImages && attachedImages.length === 0 && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs ${
              isDark ? 'text-amber-300' : 'text-amber-800'
            }`}
          >
            <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span>Đang tải hình ảnh lên...</span>
          </div>
        )}

        {/* Staged Customer Card Preview */}
        {stagedCustomerCard && (
          <div
            data-testid="mos-chat-mobile-staged-customer-thread"
            className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-between text-xs animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                size={22}
                src={stagedCustomerCard.avatarUrl || undefined}
                className="shrink-0 font-bold text-[10px] border border-amber-400/40 select-none shadow-sm"
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                }}
              >
                {(stagedCustomerCard.name || 'KH')
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(-2)
                  .join('')
                  .toUpperCase()}
              </Avatar>
              <span className="font-bold text-[var(--mos-text)] truncate">{stagedCustomerCard.name}</span>
              <span className={`font-medium truncate ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                ({stagedCustomerCard.meta})
              </span>
              {stagedCustomerCard.cvName && (
                <span className="text-[var(--mos-text-muted)] truncate hidden sm:inline">
                  · {stagedCustomerCard.cvName}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStagedCustomerCard(null)}
              className="text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] p-1 rounded-lg hover:bg-[var(--mos-surface-muted)] active:scale-95 transition-all shrink-0"
              title="Bỏ đính kèm thẻ khách hàng"
              aria-label="Bỏ đính kèm thẻ khách hàng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Composer Input Bar */}
        <div className="flex items-end gap-2">
          {/* [+] Action Sheet Button (Tác vụ đính kèm & Tiện ích) */}
          <button
            type="button"
            onClick={() => setActionSheetOpen(true)}
            className="w-9 h-9 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] flex items-center justify-center text-[var(--mos-text)] active:scale-90 transition-transform shrink-0 mb-0.5 cursor-pointer"
            aria-label="Tác vụ đính kèm"
            title="Tác vụ đính kèm & Tiện ích"
          >
            <Plus className="w-5 h-5 text-[var(--mos-accent)]" />
          </button>

          {/* Text Area */}
          <div className="flex-1 min-w-0 min-h-[38px] max-h-[120px] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-2xl px-3 py-1.5 flex items-center gap-1.5 focus-within:border-[var(--mos-accent)] transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Trả lời trong luồng..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-sm text-[var(--mos-text)] placeholder-[var(--mos-text-muted)] resize-none max-h-[100px] py-1 leading-snug"
              style={{ outline: 'none', boxShadow: 'none' }}
            />
            {/* Quick Xuống dòng (Shift+Enter) button on mobile */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertNewline}
              className="p-1 text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-90 transition-transform shrink-0"
              aria-label="Xuống dòng (Shift+Enter)"
              title="Xuống dòng (Shift+Enter)"
            >
              <CornerDownLeft className="w-4 h-4" />
            </button>
            {/* Sticker & Emoji Button */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setStickerPickerOpen(true)}
              className="p-1 text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-90 transition-transform shrink-0"
              aria-label="Biểu cảm & Nhãn dán"
              title="Biểu cảm & Nhãn dán"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={
              (!text.trim() && attachedImages.length === 0 && !stagedCustomerCard) || isSending || isUploadingImages
            }
            className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0 mb-0.5 cursor-pointer ${
              (text.trim() || attachedImages.length > 0 || stagedCustomerCard) && !isSending && !isUploadingImages
                ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] shadow-md'
                : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border border-[var(--mos-surface-border)] opacity-40 cursor-not-allowed'
            }`}
            aria-label="Gửi phản hồi luồng"
            title="Gửi phản hồi luồng"
          >
            {isSending || isUploadingImages ? (
              <Loader2 className="w-4 h-4 text-[var(--mos-accent-contrast)] animate-spin" />
            ) : (
              <SendHorizontal
                className={`w-4 h-4 font-bold ${
                  text.trim() || attachedImages.length > 0 || stagedCustomerCard
                    ? 'text-[var(--mos-accent-contrast)]'
                    : 'text-[var(--mos-text-muted)]'
                }`}
              />
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

          <div className="relative bg-[var(--mos-surface-raised)] border-t border-[var(--mos-surface-border)] rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mb-3" />

            {/* Quick Reactions */}
            <div className="flex items-center justify-around bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-2xl py-2 px-3 mb-4 shadow-sm">
              {GOOGLE_CHAT_QUICK_EMOJIS.map((emoji) => {
                const isReacted = hasUserReacted(actionSheetReply, emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      reactToMessage(activeThreadMsg.id, emoji, actionSheetReply.id);
                      setActionSheetReply(null);
                    }}
                    className={`text-2xl p-1.5 rounded-xl active:scale-125 transition-all ${
                      isReacted ? 'bg-amber-500/25 ring-2 ring-amber-500/70 shadow-sm' : 'hover:bg-[var(--mos-surface)]'
                    }`}
                    title={isReacted ? `Đã thả ${emoji} (Nhấn để gỡ / huỷ react)` : `Thả ${emoji}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>

            {/* Actions List */}
            <div className="space-y-1 divide-y divide-[var(--mos-surface-border)]">
              {Object.values(actionSheetReply.reactions || {}).reduce((s, c) => s + c, 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const replyObj = actionSheetReply;
                    setActionSheetReply(null);
                    openReactionUsersSheet({
                      messageId: activeThreadMsg.id,
                      replyId: replyObj.id,
                      reactions: replyObj.reactions,
                      reactionUsers: replyObj.reactionUsers,
                    });
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[var(--mos-text)] bg-[var(--mos-surface-muted)] hover:opacity-90 rounded-xl transition-colors active:scale-98 border border-[var(--mos-surface-border)] mb-1"
                >
                  <div className="flex items-center gap-3">
                    <Users className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      Xem người đã thả cảm xúc
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--mos-text-muted)]">
                    <span className={`tabular-nums font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      {Object.values(actionSheetReply.reactions || {}).reduce((s, c) => s + c, 0)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--mos-text-muted)]" />
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setReplyingToReply({
                    ...actionSheetReply,
                    text: cleanQuotedText(actionSheetReply.text),
                  });
                  setActionSheetReply(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <MessageSquareReply className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className="font-medium">Trả lời trích dẫn trong luồng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const replyText = actionSheetReply.text.slice(0, 150);
                  setActionSheetReply(null);
                  onOpenTaskModal?.({
                    initialTitle: replyText,
                    sourceMsg: liveThreadMsg,
                    existingTask: linkedTask,
                    sourceReply: actionSheetReply,
                  });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <CheckSquare className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className="font-medium">
                  {linkedTask ? 'Cập nhật Main Task từ phản hồi này' : 'Giao việc cho Main Task'}
                </span>
              </button>

              {linkedTask && (
                <button
                  type="button"
                  onClick={async () => {
                    const replyText = actionSheetReply.text.slice(0, 150);
                    const replyId = actionSheetReply.id;
                    setActionSheetReply(null);
                    await updateTask(linkedTask.id, {
                      checklistAction: 'add',
                      checklistItem: { title: replyText, sourceReplyId: replyId },
                    });
                    antdMessage.success('Đã thêm phản hồi vào Checklist của Task');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
                >
                  <ListTodo className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span className="font-medium">Thêm vào Checklist của Task</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(actionSheetReply.text);
                    antdMessage.success('Đã sao chép phản hồi');
                  }
                  setActionSheetReply(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <Copy className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                <span className="font-medium">Sao chép phản hồi</span>
              </button>

              {(() => {
                const isReplyOwner = isUserMessageOwner(actionSheetReply, currentUser);
                const isDannyAccount =
                  String(currentUser?.id) === '1' ||
                  String(currentUser?.username || '').toLowerCase() === 'dannydo' ||
                  String(currentUser?.role || '')
                    .toLowerCase()
                    .includes('admin');
                const canManageReply = isReplyOwner || isDannyAccount;

                return (
                  <>
                    {canManageReply && (
                      <button
                        type="button"
                        onClick={async () => {
                          const replyToMove = actionSheetReply;
                          setActionSheetReply(null);
                          await moveThreadItem({
                            mode: 'PROMOTE_REPLY_TO_ROOT',
                            sourceMessageId: activeThreadMsg.id,
                            replyId: replyToMove.id,
                          });
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98 ${
                          isDark ? 'text-indigo-300' : 'text-indigo-700'
                        }`}
                      >
                        <CornerDownRight className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <span className="font-medium">Tách ra tin nhắn độc lập ở luồng chính</span>
                      </button>
                    )}

                    {canManageReply && onOpenMoveReply && (
                      <button
                        type="button"
                        onClick={() => {
                          const replyToMove = actionSheetReply;
                          setActionSheetReply(null);
                          onOpenMoveReply(activeThreadMsg, replyToMove.id);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98 ${
                          isDark ? 'text-amber-300' : 'text-amber-700'
                        }`}
                      >
                        <CornerDownRight className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        <span className="font-medium">Chuyển sang luồng khác...</span>
                      </button>
                    )}

                    {canManageReply && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReply(actionSheetReply);
                          setActionSheetReply(null);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-amber-500/10 rounded-xl transition-colors active:scale-98 ${
                          isDark ? 'text-amber-400' : 'text-amber-700'
                        }`}
                      >
                        <Pencil className="w-4 h-4" />
                        <span className="font-medium">Chỉnh sửa phản hồi</span>
                      </button>
                    )}

                    {canManageReply && (
                      <button
                        type="button"
                        onClick={async () => {
                          const targetReply = actionSheetReply;
                          setActionSheetReply(null);
                          try {
                            await deleteThreadReply(activeThreadMsg.id, targetReply.id);
                            antdMessage.success('Đã xoá phản hồi');
                          } catch {
                            antdMessage.error('Không thể xoá phản hồi');
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-rose-500/10 rounded-xl transition-colors active:scale-98 ${
                          isDark ? 'text-rose-400' : 'text-rose-600'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="font-medium">Xóa phản hồi</span>
                      </button>
                    )}
                  </>
                );
              })()}
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

      {/* Customer / Booking Picker Modal inside Thread */}
      <MosChatCustomerPickerModal
        open={customerPickerOpen}
        zIndex={1400}
        onClose={() => setCustomerPickerOpen(false)}
        onSelectCustomerCard={(card, sendImmediately = false) => {
          if (sendImmediately) {
            void sendThreadReply(`Đính kèm thẻ khách hàng ${card.name}:`, { customerCard: card });
            antdMessage.success(`Đã gửi thẻ khách hàng ${card.name} vào luồng`);
          } else {
            setStagedCustomerCard(card);
            antdMessage.success(`Đã đính kèm thẻ khách hàng ${card.name} vào ô phản hồi luồng`);
          }
          setCustomerPickerOpen(false);
        }}
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

      {/* Bottom Action Sheet for Subthread (Tác vụ đính kèm & Tiện ích) */}
      <MosChatMobileActionSheet
        open={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onSelectCustomer={() => setCustomerPickerOpen(true)}
        onSelectFile={() => fileInputRef.current?.click()}
        onSelectImage={() => fileInputRef.current?.click()}
        onSelectVideo={() => videoInputRef.current?.click()}
        onSelectDrive={() => {
          antdMessage.info('Mở liên kết Google Drive cho luồng');
        }}
        onSelectTask={() => {
          if (onOpenTaskModal) {
            onOpenTaskModal({ sourceMsg: liveThreadMsg, existingTask: null, isNew: true });
          } else {
            antdMessage.info('Giao việc trong luồng');
          }
        }}
        onSelectWorkflow={() => {
          antdMessage.info('Khởi tạo quy trình làm việc trong luồng');
        }}
        onSelectSticker={() => {
          setStickerPickerOpen(true);
        }}
        onSelectVoice={() => {
          antdMessage.info('Giữ nút Mic để thu âm giọng nói trong luồng');
        }}
        onSelectAiCopilot={() => {
          setText((prev) => (prev ? `${prev} @MAI ` : '@MAI '));
          textareaRef.current?.focus();
        }}
      />
    </div>
  );
};
