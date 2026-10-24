'use client';

import React, { useState, useRef } from 'react';
import { Modal, Input, Select, DatePicker, message as antdMessage } from 'antd';
import dayjs from 'dayjs';
import type { MosChatMessage, MosChatTaskPriority, SafeAny } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { MosChatMobileHeader } from './MosChatMobileHeader';
import { MosChatMobileInbox } from './MosChatMobileInbox';
import { MosChatMobileStream } from './MosChatMobileStream';
import { MosChatMobileComposer } from './MosChatMobileComposer';
import { MosChatMobileActionSheet } from './MosChatMobileActionSheet';
import { MosChatMobileReactionSheet } from './MosChatMobileReactionSheet';
import { MosChatMobileThreadSheet } from './MosChatMobileThreadSheet';
import { MosChatMobileTasksTab } from './MosChatMobileTasksTab';
import { MosChatMobileStickerSheet } from './MosChatMobileStickerSheet';
import { MosChatMobileEditModal } from './MosChatMobileEditModal';
import { MosChatMobileMediaGallery, type MosChatGalleryImage } from './MosChatMobileMediaGallery';
import { formatStickerToken, type MosChatStickerItem, type MosChatStickerPackId } from '../mos-chat-stickers';
import { DEADLINE_PRESETS, GOOGLE_CHAT_REACTION_EMOJIS, WINGS_SIGNATURE_EMOJIS } from '../constants/chat-constants';
import { apiClient } from '../../../lib/api-client';
import { uploadMultipleChatImages } from '../utils/chat-upload';
import type { MosChatImageAttachment } from '@mos-lab/shared';

export interface MosChatMobileAppProps {
  standalone?: boolean;
}

export const MosChatMobileApp: React.FC<MosChatMobileAppProps> = ({ standalone = false }) => {
  const {
    mobileView,
    setMobileView,
    activeSubtab,
    selectedMsgForAction,
    setSelectedMsgForAction,
    setActiveThreadMsg,
    createTask,
    editMessage,
    staffDirectory,
    sendMessage,
  } = useMosChat();

  const [actionSheetOpen, setActionSheetOpen] = useState<boolean>(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState<boolean>(false);
  const [stickerPickerInitialPack, setStickerPickerInitialPack] = useState<MosChatStickerPackId>('emoji');
  const [composerText, setComposerText] = useState<string>('');
  const [editingMessage, setEditingMessage] = useState<MosChatMessage | null>(null);
  const [attachedImages, setAttachedImages] = useState<MosChatImageAttachment[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);

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
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string | undefined>(undefined);
  const [taskDueAt, setTaskDueAt] = useState<string | null>(null);
  const [taskPriority, setTaskPriority] = useState<MosChatTaskPriority>('NORMAL');
  const [taskSourceMsg, setTaskSourceMsg] = useState<MosChatMessage | null>(null);

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
    const hideMsg = antdMessage.loading(`Đang tải ${count} ảnh lên...`, 0);

    try {
      const uploaded = await uploadMultipleChatImages(files);
      hideMsg();
      if (uploaded.length > 0) {
        setAttachedImages((prev) => [...prev, ...uploaded]);
        if (uploaded.length === count) {
          antdMessage.success(`Đã đính kèm ${uploaded.length} ảnh`);
        } else {
          antdMessage.warning(`Đã tải ${uploaded.length}/${count} ảnh`);
        }
      } else {
        antdMessage.error('Không thể tải ảnh lên, vui lòng thử lại');
      }
    } catch {
      hideMsg();
      antdMessage.error('Có lỗi xảy ra khi tải ảnh lên');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateTaskFromMsg = (msg: MosChatMessage) => {
    setTaskTitle(msg.text.slice(0, 100));
    setTaskSourceMsg(msg);
    setTaskModalOpen(true);
  };

  const handleConfirmCreateTask = async () => {
    const trimmed = taskTitle.trim();
    if (!trimmed) {
      antdMessage.warning('Vui lòng nhập tên công việc');
      return;
    }

    const assignee = staffDirectory.find((s) => String(s.id) === String(taskAssigneeId));

    const success = await createTask(trimmed, {
      assigneeStaffId: taskAssigneeId,
      assigneeName: assignee?.username || 'Staff',
      dueAt: taskDueAt,
      priority: taskPriority,
      sourceMessageId: taskSourceMsg?.id,
    });

    if (success) {
      antdMessage.success('Đã tạo và giao việc thành công');
      setTaskModalOpen(false);
      setTaskTitle('');
      setTaskAssigneeId(undefined);
      setTaskDueAt(null);
      setTaskSourceMsg(null);
    } else {
      antdMessage.error('Không thể tạo việc, vui lòng thử lại');
    }
  };

  const handleSelectSticker = (sticker: MosChatStickerItem) => {
    sendMessage(formatStickerToken(sticker.id));
    setStickerPickerOpen(false);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex flex-col bg-slate-950 text-slate-100 overflow-hidden ${
        standalone ? 'h-[100dvh] w-screen fixed inset-0 z-50' : 'h-full w-full'
      }`}
    >
      {/* Hidden file input supporting multiple images & iPhone HEIC/HEIF */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif,.HEIC,.HEIF"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải nhiều ảnh đính kèm"
      />

      {/* Top Header */}
      <MosChatMobileHeader />

      {/* Dynamic Screen View */}
      {mobileView === 'inbox' && <MosChatMobileInbox />}

      {mobileView === 'room' && (
        <>
          {activeSubtab === 'chat' ? (
            <>
              <MosChatMobileStream
                onOpenThread={(msg) => {
                  setActiveThreadMsg(msg);
                  setMobileView('thread');
                }}
                onOpenGallery={handleOpenStreamGallery}
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
          ) : (
            <MosChatMobileTasksTab
              onOpenCreateTaskModal={() => {
                setTaskTitle('');
                setTaskSourceMsg(null);
                setTaskModalOpen(true);
              }}
            />
          )}
        </>
      )}

      {mobileView === 'thread' && <MosChatMobileThreadSheet />}

      {/* Bottom Action Sheet */}
      <MosChatMobileActionSheet
        open={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onSelectImage={() => fileInputRef.current?.click()}
        onSelectDrive={() => antdMessage.info('Mở liên kết Google Drive')}
        onSelectTask={() => {
          setTaskTitle('');
          setTaskSourceMsg(null);
          setTaskModalOpen(true);
        }}
        onSelectWorkflow={() => antdMessage.info('Kích hoạt quy trình làm việc')}
        onSelectSticker={() => {
          setStickerPickerInitialPack('wings');
          setStickerPickerOpen(true);
        }}
        onSelectVoice={() => antdMessage.info('Giữ nút Mic để thu âm giọng nói')}
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

      {/* Create Task Modal */}
      <Modal
        open={taskModalOpen}
        zIndex={2500}
        onCancel={() => setTaskModalOpen(false)}
        onOk={handleConfirmCreateTask}
        title="Giao việc & Hạn chót"
        okText="Tạo công việc"
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
              placeholder="Chọn người được giao"
              value={taskAssigneeId}
              onChange={(val) => setTaskAssigneeId(val)}
              allowClear
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={staffDirectory.map((s) => ({
                value: String(s.id),
                label: `${s.username} (${s.role || 'Staff'})`,
              }))}
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
    </div>
  );
};
