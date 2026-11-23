'use client';

import React, { useEffect } from 'react';
import { Hash, MessageSquare, MessageSquareReply, Pin } from 'lucide-react';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { isSpaceEmoji } from '../../constants/chat-constants';
import { MosChatAvatar } from '../../MosChatAvatar';
import { resolveSpaceAvatarToneClasses } from './inboxHelpers';

export interface ConversationActionSheetProps {
  target: MosChatConversation | null;
  isDark: boolean;
  isPinned: boolean;
  staffDirectory: MosChatStaffMember[];
  onClose: () => void;
  onTogglePin: (convId: string) => void;
  onMarkAsRead: (convId: string) => void;
  onOpenConversation: (convId: string) => void;
}

export const ConversationActionSheet: React.FC<ConversationActionSheetProps> = ({
  target,
  isDark,
  isPinned,
  staffDirectory,
  onClose,
  onTogglePin,
  onMarkAsRead,
  onOpenConversation,
}) => {
  useEffect(() => {
    if (!target) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  const isSpace = target.type === 'space';
  const spaceToneClasses = resolveSpaceAvatarToneClasses(target.color, isDark);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-black/60' : 'bg-slate-900/40'}`}
      />

      {/* Slide-up Bottom Action Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={target.name}
        className="relative w-full max-w-[500px] mx-auto bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border border-[var(--mos-surface-border-strong)] rounded-t-3xl p-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex flex-col gap-3 select-none">
          <div className="w-10 h-1 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mb-1" />

          {/* Target Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--mos-surface-border)]">
            <div className="relative shrink-0">
              {isSpace ? (
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-bold text-xl shadow-sm ${spaceToneClasses}`}
                >
                  {target.avatar && isSpaceEmoji(target.avatar) ? (
                    <span>{target.avatar}</span>
                  ) : (
                    <Hash className="w-5 h-5" />
                  )}
                </div>
              ) : (
                <MosChatAvatar
                  size={44}
                  shape="square"
                  src={target.avatar}
                  name={target.name}
                  staffId={target.participantStaffId}
                  staffDirectory={staffDirectory}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-[var(--mos-text)] truncate">{target.name}</h3>
                {isPinned && (
                  <Pin
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isDark ? 'text-amber-400 fill-amber-400' : 'text-amber-600 fill-amber-600'
                    }`}
                  />
                )}
              </div>
              <p className="text-xs text-[var(--mos-text-muted)] truncate">
                {isSpace ? 'Kênh Không Gian' : 'Trò chuyện trực tiếp 1-1'}
              </p>
            </div>
          </div>

          {/* Actions List */}
          <div className="flex flex-col gap-1 py-1">
            {/* Toggle Pin Action */}
            <button
              type="button"
              onClick={() => {
                const targetId = target.id;
                onClose();
                onTogglePin(targetId);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl transition-colors font-medium cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isPinned
                    ? `bg-amber-500/20 border border-amber-500/40 ${isDark ? 'text-amber-400' : 'text-amber-600'}`
                    : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)]'
                }`}
              >
                <Pin
                  className={`w-4 h-4 ${
                    isPinned ? `fill-current ${isDark ? 'text-amber-400' : 'text-amber-600'}` : ''
                  }`}
                />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold text-[var(--mos-text)]">
                  {isPinned
                    ? isSpace
                      ? 'Bỏ ghim Không gian này'
                      : 'Bỏ ghim cuộc trò chuyện này'
                    : isSpace
                      ? '📌 Ghim Không gian lên đầu danh sách'
                      : '📌 Ghim cuộc trò chuyện lên đầu danh sách'}
                </div>
                <div className="text-[11px] text-[var(--mos-text-muted)]">
                  {isPinned
                    ? 'Không gian sẽ trở về thứ tự thời gian bình thường'
                    : 'Không gian sẽ luôn hiển thị ở trên cùng danh sách'}
                </div>
              </div>
            </button>

            {/* Mark Read Action */}
            <button
              type="button"
              onClick={() => {
                const targetId = target.id;
                onClose();
                onMarkAsRead(targetId);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl transition-colors font-medium cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold text-[var(--mos-text)]">Đánh dấu đã đọc</div>
                <div className="text-[11px] text-[var(--mos-text-muted)]">
                  Xóa các thông báo chưa đọc của cuộc trò chuyện này
                </div>
              </div>
            </button>

            {/* Open Conversation */}
            <button
              type="button"
              onClick={() => {
                const targetId = target.id;
                onClose();
                onOpenConversation(targetId);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-sm hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl transition-colors font-medium cursor-pointer ${
                isDark ? 'text-emerald-300' : 'text-emerald-700'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              >
                <MessageSquareReply className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  Vào cuộc trò chuyện
                </div>
                <div className="text-[11px] text-[var(--mos-text-muted)]">Xem tin nhắn và trao đổi</div>
              </div>
            </button>
          </div>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 mt-1 rounded-xl bg-[var(--mos-surface-muted)] text-[var(--mos-text)] font-semibold text-xs border border-[var(--mos-surface-border)] active:opacity-80 transition-opacity cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
