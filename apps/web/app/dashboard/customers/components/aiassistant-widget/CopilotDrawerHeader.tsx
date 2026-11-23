'use client';

import React from 'react';
import { Bot, History, Plus, ShieldCheck, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Tooltip } from 'antd';

export interface CopilotDrawerHeaderProps {
  autoSpeakEnabled: boolean;
  playbackRate: number;
  onToggleAutoSpeak: () => void;
  onCyclePlaybackRate: () => void;
  onToggleSessionDrawer: () => void;
  onCreateNewSession: () => void;
}

export function CopilotDrawerHeader({
  autoSpeakEnabled,
  playbackRate,
  onToggleAutoSpeak,
  onCyclePlaybackRate,
  onToggleSessionDrawer,
  onCreateNewSession,
}: CopilotDrawerHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full pr-4">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-sm">
          <Bot className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-base">mOS Copilot</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <ShieldCheck className="w-3 h-3" />
              Private Workspace
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs">
              <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
              Powered by Antigravity (AG)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Trợ lý Đa Nhiệm cá nhân · Không ảnh hưởng thành viên khác
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Audio Controls */}
        <Tooltip
          title={
            autoSpeakEnabled
              ? 'Tự động đọc phản hồi (Đang BẬT) · Bấm để tắt'
              : 'Tự động đọc phản hồi (Đang TẮT) · Bấm để bật'
          }
        >
          <button
            type="button"
            onClick={onToggleAutoSpeak}
            className={`p-1.5 rounded-md transition-colors ${
              autoSpeakEnabled
                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-label="Tự động đọc phản hồi"
          >
            {autoSpeakEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </Tooltip>

        <Tooltip title={`Tốc độ đọc giọng nói: ${playbackRate}x · Bấm để đổi (1.0x / 1.25x / 1.5x)`}>
          <button
            type="button"
            onClick={onCyclePlaybackRate}
            className="px-1.5 py-1 rounded-md text-[11px] font-mono font-semibold tabular-nums text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {playbackRate}x
          </button>
        </Tooltip>

        <button
          type="button"
          onClick={onToggleSessionDrawer}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Lịch sử hội thoại"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCreateNewSession}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Tạo hội thoại mới"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
