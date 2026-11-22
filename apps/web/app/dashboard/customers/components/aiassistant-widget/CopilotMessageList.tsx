'use client';

import React from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sliders,
  Sparkles,
  Square,
  User,
  Volume2,
} from 'lucide-react';
import type { AiChatAction, AiChatMessage } from '@mos-lab/shared';
import { QUICK_PROMPTS, extractMessageActions, sanitizeMessageContent } from './copilot-utils';

export interface CopilotMessageListProps {
  messages: AiChatMessage[];
  expandedThinking: Record<string, boolean>;
  appliedActions: Record<string, boolean>;
  speakingMessageId: string | null;
  copiedMessageId: string | null;
  lastFailedMessage: string | null;
  sending: boolean;
  elapsedSeconds: number;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (textToSend?: string) => void;
  onToggleThinking: (messageId: string) => void;
  onToggleSpeak: (msg: AiChatMessage) => void;
  onCopyContent: (msg: AiChatMessage) => void;
  onExecuteAction: (action: AiChatAction, messageId: string, actionKey?: string) => void;
}

export function CopilotMessageList({
  messages,
  expandedThinking,
  appliedActions,
  speakingMessageId,
  copiedMessageId,
  lastFailedMessage,
  sending,
  elapsedSeconds,
  chatBottomRef,
  onSendMessage,
  onToggleThinking,
  onToggleSpeak,
  onCopyContent,
  onExecuteAction,
}: CopilotMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">Không Gian Làm Việc Trợ Lý AI</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
            Tôi có thể giúp bạn giải đáp cấu trúc khách hàng, tư duy tối ưu luồng CSKH và tự động lọc dữ liệu trên màn
            hình của bạn.
          </p>

          {/* Quick Prompts */}
          <div className="w-full space-y-2 text-left">
            <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
              Gợi ý câu hỏi nhanh:
            </div>
            {QUICK_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendMessage(item.prompt)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-200 text-xs transition-all text-left shadow-sm group"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.role === 'user';
          const hasThinking = Boolean(msg.thinking);
          const isExpanded = expandedThinking[msg.id] ?? false;
          const actionsList = isUser ? [] : extractMessageActions(msg);

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              {/* User / Bot Avatar & Badge */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400 dark:text-slate-500">
                {isUser ? (
                  <>
                    <span>Bạn (Không gian riêng)</span>
                    <User className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-indigo-500" />
                    <span className="font-medium text-slate-600 dark:text-slate-300">mOS Copilot</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {msg.source === 'ag' ? 'AG Engine' : 'Live Copilot'}
                    </span>
                  </>
                )}
              </div>

              {/* Thinking Process Accordion (for Assistant) */}
              {!isUser && hasThinking && (
                <div className="w-full max-w-[90%] mb-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onToggleThinking(msg.id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Tư duy & Phân tích logic</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono leading-relaxed border-t border-amber-200/60 dark:border-amber-900/40 bg-white/40 dark:bg-black/20 whitespace-pre-wrap">
                      {msg.thinking}
                    </div>
                  )}
                </div>
              )}

              {/* Message Bubble Content */}
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : msg.id.startsWith('err-')
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-tl-none'
                      : `bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border rounded-tl-none ${
                          speakingMessageId === msg.id
                            ? 'border-purple-300 dark:border-purple-700/80 shadow-purple-500/10 shadow-md ring-1 ring-purple-400/30'
                            : 'border-slate-200 dark:border-slate-800'
                        }`
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{sanitizeMessageContent(msg.content)}</div>
                {msg.id.startsWith('err-') && lastFailedMessage && (
                  <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-rose-500">Mất kết nối máy chủ AI</span>
                    <button
                      type="button"
                      onClick={() => onSendMessage(lastFailedMessage)}
                      disabled={sending}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Thử lại câu hỏi</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Bar (Audio Speech & Copy) for Assistant Message */}
              {!isUser && (
                <div className="flex items-center gap-2 mt-1.5 px-1">
                  <button
                    type="button"
                    onClick={() => onToggleSpeak(msg)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                      speakingMessageId === msg.id
                        ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={speakingMessageId === msg.id ? 'Dừng đọc' : 'Nghe đọc câu trả lời'}
                  >
                    {speakingMessageId === msg.id ? (
                      <>
                        <Square className="w-3 h-3 fill-current text-purple-600 dark:text-purple-400" />
                        <span className="font-semibold text-purple-700 dark:text-purple-300">Dừng</span>
                        {/* Animated mini soundwave equalizer */}
                        <span className="flex items-end gap-0.5 ml-0.5 h-3">
                          <span className="w-0.5 h-2 bg-purple-500 rounded-full animate-pulse" />
                          <span className="w-0.5 h-3 bg-purple-500 rounded-full animate-pulse" />
                          <span className="w-0.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                        </span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" />
                        <span>Nghe đọc</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onCopyContent(msg)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Sao chép nội dung"
                  >
                    {copiedMessageId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Action Suggestion Card(s) */}
              {!isUser && actionsList.length > 0 && (
                <div className="w-full max-w-[90%] mt-2 flex flex-col gap-2">
                  {actionsList.map((action, actionIdx) => {
                    const actionKey = `${msg.id}-${actionIdx}`;
                    const isActionApplied = Boolean(
                      appliedActions[actionKey] || (actionIdx === 0 && appliedActions[msg.id])
                    );
                    return (
                      <div
                        key={actionKey}
                        className="w-full p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                            {action.label}
                          </span>
                        </div>

                        {/* Criteria details */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {Object.entries(action.payload).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-slate-700 dark:text-slate-300"
                            >
                              {k}: <strong className="text-emerald-600 dark:text-emerald-400">{String(v)}</strong>
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => onExecuteAction(action, msg.id, actionKey)}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                            isActionApplied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow'
                          }`}
                        >
                          {isActionApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đã áp dụng vào bảng dữ liệu</span>
                            </>
                          ) : (
                            <>
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Áp dụng vào bảng hiện tại</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {sending && (
        <div className="flex flex-col gap-1.5 text-xs py-2.5 px-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 shadow-sm transition-all">
          <div className="flex items-center gap-2 font-medium text-indigo-700 dark:text-indigo-300">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500 flex-shrink-0" />
            <span>
              {elapsedSeconds < 10
                ? 'mOS Copilot đang suy luận và phân tích câu hỏi...'
                : elapsedSeconds < 30
                  ? 'Đang tra cứu cơ sở dữ liệu khách hàng & salon...'
                  : 'Đang tổng hợp dữ liệu chi tiết và tính toán số liệu...'}
            </span>
            <span className="ml-auto font-mono text-[11px] tabular-nums text-indigo-500 dark:text-indigo-400">
              {elapsedSeconds}s
            </span>
          </div>
          {elapsedSeconds >= 12 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-tight">
              Hệ thống đang truy vấn dữ liệu thực tế, phản hồi trễ một chút vẫn đảm bảo số liệu chính xác 100%.
            </p>
          )}
        </div>
      )}
      <div ref={chatBottomRef} />
    </div>
  );
}
