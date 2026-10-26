'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Modal, Input, Select, DatePicker, message as antdMessage } from 'antd';
import dayjs from 'dayjs';
import type {
  MosChatMessage,
  MosChatTaskItem,
  MosChatTaskPriority,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { MosChatMobileHeader } from './MosChatMobileHeader';
import { MosChatMobileInbox } from './MosChatMobileInbox';
import { MosChatMobileStream } from './MosChatMobileStream';
import { MosChatMobileComposer } from './MosChatMobileComposer';
import { MosChatMobileActionSheet } from './MosChatMobileActionSheet';
import { MosChatMobileReactionSheet } from './MosChatMobileReactionSheet';
import { MosChatMobileThreadSheet } from './MosChatMobileThreadSheet';
import { MosChatMobileTasksTab } from './MosChatMobileTasksTab';
import { MosChatMobilePinnedTab } from './MosChatMobilePinnedTab';
import { MosChatMobileTaskDetailSheet } from './MosChatMobileTaskDetailSheet';
import { MosChatMobileEditTaskModal } from './MosChatMobileEditTaskModal';
import { MosChatMobileNegotiateTaskModal } from './MosChatMobileNegotiateTaskModal';
import { MosChatMobileMissionModal } from './MosChatMobileMissionModal';
import { MosChatMobileStickerSheet } from './MosChatMobileStickerSheet';
import { MosChatMobileEditModal } from './MosChatMobileEditModal';
import { MosChatMobileMoveThreadModal } from './MosChatMobileMoveThreadModal';
import { MosChatMobileMediaGallery, type MosChatGalleryImage } from './MosChatMobileMediaGallery';
import { MosChatSpaceConfigModal } from '../MosChatSpaceConfigModal';
import { MosChatSpaceMembersModal } from '../MosChatSpaceMembersModal';
import { formatStickerToken, type MosChatStickerItem, type MosChatStickerPackId } from '../mos-chat-stickers';
import {
  AI_COPILOT_CONV_ID,
  DEADLINE_PRESETS,
  GOOGLE_CHAT_REACTION_EMOJIS,
  WINGS_SIGNATURE_EMOJIS,
} from '../constants/chat-constants';
import { apiClient } from '../../../lib/api-client';
import { uploadMultipleChatImages } from '../utils/chat-upload';
import type { MosChatImageAttachment } from '@mos-lab/shared';

export interface MosChatMobileAppProps {
  standalone?: boolean;
}

export const MosChatMobileApp: React.FC<MosChatMobileAppProps> = ({ standalone = false }) => {
  const {
    currentUser,
    activeConversation,
    conversations,
    messages,
    mobileView,
    setMobileView,
    activeSubtab,
    setActiveSubtab,
    selectedMsgForAction,
    setSelectedMsgForAction,
    activeThreadMsg,
    setActiveThreadMsg,
    setActiveConvId,
    tasks,
    createTask,
    updateTask,
    dispatchMissionFromTask,
    editMessage,
    staffDirectory,
    sendMessage,
    sendThreadReply,
    updateSpaceConfig,
  } = useMosChat();

  const [spaceConfigModalOpen, setSpaceConfigModalOpen] = useState<boolean>(false);
  const [spaceMembersModalOpen, setSpaceMembersModalOpen] = useState<boolean>(false);
  const [actionSheetOpen, setActionSheetOpen] = useState<boolean>(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState<boolean>(false);
  const [stickerPickerInitialPack, setStickerPickerInitialPack] = useState<MosChatStickerPackId>('emoji');
  const [composerText, setComposerText] = useState<string>('');
  const [editingMessage, setEditingMessage] = useState<MosChatMessage | null>(null);
  const [movingMsgForThread, setMovingMsgForThread] = useState<MosChatMessage | null>(null);
  const [movingReplyForThread, setMovingReplyForThread] = useState<{
    parentMsg: MosChatMessage;
    replyId: string;
  } | null>(null);
  const [attachedImages, setAttachedImages] = useState<MosChatImageAttachment[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);

  const prevMsgForMoving = useMemo(() => {
    if (!movingMsgForThread) return null;
    const idx = messages.findIndex((m) => m.id === movingMsgForThread.id);
    if (idx > 0) return messages[idx - 1];
    return null;
  }, [messages, movingMsgForThread]);

  // Task Detail Bottom Sheet & Modals state
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [negotiatingTaskId, setNegotiatingTaskId] = useState<string | null>(null);
  const [missionTaskId, setMissionTaskId] = useState<string | null>(null);

  const selectedDetailTask = useMemo(
    () => tasks.find((t) => t.id === selectedDetailTaskId) || null,
    [tasks, selectedDetailTaskId]
  );
  const editingTask = useMemo(() => tasks.find((t) => t.id === editingTaskId) || null, [tasks, editingTaskId]);
  const negotiatingTask = useMemo(
    () => tasks.find((t) => t.id === negotiatingTaskId) || null,
    [tasks, negotiatingTaskId]
  );
  const missionTask = useMemo(() => tasks.find((t) => t.id === missionTaskId) || null, [tasks, missionTaskId]);

  // Stream Media Gallery Lightbox state
  const [streamGallery, setStreamGallery] = useState<{
    open: boolean;
    images: MosChatGalleryImage[];
    initialIndex: number;
  }>({
    open: false,
    images: [],
    initialIndex: 0,
  });

  const handleOpenStreamGallery = (msg: MosChatMessage, attIdx: number) => {
    const list: MosChatGalleryImage[] = [];
    (msg.attachments || []).forEach((att, idx) => {
      list.push({
        id: att.id || `msg-${msg.id}-att-${idx}`,
        url: att.url,
        name: att.name,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        createdAt: msg.createdAt,
      });
    });
    (msg.thread || []).forEach((reply) => {
      (reply.attachments || []).forEach((att, idx) => {
        list.push({
          id: att.id || `reply-${reply.id}-att-${idx}`,
          url: att.url,
          name: att.name,
          senderName: reply.senderName,
          senderRole: reply.senderRole,
          createdAt: reply.createdAt,
        });
      });
    });
    setStreamGallery({
      open: true,
      images: list,
      initialIndex: attIdx,
    });
  };

  // Quick Task Creation Modal
  const [taskModalOpen, setTaskModalOpen] = useState<boolean>(false);
  const [editingTaskForModal, setEditingTaskForModal] = useState<MosChatTaskItem | null>(null);
  const [taskThreadContext, setTaskThreadContext] = useState<{
    inThread: boolean;
    sourceReply?: MosChatThreadReply | null;
  } | null>(null);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string | undefined>(undefined);
  const [taskDueAt, setTaskDueAt] = useState<string | null>(null);
  const [taskPriority, setTaskPriority] = useState<MosChatTaskPriority>('NORMAL');
  const [taskSourceMsg, setTaskSourceMsg] = useState<MosChatMessage | null>(null);

  // Match current user in staff directory
  const currentStaff = useMemo(() => {
    if (!currentUser) return undefined;
    const cid = Number(currentUser.id);
    const cUser = String(currentUser.username || '').toLowerCase();
    const cName = String(currentUser.fullName || currentUser.name || currentUser.displayName || '').toLowerCase();
    return staffDirectory.find(
      (s) =>
        (cid > 0 && Number(s.id) === cid) ||
        (cUser && String(s.username || '').toLowerCase() === cUser) ||
        (cName && String(s.displayName || '').toLowerCase() === cName)
    );
  }, [currentUser, staffDirectory]);

  // Options for task assignee select
  const assigneeOptions = useMemo(() => {
    const list = [...staffDirectory];
    const myId = currentStaff?.id || Number(currentUser?.id) || 0;
    const myName =
      currentStaff?.displayName ||
      currentStaff?.username ||
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.name ||
      'Danny Do';

    const hasMeInList = myId > 0 && list.some((s) => s.id === myId);

    list.sort((a, b) => {
      if (a.id === myId) return -1;
      if (b.id === myId) return 1;
      const nameA = a.displayName || a.username || '';
      const nameB = b.displayName || b.username || '';
      return nameA.localeCompare(nameB, 'vi');
    });

    const opts = list.map((s) => {
      const isMe = s.id === myId;
      const roleStr = s.role ? ` (${s.role})` : '';
      const name = s.displayName || s.username;
      const emailHint = s.username && s.displayName && s.username !== s.displayName ? ` · ${s.username}` : '';
      return {
        value: String(s.id),
        label: isMe ? `⭐ Chính tôi (${name})` : `${name}${emailHint}${roleStr}`,
      };
    });

    if (!hasMeInList && myId > 0) {
      opts.unshift({
        value: String(myId),
        label: `⭐ Chính tôi (${myName})`,
      });
    }

    return opts;
  }, [staffDirectory, currentStaff, currentUser]);

  // Hidden file input for image uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edge Swipe-to-Back gesture (iOS Safari style)
  const edgeTouchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    edgeTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - edgeTouchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - edgeTouchStartRef.current.y;

    // If swipe started from left edge (< 30px) and moved right > 70px with minimal vertical move
    if (edgeTouchStartRef.current.x < 30 && deltaX > 70 && Math.abs(deltaY) < 50) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      if (mobileView === 'thread') {
        setMobileView('room');
      } else if (mobileView === 'room') {
        setMobileView('inbox');
      }
    }
  };

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
          antdMessage.success(`Đã đính kèm ${uploaded.length} tệp`);
        } else {
          antdMessage.warning(`Đã tải ${uploaded.length}/${count} tệp`);
        }
      } else {
        antdMessage.error('Không thể tải tệp lên, vui lòng thử lại');
      }
    } catch {
      hideMsg();
      antdMessage.error('Có lỗi xảy ra khi tải ảnh lên');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCreateTaskModal = (initialTitle = '', sourceMsg: MosChatMessage | null = null) => {
    setEditingTaskForModal(null);
    setTaskThreadContext(null);
    setTaskTitle(initialTitle);
    setTaskSourceMsg(sourceMsg);

    const myId = currentStaff?.id || Number(currentUser?.id) || 0;
    let initialAssigneeId: string | undefined = undefined;

    if (activeConversation?.isSelf) {
      initialAssigneeId = myId > 0 ? String(myId) : undefined;
    } else if (activeConversation?.type === 'dm') {
      const peerId = activeConversation.memberIds?.find((id: SafeAny) => Number(id) !== myId);
      initialAssigneeId = peerId ? String(peerId) : myId > 0 ? String(myId) : undefined;
    } else {
      initialAssigneeId = myId > 0 ? String(myId) : undefined;
    }

    setTaskAssigneeId(initialAssigneeId);
    setTaskDueAt(null);
    setTaskPriority('NORMAL');
    setTaskModalOpen(true);
  };

  const openTaskModalForThread = (params?: {
    initialTitle?: string;
    sourceMsg?: MosChatMessage | null;
    existingTask?: MosChatTaskItem | null;
    sourceReply?: MosChatThreadReply | null;
  }) => {
    const sourceMsg = params?.sourceMsg || activeThreadMsg || null;
    const existing =
      params?.existingTask ||
      (sourceMsg
        ? tasks.find((t) => t.sourceMessageId === sourceMsg.id || (sourceMsg.taskId && t.id === sourceMsg.taskId)) ||
          null
        : null);

    setEditingTaskForModal(existing);
    setTaskSourceMsg(sourceMsg);
    setTaskThreadContext({
      inThread: true,
      sourceReply: params?.sourceReply || null,
    });

    if (existing) {
      setTaskTitle(params?.initialTitle || existing.title);
      setTaskAssigneeId(existing.assigneeId ? String(existing.assigneeId) : undefined);
      setTaskDueAt(existing.dueAt || existing.deadline || null);
      setTaskPriority(existing.priority || 'NORMAL');
    } else {
      setTaskTitle(params?.initialTitle || sourceMsg?.text.slice(0, 100) || '');
      const myId = currentStaff?.id || Number(currentUser?.id) || 0;
      let initialAssigneeId: string | undefined = undefined;

      if (activeConversation?.isSelf) {
        initialAssigneeId = myId > 0 ? String(myId) : undefined;
      } else if (activeConversation?.type === 'dm') {
        const peerId = activeConversation.memberIds?.find((id: SafeAny) => Number(id) !== myId);
        initialAssigneeId = peerId ? String(peerId) : myId > 0 ? String(myId) : undefined;
      } else {
        initialAssigneeId = myId > 0 ? String(myId) : undefined;
      }

      setTaskAssigneeId(initialAssigneeId);
      setTaskDueAt(null);
      setTaskPriority('NORMAL');
    }

    setTaskModalOpen(true);
  };

  const handleCreateTaskFromMsg = (msg: MosChatMessage) => {
    openCreateTaskModal(msg.text.slice(0, 100), msg);
  };

  const handleConfirmCreateTask = async () => {
    const trimmed = taskTitle.trim();
    if (!trimmed) {
      antdMessage.warning('Vui lòng nhập tên công việc');
      return;
    }

    const myId = currentStaff?.id || Number(currentUser?.id) || 0;
    const resolvedId = taskAssigneeId || (myId > 0 ? String(myId) : undefined);
    const assignee = staffDirectory.find((s) => String(s.id) === String(resolvedId)) || currentStaff;

    const resolvedAssigneeId = assignee ? String(assignee.id) : resolvedId;
    const resolvedAssigneeName =
      assignee?.displayName ||
      assignee?.username ||
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.name ||
      'Danny Do';

    const isThreadContext = taskThreadContext?.inThread && activeThreadMsg;

    if (editingTaskForModal) {
      const success = await updateTask(editingTaskForModal.id, {
        title: trimmed,
        assigneeId: resolvedAssigneeId,
        assigneeName: resolvedAssigneeName,
        dueAt: taskDueAt,
        deadline: taskDueAt,
        priority: taskPriority,
      });

      if (success) {
        antdMessage.success(`Đã cập nhật Main Task cho ${resolvedAssigneeName}`);

        if (isThreadContext) {
          const dueFormatted = taskDueAt ? dayjs(taskDueAt).format('HH:mm DD/MM') : 'Không có';
          await sendThreadReply(
            `📌 Đã cập nhật Main Task: "${trimmed}" · Người nhận: @${resolvedAssigneeName} · Hạn chót: ${dueFormatted}`
          );
        }

        setTaskModalOpen(false);
        setEditingTaskForModal(null);
        setTaskThreadContext(null);
        setTaskTitle('');
        setTaskAssigneeId(undefined);
        setTaskDueAt(null);
        setTaskSourceMsg(null);
      } else {
        antdMessage.error('Không thể cập nhật công việc, vui lòng thử lại');
      }
    } else {
      const success = await createTask(trimmed, {
        assigneeStaffId: resolvedAssigneeId,
        assigneeName: resolvedAssigneeName,
        dueAt: taskDueAt,
        priority: taskPriority,
        sourceMessageId: taskSourceMsg?.id,
      });

      if (success) {
        const isSelf = String(resolvedAssigneeId) === String(myId);
        antdMessage.success(
          isSelf
            ? `Đã tạo việc cho chính mình (${resolvedAssigneeName})`
            : `Đã giao việc thành công cho ${resolvedAssigneeName}`
        );

        if (isThreadContext) {
          const dueFormatted = taskDueAt ? dayjs(taskDueAt).format('HH:mm DD/MM') : 'Không có';
          await sendThreadReply(
            `📌 Đã giao việc cho Main Task: "${trimmed}" · Người nhận: @${resolvedAssigneeName} · Hạn chót: ${dueFormatted}`
          );
        }

        setTaskModalOpen(false);
        setEditingTaskForModal(null);
        setTaskThreadContext(null);
        setTaskTitle('');
        setTaskAssigneeId(undefined);
        setTaskDueAt(null);
        setTaskSourceMsg(null);
      } else {
        antdMessage.error('Không thể tạo việc, vui lòng thử lại');
      }
    }
  };

  const handleSelectSticker = (sticker: MosChatStickerItem) => {
    sendMessage(formatStickerToken(sticker.id));
    setStickerPickerOpen(false);
  };

  const handleSaveEditedTask = async (
    taskId: string,
    updates: {
      title: string;
      assigneeId?: string;
      assigneeName?: string;
      dueAt?: string | null;
      priority: MosChatTaskPriority;
    }
  ) => {
    const success = await updateTask(taskId, updates);
    if (success) {
      antdMessage.success('Đã lưu thay đổi công việc');
    } else {
      antdMessage.error('Không thể lưu thay đổi công việc');
    }
  };

  const handleSubmitNegotiation = async (task: MosChatTaskItem, proposedDeadline: string, reason: string) => {
    const myName =
      currentUser?.displayName || currentUser?.fullName || currentUser?.name || currentUser?.username || 'Danny Do';
    const nowIso = new Date().toISOString();

    const success = await updateTask(task.id, {
      negotiatedDeadline: proposedDeadline,
      negotiationNote: reason,
      negotiatedBy: myName,
      negotiatedAt: nowIso,
    });
    if (success) {
      antdMessage.success('Đã gửi đề xuất thương lượng dời hạn chót thành công!');
    } else {
      antdMessage.error('Không thể gửi đề xuất thương lượng dời hạn');
    }
  };

  const handleSubmitMission = async (
    task: MosChatTaskItem,
    missionData: { title: string; type: 'BUG' | 'FEATURE'; note: string }
  ) => {
    try {
      const mission = await dispatchMissionFromTask(task, missionData);
      if (mission) {
        antdMessage.success(`🚀 Đã chuyển vào mOS Mission #${mission.missionKey} thành công!`);
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể chuyển vào mOS Mission');
    }
  };

  const handleGoToSourceMessage = (task: MosChatTaskItem) => {
    if (!task.sourceMessageId) return;
    if (task.conversationId && task.conversationId !== activeConversation?.id) {
      setActiveConvId(task.conversationId);
    }
    const targetConv = conversations.find((c) => c.id === task.conversationId) || activeConversation;
    const msg = targetConv?.messages?.find((m) => m.id === task.sourceMessageId);
    if (msg) {
      setActiveThreadMsg(msg);
      setMobileView('thread');
    } else {
      setMobileView('room');
    }
    setSelectedDetailTaskId(null);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex flex-col bg-slate-950 text-slate-100 overflow-hidden ${
        standalone ? 'h-[100dvh] w-screen fixed inset-0 z-50' : 'h-full w-full'
      }`}
    >
      {/* Hidden file input supporting multiple files, images & documents */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif,.HEIC,.HEIF,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải nhiều ảnh đính kèm"
      />

      {/* Top Header */}
      <MosChatMobileHeader
        onOpenSettings={() => setSpaceConfigModalOpen(true)}
        onOpenMembersModal={() => setSpaceMembersModalOpen(true)}
        onOpenTaskModal={() => openTaskModalForThread()}
      />

      {/* Dynamic Screen View */}
      {mobileView === 'inbox' && <MosChatMobileInbox />}

      {mobileView === 'room' && (
        <>
          {activeSubtab === 'chat' && (
            <>
              <MosChatMobileStream
                onOpenThread={(msg) => {
                  setActiveThreadMsg(msg);
                  setMobileView('thread');
                }}
                onOpenGallery={handleOpenStreamGallery}
                onOpenPinnedTab={() => setActiveSubtab('pinned')}
              />
              <MosChatMobileComposer
                onOpenActionSheet={() => setActionSheetOpen(true)}
                onOpenStickerSheet={(pack = 'emoji') => {
                  setStickerPickerInitialPack(pack);
                  setStickerPickerOpen(true);
                }}
                onSelectImage={() => fileInputRef.current?.click()}
                attachedImages={attachedImages}
                onRemoveAttachment={(id) => setAttachedImages((prev) => prev.filter((img) => img.id !== id))}
                isUploadingImages={isUploadingImages}
                onSendSuccess={() => setAttachedImages([])}
                text={composerText}
                onTextChange={setComposerText}
              />
            </>
          )}

          {activeSubtab === 'tasks' && (
            <MosChatMobileTasksTab
              onOpenCreateTaskModal={() => {
                openCreateTaskModal();
              }}
              onSelectTask={(task) => {
                setSelectedDetailTaskId(task.id);
              }}
            />
          )}

          {activeSubtab === 'pinned' && (
            <MosChatMobilePinnedTab
              onGoToMessage={(msg) => {
                setActiveSubtab('chat');
                setTimeout(() => {
                  const el = document.getElementById(`mos-chat-msg-${msg.id}`);
                  if (el && typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-500/10');
                    setTimeout(() => {
                      el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-500/10');
                    }, 2500);
                  }
                }, 150);
              }}
              onBackToChat={() => setActiveSubtab('chat')}
            />
          )}
        </>
      )}

      {mobileView === 'thread' && (
        <MosChatMobileThreadSheet
          onOpenTaskModal={openTaskModalForThread}
          onOpenMoveReply={(sourceMsg, replyId) => setMovingReplyForThread({ parentMsg: sourceMsg, replyId })}
        />
      )}

      {/* Bottom Action Sheet */}
      <MosChatMobileActionSheet
        open={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onSelectFile={() => fileInputRef.current?.click()}
        onSelectImage={() => fileInputRef.current?.click()}
        onSelectDrive={() => antdMessage.info('Mở liên kết Google Drive')}
        onSelectTask={() => {
          openCreateTaskModal();
        }}
        onSelectWorkflow={() => antdMessage.info('Kích hoạt quy trình làm việc')}
        onSelectSticker={() => {
          setStickerPickerInitialPack('wings');
          setStickerPickerOpen(true);
        }}
        onSelectVoice={() => antdMessage.info('Giữ nút Mic để thu âm giọng nói')}
        onSelectAiCopilot={() => {
          setActiveConvId(AI_COPILOT_CONV_ID);
          setMobileView('room');
          setActiveSubtab('chat');
        }}
      />

      {/* Long-press Reaction & Action Sheet */}
      <MosChatMobileReactionSheet
        message={selectedMsgForAction}
        onClose={() => setSelectedMsgForAction(null)}
        onOpenThread={(msg) => {
          setActiveThreadMsg(msg);
          setMobileView('thread');
        }}
        onCreateTaskFromMsg={handleCreateTaskFromMsg}
        onEditMessage={(msg) => setEditingMessage(msg)}
        onOpenMoveThread={(msg) => setMovingMsgForThread(msg)}
      />

      {/* Move / Merge to Thread Modals */}
      <MosChatMobileMoveThreadModal
        open={movingMsgForThread !== null}
        sourceMessage={movingMsgForThread}
        prevMessage={prevMsgForMoving}
        onClose={() => setMovingMsgForThread(null)}
      />

      <MosChatMobileMoveThreadModal
        open={movingReplyForThread !== null}
        sourceMessage={movingReplyForThread?.parentMsg || null}
        replyId={movingReplyForThread?.replyId}
        onClose={() => setMovingReplyForThread(null)}
      />

      {/* Edit Message Modal */}
      <MosChatMobileEditModal
        open={editingMessage !== null}
        initialText={editingMessage?.text || ''}
        title="Chỉnh sửa tin nhắn"
        onClose={() => setEditingMessage(null)}
        onSave={async (newText) => {
          if (!editingMessage) return;
          await editMessage(editingMessage.id, newText);
          antdMessage.success('Đã lưu chỉnh sửa tin nhắn');
        }}
      />

      {/* Sticker & Emoji Bottom Sheet */}
      <MosChatMobileStickerSheet
        open={stickerPickerOpen}
        onClose={() => setStickerPickerOpen(false)}
        initialPack={stickerPickerInitialPack}
        onSelectSticker={handleSelectSticker}
        onSelectEmoji={(emoji) => {
          setComposerText((prev) => `${prev}${emoji}`);
        }}
        currentText={composerText}
        onSend={() => {
          const trimmed = composerText.trim();
          if (trimmed) {
            sendMessage(trimmed);
            setComposerText('');
          }
        }}
      />

      {/* Create / Edit Task Modal */}
      <Modal
        open={taskModalOpen}
        zIndex={2500}
        onCancel={() => {
          setTaskModalOpen(false);
          setEditingTaskForModal(null);
          setTaskThreadContext(null);
        }}
        onOk={handleConfirmCreateTask}
        title={
          editingTaskForModal
            ? 'Cập nhật Main Task'
            : taskThreadContext?.inThread
              ? 'Giao việc cho Main Task'
              : 'Giao việc & Hạn chót'
        }
        okText={editingTaskForModal ? 'Lưu thay đổi' : 'Tạo công việc'}
        cancelText="Hủy"
        centered
      >
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nội dung công việc *</label>
            <Input.TextArea
              rows={3}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Nhập chi tiết công việc cần giao..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Người thực hiện</label>
            <Select
              className="w-full"
              placeholder="Chọn người được giao (Mặc định: Chính tôi)"
              value={taskAssigneeId}
              onChange={(val) => setTaskAssigneeId(val)}
              allowClear
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={assigneeOptions}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Thời hạn hoàn thành (Deadline)</label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {DEADLINE_PRESETS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const d = p.getDate();
                    setTaskDueAt(d ? d.toISOString() : null);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <DatePicker
              showTime
              format="HH:mm DD/MM/YYYY"
              className="w-full"
              value={taskDueAt ? dayjs(taskDueAt) : null}
              onChange={(d) => setTaskDueAt(d ? d.toISOString() : null)}
              placeholder="Hoặc chọn ngày giờ cụ thể"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Mức độ ưu tiên</label>
            <Select
              className="w-full"
              value={taskPriority}
              onChange={(val) => setTaskPriority(val)}
              options={[
                { value: 'NORMAL', label: 'Bình thường' },
                { value: 'HIGH', label: 'Ưu tiên cao' },
                { value: 'URGENT', label: 'Khẩn cấp' },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Stream Image Media Gallery Modal */}
      <MosChatMobileMediaGallery
        open={streamGallery.open}
        images={streamGallery.images}
        initialIndex={streamGallery.initialIndex}
        onClose={() => setStreamGallery((prev) => ({ ...prev, open: false }))}
      />

      {/* Task Detail Bottom Sheet (iOS Style) */}
      <MosChatMobileTaskDetailSheet
        task={selectedDetailTask}
        open={selectedDetailTask !== null}
        onClose={() => setSelectedDetailTaskId(null)}
        onEditTask={(task) => setEditingTaskId(task.id)}
        onNegotiateDeadline={(task) => setNegotiatingTaskId(task.id)}
        onDispatchMission={(task) => setMissionTaskId(task.id)}
        onGoToSourceMessage={handleGoToSourceMessage}
      />

      {/* Edit Task Modal */}
      <MosChatMobileEditTaskModal
        task={editingTask}
        open={editingTask !== null}
        onClose={() => setEditingTaskId(null)}
        onSave={handleSaveEditedTask}
      />

      {/* Negotiate Task Deadline Modal */}
      <MosChatMobileNegotiateTaskModal
        task={negotiatingTask}
        open={negotiatingTask !== null}
        onClose={() => setNegotiatingTaskId(null)}
        onSubmit={handleSubmitNegotiation}
      />

      {/* Dispatch to mOS Mission Modal */}
      <MosChatMobileMissionModal
        task={missionTask}
        open={missionTask !== null}
        onClose={() => setMissionTaskId(null)}
        onSubmit={handleSubmitMission}
      />

      {/* Space Configuration & Emoji Selection Modal */}
      <MosChatSpaceConfigModal
        open={spaceConfigModalOpen}
        conversation={activeConversation}
        onClose={() => setSpaceConfigModalOpen(false)}
        onOpenMembersModal={() => setSpaceMembersModalOpen(true)}
        onUpdated={(updated) => {
          if (updateSpaceConfig && activeConversation) {
            void updateSpaceConfig(activeConversation.id, {
              name: updated.name,
              subtitle: updated.subtitle,
              avatar: updated.avatar,
              color: updated.color,
            });
          }
        }}
      />

      {/* Space Members & Management Modal */}
      <MosChatSpaceMembersModal
        open={spaceMembersModalOpen}
        conversation={activeConversation}
        onClose={() => setSpaceMembersModalOpen(false)}
      />
    </div>
  );
};
