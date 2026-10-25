'use client';

import React from 'react';
import { MessageSquareReply, Copy, Pin, CheckSquare, Trash2, Share2, X, Pencil } from 'lucide-react';
import { message as antdMessage } from 'antd';
import type { MosChatMessage } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../constants/chat-constants';

export interface MosChatMobileReactionSheetProps {
  message: MosChatMessage | null;
  onClose: () => void;
  onOpenThread: (msg: MosChatMessage) => void;
  onCreateTaskFromMsg: (msg: MosChatMessage) => void;
  onEditMessage?: (msg: MosChatMessage) => void;
}

export const MosChatMobileReactionSheet: React.FC<MosChatMobileReactionSheetProps> = ({
  message,
  onClose,
  onOpenThread,
  onCreateTaskFromMsg,
  onEditMessage,
}) => {
  const { reactToMessage, togglePinMessage, deleteMessage, setReplyingToMessage, currentUser } = useMosChat();

  if (!message) return null;

  const isMe =
    String(message.senderId) === String(currentUser?.id) ||
    String(message.senderName) === String(currentUser?.fullName || currentUser?.name);
  const isDannyAccount =
    String(currentUser?.id) === '1' ||
    String(currentUser?.username || '').toLowerCase() === 'dannydo' ||
    String(currentUser?.role || '')
      .toLowerCase()
      .includes('admin');
  const canEdit = isMe || isDannyAccount;
  const canDelete = isMe || isDannyAccount;

  const handleEmojiClick = (emoji: string) => {
    reactToMessage(message.id, emoji);
    onClose();
  };

  const handleCopy = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message.text);
      antdMessage.success('Đã sao chép nội dung tin nhắn');
    }
    onClose();
  };

  const handleReply = () => {
    setReplyingToMessage(message);
    onClose();
  };

  const handleThread = () => {
    onClose();
    onOpenThread(message);
  };

  const handlePin = () => {
    togglePinMessage(message.id);
    onClose();
  };

  const handleDelete = async () => {
    onClose();
    try {
      await deleteMessage(message.id);
      antdMessage.success('Đã xoá tin nhắn');
    } catch {
      antdMessage.error('Không thể xoá tin nhắn');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Slide-up Sheet */}
      <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

        {/* Quick Reaction Pills */}
        <div className="flex items-center justify-around bg-slate-800/90 border border-slate-700/60 rounded-2xl py-2 px-3 mb-4 shadow-sm">
          {GOOGLE_CHAT_QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
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
            onClick={handleReply}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-98"
          >
            <MessageSquareReply className="w-4 h-4 text-amber-400" />
            <span className="font-medium">Trả lời tin nhắn</span>
          </button>

          <button
            type="button"
            onClick={handleThread}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-98"
          >
            <MessageSquareReply className="w-4 h-4 text-indigo-400" />
            <span className="font-medium">Thảo luận trong luồng (Thread)</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-98"
          >
            <Copy className="w-4 h-4 text-slate-400" />
            <span className="font-medium">Sao chép văn bản</span>
          </button>

          <button
            type="button"
            onClick={handlePin}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-98"
          >
            <Pin className={`w-4 h-4 ${message.pinned ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
            <span className="font-medium">{message.pinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateTaskFromMsg(message);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-98"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Giao việc từ tin nhắn này</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditMessage?.(message);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors active:scale-98"
            >
              <Pencil className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Chỉnh sửa tin nhắn</span>
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors active:scale-98"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span className="font-medium">Xóa tin nhắn</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
