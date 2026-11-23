'use client';

import React from 'react';
import { History, Loader2, MessageSquare, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { AiChatSession } from '@mos-lab/shared';
import { formatSessionTimestamp } from './copilot-utils';

export interface CopilotSessionBarProps {
  sessions: AiChatSession[];
  activeSessionId: string | null;
  hasMessages: boolean;
  loadingHistory: boolean;
  showSessionDrawer: boolean;
  onStartNewSession: () => void;
  onCreateNewSession: () => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (e: React.MouseEvent, sessionId: string) => void;
  onToggleSessionDrawer: () => void;
}

export function CopilotSessionBar({
  sessions,
  activeSessionId,
  hasMessages,
  loadingHistory,
  showSessionDrawer,
  onStartNewSession,
  onCreateNewSession,
  onLoadSession,
  onDeleteSession,
  onToggleSessionDrawer,
}: CopilotSessionBarProps) {
  return (
    <>
      {/* Private Workspace Notice Banner */}
      <div className="px-4 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>Toàn bộ thảo luận & bộ lọc chỉ áp dụng trên màn hình cá nhân của bạn.</span>
        </div>
        {sessions.length > 0 && (
          <span className="text-[11px] font-medium tabular-nums opacity-80">{sessions.length} phiên đã lưu</span>
        )}
      </div>

      {/* Quick Session Switcher Bar */}
      <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
        {/* New Session Button */}
        <button
          type="button"
          onClick={onStartNewSession}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            !activeSessionId && !hasMessages
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
          }`}
          title="Tạo hội thoại mới"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Phiên mới</span>
        </button>

        {/* Quick Session Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1 min-w-0">
          {sessions.slice(0, 6).map((s) => {
            const isActive = activeSessionId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => onLoadSession(s.id)}
                className={`flex-shrink-0 group flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer text-xs transition-all max-w-[170px] border ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold border-indigo-300 dark:border-indigo-700 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
                title={s.title || 'Hội thoại'}
              >
                <MessageSquare className="w-3 h-3 flex-shrink-0 text-slate-400 group-hover:text-indigo-500" />
                <span className="truncate">{s.title || 'Hội thoại'}</span>
                <button
                  type="button"
                  onClick={(e) => onDeleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-500 transition-opacity ml-0.5"
                  title="Xóa phiên"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Full History Drawer Toggle Button */}
        <button
          type="button"
          onClick={onToggleSessionDrawer}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
            showSessionDrawer
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Xem tất cả phiên hội thoại cũ"
        >
          <History className="w-3.5 h-3.5" />
          <span>{sessions.length > 6 ? `Tất cả (${sessions.length})` : 'Lịch sử'}</span>
        </button>
      </div>

      {/* Sessions List Panel (Overlay inside drawer) */}
      {showSessionDrawer && (
        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Lịch sử phiên trao đổi cá nhân
            </span>
            <button
              type="button"
              onClick={onCreateNewSession}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              <Plus className="w-3 h-3" /> Tạo mới
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-4 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Đang tải lịch sử...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              Chưa có phiên làm việc nào. Bắt đầu câu hỏi đầu tiên bên dưới.
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onLoadSession(s.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    activeSessionId === s.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex-1 truncate mr-2">
                    <div className="truncate font-medium">{s.title || 'Hội thoại'}</div>
                    <div className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                      {formatSessionTimestamp(s.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => onDeleteSession(e, s.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Xóa phiên"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
