'use client';

import React from 'react';
import { CheckSquare, FolderOpen, Pin } from 'lucide-react';
import type { MosChatActiveSubtab } from '../../types/mos-chat-types';

export interface MobileRoomSubtabReturnBarProps {
  isDark: boolean;
  activeSubtab: MosChatActiveSubtab;
  hasActiveConversation: boolean;
  pinnedCount: number;
  filesCount: number;
  onBackToChat: () => void;
}

interface ReturnBarDescriptor {
  containerClass: string;
  labelClass: string;
  buttonClass: string;
  icon: React.ReactNode;
  label: string;
  truncateLabel?: boolean;
  tabularLabel?: boolean;
}

function resolveReturnBarDescriptor({
  isDark,
  activeSubtab,
  hasActiveConversation,
  pinnedCount,
  filesCount,
}: Omit<MobileRoomSubtabReturnBarProps, 'onBackToChat'>): ReturnBarDescriptor | null {
  if (activeSubtab === 'tasks' && hasActiveConversation) {
    return {
      containerClass: isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50 border-amber-200',
      labelClass: `flex items-center gap-1.5 font-semibold truncate ${isDark ? 'text-amber-300' : 'text-amber-800'}`,
      buttonClass: 'bg-amber-500 text-slate-950 shrink-0',
      icon: <CheckSquare className="w-3.5 h-3.5 shrink-0" />,
      label: 'Đang xem Kho Công việc',
      truncateLabel: true,
    };
  }
  if (activeSubtab === 'pinned') {
    return {
      containerClass: isDark ? 'bg-amber-500/15 border-amber-500/30' : 'bg-amber-50 border-amber-200',
      labelClass: `flex items-center gap-1.5 font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`,
      buttonClass: 'bg-amber-500 text-slate-950',
      icon: <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />,
      label: `Đang xem Tin nhắn đã ghim (${pinnedCount})`,
      tabularLabel: true,
    };
  }
  if (activeSubtab === 'files') {
    return {
      containerClass: isDark ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200',
      labelClass: `flex items-center gap-1.5 font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`,
      buttonClass: 'bg-emerald-500 text-slate-950',
      icon: <FolderOpen className="w-3.5 h-3.5 shrink-0" />,
      label: `Đang xem Tài liệu & Google Workspace (${filesCount})`,
      tabularLabel: true,
    };
  }
  return null;
}

export const MobileRoomSubtabReturnBar: React.FC<MobileRoomSubtabReturnBarProps> = ({
  isDark,
  activeSubtab,
  hasActiveConversation,
  pinnedCount,
  filesCount,
  onBackToChat,
}) => {
  const descriptor = resolveReturnBarDescriptor({
    isDark,
    activeSubtab,
    hasActiveConversation,
    pinnedCount,
    filesCount,
  });

  if (!descriptor) return null;

  return (
    <div className={`px-3 py-1.5 border-t flex items-center justify-between text-xs ${descriptor.containerClass}`}>
      <div className={descriptor.labelClass}>
        {descriptor.icon}
        <span className={descriptor.truncateLabel ? 'truncate' : descriptor.tabularLabel ? 'tabular-nums' : undefined}>
          {descriptor.label}
        </span>
      </div>
      <button
        type="button"
        onClick={onBackToChat}
        className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full font-bold text-[11px] active:scale-95 transition-transform cursor-pointer ${descriptor.buttonClass}`}
      >
        Quay lại Chat
      </button>
    </div>
  );
};
