'use client';

import React, { useState, useMemo } from 'react';
import { CornerDownRight, Search, X, Loader2, MessageSquareReply, MessageSquare } from 'lucide-react';
import type { MosChatMessage } from '@mos-lab/shared';
import { removeVietnameseTones } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { resolveStaffAvatarUrl } from '../utils/chat-helpers';

export interface MosChatMobileMoveThreadModalProps {
  open: boolean;
  sourceMessage: MosChatMessage | null;
  prevMessage?: MosChatMessage | null;
  replyId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MosChatMobileMoveThreadModal: React.FC<MosChatMobileMoveThreadModalProps> = ({
  open,
  sourceMessage,
  prevMessage,
  replyId,
  onClose,
  onSuccess,
}) => {
  const { messages, activeThreadMsg, moveThreadItem, staffDirectory } = useMosChat();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatSnippet = (msg?: MosChatMessage | null): string => {
    if (!msg) return '';
    const raw = String(msg.text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (raw) return raw.length > 70 ? `${raw.slice(0, 70)}…` : raw;
    if (msg.attachments && msg.attachments.length > 0) {
      return `[Đính kèm ${msg.attachments.length} hình ảnh]`;
    }
    return '[Tin nhắn]';
  };

  const candidates = useMemo(() => {
    if (!sourceMessage) return [];
    const qNorm = removeVietnameseTones(searchQuery.trim().toLowerCase());
    return messages
      .filter((m) => m.id !== sourceMessage.id && !m.isDeleted && !m.isSystemReminder && m.senderId !== 'system-reminder')
      .slice()
      .reverse()
      .filter((m) => {
        if (!qNorm) return true;
        const hay = removeVietnameseTones(
          `${m.senderName || ''} ${m.text || ''} ${m.mission?.missionKey || ''}`.toLowerCase()
        );
        return hay.includes(qNorm);
      });
  }, [messages, sourceMessage, searchQuery]);

  if (!open || !sourceMessage) return null;

  const handleSelectTarget = async (targetMsgId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const mode = replyId ? 'MOVE_REPLY_TO_THREAD' : 'MERGE_ROOT_TO_THREAD';
      const success = await moveThreadItem({
        mode,
        sourceMessageId: sourceMessage.id,
        replyId: replyId || undefined,
        targetMessageId: targetMsgId,
      });
      if (success) {
        onSuccess?.();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openThreadTarget =
    activeThreadMsg && activeThreadMsg.id !== sourceMessage.id && !activeThreadMsg.isDeleted
      ? activeThreadMsg
      : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />

      {/* Slide-up Sheet */}
      <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CornerDownRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {replyId ? 'Chuyển phản hồi sang luồng khác' : 'Gộp tin nhắn vào luồng phụ'}
              </h3>
              <p className="text-[11px] text-slate-400">Chọn tin nhắn đích để chuyển vào thảo luận trong luồng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Message Preview Box */}
        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 mb-3 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-400 mb-0.5">
            <span>Tin nhắn nguồn đang chọn:</span>
            <span className="text-slate-400 font-normal">{sourceMessage.senderName}</span>
          </div>
          <p className="text-xs text-slate-200 line-clamp-2">{formatSnippet(sourceMessage)}</p>
        </div>

        {/* 1-Click Fast Actions */}
        <div className="space-y-2 mb-3 shrink-0">
          {prevMessage && !prevMessage.isDeleted && prevMessage.id !== sourceMessage.id && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSelectTarget(prevMessage.id)}
              className="w-full p-2.5 rounded-xl text-left bg-amber-500/10 border border-amber-500/30 active:scale-98 transition-all disabled:opacity-50"
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-0.5">
                <span className="flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5" />
                  ⚡ Gộp vào luồng ngay phía trên (1-Chạm)
                </span>
                <span className="text-[10.5px] tabular-nums font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                  {(prevMessage.thread || []).filter((r) => !r.deletedAt).length} trả lời
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                <span className="font-semibold text-white">{prevMessage.senderName}:</span>{' '}
                {formatSnippet(prevMessage)}
              </p>
            </button>
          )}

          {openThreadTarget && openThreadTarget.id !== prevMessage?.id && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSelectTarget(openThreadTarget.id)}
              className="w-full p-2.5 rounded-xl text-left bg-indigo-500/10 border border-indigo-500/30 active:scale-98 transition-all disabled:opacity-50"
            >
              <div className="flex items-center justify-between text-xs font-bold text-indigo-400 mb-0.5">
                <span className="flex items-center gap-1.5">
                  <MessageSquareReply className="w-3.5 h-3.5" />
                  💬 Gộp vào luồng đang mở
                </span>
                <span className="text-[10.5px] tabular-nums font-semibold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300">
                  {(openThreadTarget.thread || []).filter((r) => !r.deletedAt).length} trả lời
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                <span className="font-semibold text-white">{openThreadTarget.senderName}:</span>{' '}
                {formatSnippet(openThreadTarget)}
              </p>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative mb-2 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tin nhắn đích trong hội thoại..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400/80"
          />
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[140px]">
          {isSubmitting ? (
            <div className="py-8 flex flex-col items-center justify-center text-amber-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">Đang chuyển vào luồng...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
              <MessageSquare className="w-6 h-6 text-slate-600" />
              <span>Không tìm thấy tin nhắn đích phù hợp</span>
            </div>
          ) : (
            candidates.slice(0, 30).map((cand) => {
              const replyCount = (cand.thread || []).filter((r) => !r.deletedAt).length;
              const avatar = resolveStaffAvatarUrl({
                staffId: cand.senderId,
                name: cand.senderName,
                staffDirectory,
              });

              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => handleSelectTarget(cand.id)}
                  className="w-full p-2.5 rounded-xl text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 active:scale-98 transition-all flex items-start gap-2.5"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {cand.senderName?.slice(0, 2)?.toUpperCase() || 'NV'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="font-bold text-white truncate">{cand.senderName}</span>
                      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] text-indigo-400 font-semibold tabular-nums">
                        <MessageSquareReply className="w-3 h-3" />
                        {replyCount}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-1">{formatSnippet(cand)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
