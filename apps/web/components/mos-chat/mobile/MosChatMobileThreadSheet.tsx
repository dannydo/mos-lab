'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, MessageSquareReply, X, CheckCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { useMosChat } from '../context/MosChatContext';
import { resolveMediaUrl } from '../../../lib/api-base-url';

export const MosChatMobileThreadSheet: React.FC = () => {
  const { activeThreadMsg, threadReplies, sendThreadReply, currentUser, setMobileView } = useMosChat();

  const [text, setText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom of thread
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [threadReplies.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    const success = await sendThreadReply(trimmed);
    setIsSending(false);

    if (success) {
      setText('');
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
      {/* Scrollable Replies Feed */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
        {/* Parent Message Highlight Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold uppercase">
              {activeThreadMsg.senderName?.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-bold text-white">{activeThreadMsg.senderName}</span>
            <span className="text-[10px] text-slate-500 tabular-nums">
              {dayjs(activeThreadMsg.createdAt).format('HH:mm DD/MM')}
            </span>
          </div>
          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
            {activeThreadMsg.text}
          </div>
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

          return (
            <div key={reply.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
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
                <div className="whitespace-pre-wrap leading-relaxed select-text">{reply.text}</div>

                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums ${
                    isMe ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  <span>{dayjs(reply.createdAt).format('HH:mm')}</span>
                  {isMe && <CheckCheck className="w-3.5 h-3.5 text-slate-800" />}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Bottom Thread Composer */}
      <div className="sticky bottom-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-3 pt-2 pb-[max(env(safe-area-inset-bottom,14px),12px)]">
        <div className="flex items-end gap-2">
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

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 active:scale-90 transition-transform shrink-0 mb-0.5 disabled:opacity-50"
          >
            <SendHorizontal className="w-4 h-4 font-bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
