'use client';

import React from 'react';
import {
  CheckSquare,
  ChevronRight,
  Copy,
  CornerDownRight,
  Forward,
  ListTodo,
  MessageSquareReply,
  Pencil,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { message as antdMessage } from 'antd';
import type {
  MosChatConversation,
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  UpdateMosChatTaskRequest,
  SafeAny,
} from '@mos-lab/shared';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../constants/chat-constants';
import { type MosChatStickerItem } from '../mos-chat-stickers';
import { cleanQuotedText } from '../utils/quoteUtils';
import { isUserMessageOwner } from '../utils/chat-helpers';
import { MosChatMobileStickerSheet } from './MosChatMobileStickerSheet';
import { MosChatMobileActionSheet } from './MosChatMobileActionSheet';
import { MosChatMobileEditModal } from './MosChatMobileEditModal';
import { MosChatMobileMediaGallery, type MosChatGalleryImage } from './MosChatMobileMediaGallery';
import { MosChatCustomerPickerModal } from '../MosChatCustomerPickerModal';
import { MosChatRichEditorModal } from '../MosChatRichEditorModal';

export interface MosChatMobileThreadOverlaysProps {
  isDark: boolean;
  activeThreadMsg: MosChatMessage;
  liveThreadMsg: MosChatMessage | null;
  linkedTask: MosChatTaskItem | null;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  actionSheetReply: MosChatThreadReply | null;
  setActionSheetReply: React.Dispatch<React.SetStateAction<MosChatThreadReply | null>>;
  editingReply: MosChatThreadReply | null;
  setEditingReply: React.Dispatch<React.SetStateAction<MosChatThreadReply | null>>;
  setReplyingToReply: React.Dispatch<React.SetStateAction<MosChatThreadReply | null>>;
  galleryOpen: boolean;
  setGalleryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  threadGalleryImages: MosChatGalleryImage[];
  galleryInitialIndex: number;
  customerPickerOpen: boolean;
  setCustomerPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  stickerPickerOpen: boolean;
  setStickerPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  actionSheetOpen: boolean;
  setActionSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  ckEditorOpen: boolean;
  setCkEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  attachedImages: MosChatImageAttachment[];
  setAttachedImages: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  stagedCustomerCard: MosChatCustomerCard | null;
  setStagedCustomerCard: React.Dispatch<React.SetStateAction<MosChatCustomerCard | null>>;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  hasUserReacted: (msg: SafeAny, emoji: string) => boolean;
  reactToMessage: (messageId: string, emoji: string, replyId?: string) => void | Promise<void>;
  getThreadReplyReadBreakdown?: (
    msg: MosChatMessage,
    reply: MosChatThreadReply
  ) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  openSeenUsersSheetForReply?: (msg: MosChatMessage, reply: MosChatThreadReply) => void;
  openReactionUsersSheet: (target: SafeAny, initialEmoji?: string) => void;
  updateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => SafeAny;
  onOpenTaskModal?: (params?: {
    initialTitle?: string;
    sourceMsg?: MosChatMessage | null;
    existingTask?: MosChatTaskItem | null;
    sourceReply?: MosChatThreadReply | null;
    isNew?: boolean;
  }) => void;
  onForwardMessage?: (sourceMsg: MosChatMessage, reply?: MosChatThreadReply | null) => void;
  onOpenMoveReply?: (sourceMsg: MosChatMessage, replyId: string) => void;
  moveThreadItem: (payload: SafeAny) => Promise<boolean>;
  deleteThreadReply: (messageId: string, replyId: string) => Promise<void>;
  editMessage: (messageId: string, text: string, opts?: { replyId?: string }) => Promise<void>;
  sendThreadReply: (
    text: string,
    opts?: {
      attachments?: MosChatImageAttachment[];
      customerCard?: MosChatCustomerCard;
    }
  ) => Promise<boolean>;
  handleSelectSticker: (sticker: MosChatStickerItem) => Promise<void>;
  handleSend: () => Promise<void>;
}

export const MosChatMobileThreadOverlays: React.FC<MosChatMobileThreadOverlaysProps> = ({
  isDark,
  activeThreadMsg,
  liveThreadMsg,
  linkedTask,
  activeConversation,
  currentUser,
  actionSheetReply,
  setActionSheetReply,
  editingReply,
  setEditingReply,
  setReplyingToReply,
  galleryOpen,
  setGalleryOpen,
  threadGalleryImages,
  galleryInitialIndex,
  customerPickerOpen,
  setCustomerPickerOpen,
  stickerPickerOpen,
  setStickerPickerOpen,
  actionSheetOpen,
  setActionSheetOpen,
  ckEditorOpen,
  setCkEditorOpen,
  text,
  setText,
  attachedImages,
  setAttachedImages,
  stagedCustomerCard,
  setStagedCustomerCard,
  setIsSending,
  fileInputRef,
  videoInputRef,
  textareaRef,
  hasUserReacted,
  reactToMessage,
  getThreadReplyReadBreakdown,
  openSeenUsersSheetForReply,
  openReactionUsersSheet,
  updateTask,
  onOpenTaskModal,
  onForwardMessage,
  onOpenMoveReply,
  moveThreadItem,
  deleteThreadReply,
  editMessage,
  sendThreadReply,
  handleSelectSticker,
  handleSend,
}) => {
  return (
    <>
      {actionSheetReply && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
          <div
            onClick={() => setActionSheetReply(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          <div className="relative bg-[var(--mos-surface-raised)] border-t border-[var(--mos-surface-border)] rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-around bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-2xl py-2 px-3 mb-4 shadow-sm">
              {GOOGLE_CHAT_QUICK_EMOJIS.map((emoji) => {
                const isReacted = hasUserReacted(actionSheetReply, emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      void reactToMessage(activeThreadMsg.id, emoji, actionSheetReply.id);
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

            <div className="space-y-1 divide-y divide-[var(--mos-surface-border)]">
              {!actionSheetReply.isDeleted &&
                (() => {
                  const breakdown =
                    activeThreadMsg && getThreadReplyReadBreakdown
                      ? getThreadReplyReadBreakdown(activeThreadMsg, actionSheetReply)
                      : { seenBy: [], unseenBy: [] };
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const replyObj = actionSheetReply;
                        setActionSheetReply(null);
                        if (activeThreadMsg && openSeenUsersSheetForReply) {
                          openSeenUsersSheetForReply(activeThreadMsg, replyObj);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[var(--mos-text)] bg-[var(--mos-surface-muted)] hover:opacity-90 rounded-xl transition-colors active:scale-98 border border-[var(--mos-surface-border)] mb-1"
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <span className={`font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          Xem người đã đọc
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--mos-text-muted)]">
                        <span className={`tabular-nums font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          {breakdown.seenBy.length} đã xem
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--mos-text-muted)]" />
                      </div>
                    </button>
                  );
                })()}

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
                    void navigator.clipboard.writeText(actionSheetReply.text);
                    antdMessage.success('Đã sao chép phản hồi');
                  }
                  setActionSheetReply(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <Copy className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                <span className="font-medium">Sao chép phản hồi</span>
              </button>

              {activeConversation?.id !== 'ai-copilot' && onForwardMessage && (
                <button
                  type="button"
                  onClick={() => {
                    const replyToForward = actionSheetReply;
                    setActionSheetReply(null);
                    onForwardMessage(activeThreadMsg, replyToForward);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
                >
                  <Forward className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span className="font-medium">Chuyển tiếp phản hồi này...</span>
                </button>
              )}

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

      <MosChatMobileMediaGallery
        open={galleryOpen}
        images={threadGalleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryOpen(false)}
      />

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
          void handleSend();
        }}
      />

      <MosChatMobileActionSheet
        open={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onSelectCustomer={() => setCustomerPickerOpen(true)}
        onSelectCKEditor={() => setCkEditorOpen(true)}
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

      <MosChatRichEditorModal
        open={ckEditorOpen}
        zIndex={2000}
        onClose={() => setCkEditorOpen(false)}
        initialValue={text}
        initialMode="compact"
        isDark={isDark}
        title="Soạn thảo phong phú (CKEditor)"
        onApply={(newText) => {
          setText(newText);
          antdMessage.success('Đã áp dụng nội dung CKEditor vào ô chat luồng');
        }}
        onSend={async (textToSend) => {
          if (textToSend.trim()) {
            setIsSending(true);
            const success = await sendThreadReply(textToSend, {
              attachments: attachedImages.length > 0 ? attachedImages : undefined,
              customerCard: stagedCustomerCard || undefined,
            });
            setIsSending(false);
            if (success) {
              setText('');
              setAttachedImages([]);
              setStagedCustomerCard(null);
              setReplyingToReply(null);
            }
          }
        }}
      />
    </>
  );
};
