'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import type { MosChatMessage, MosChatStaffMember } from '@mos-lab/shared';
import { MosChatAvatar } from '../../MosChatAvatar';

export interface MobileMessageSenderHeaderProps {
  message: MosChatMessage;
  isMe: boolean;
  isAiBot: boolean;
  isDark: boolean;
  staffDirectory: MosChatStaffMember[];
}

export const MobileMessageSenderHeader: React.FC<MobileMessageSenderHeaderProps> = ({
  message,
  isMe,
  isAiBot,
  isDark,
  staffDirectory,
}) => {
  return (
    <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {isAiBot ? (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      ) : message.senderId === 'mos-mission-bot' ? (
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500/30 to-indigo-500/30 border border-amber-500/50 flex items-center justify-center text-[11px] shadow-sm shrink-0">
          🚀
        </div>
      ) : (
        <MosChatAvatar
          size="sm"
          src={message.senderAvatar}
          name={message.senderName}
          staffId={message.senderId}
          staffDirectory={staffDirectory}
        />
      )}
      <span
        className={`text-xs font-semibold ${
          isAiBot
            ? isDark
              ? 'text-purple-300'
              : 'text-purple-700'
            : isMe
              ? isDark
                ? 'text-amber-300'
                : 'text-amber-700'
              : 'text-[var(--mos-text)]'
        }`}
      >
        {message.senderName}
      </span>
      {isAiBot ? (
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase border ${
            isDark
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-purple-500/15 text-purple-700 border-purple-500/35'
          }`}
        >
          mOS AI
        </span>
      ) : message.senderRole ? (
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] font-medium uppercase border border-[var(--mos-surface-border)]">
          {message.senderRole}
        </span>
      ) : null}
    </div>
  );
};
