'use client';

import React from 'react';
import { Forward, MessageSquareReply } from 'lucide-react';
import type { MosChatForwardedMetadata } from '@mos-lab/shared';

export interface MosChatForwardedHeaderProps {
  forwardedFrom?: MosChatForwardedMetadata | null;
  isDark: boolean;
  compact?: boolean;
  canJumpToSource?: boolean;
  onJumpToSource?: (sourceConversationId: string, sourceMessageId: string) => void;
  renderNoteText?: (text: string) => React.ReactNode;
}

export const MosChatForwardedHeader: React.FC<MosChatForwardedHeaderProps> = ({
  forwardedFrom,
  isDark,
  compact = false,
  canJumpToSource = false,
  onJumpToSource,
  renderNoteText,
}) => {
  if (!forwardedFrom) return null;

  const threadCount = Number(forwardedFrom.forwardedThreadCount || 0);
  const canClick = Boolean(
    canJumpToSource && onJumpToSource && forwardedFrom.sourceConversationId && forwardedFrom.sourceMessageId
  );

  const badgeStyle: React.CSSProperties = {
    background: isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(217, 119, 6, 0.08)',
    border: `1px solid ${isDark ? 'rgba(212, 168, 75, 0.28)' : 'rgba(217, 119, 6, 0.25)'}`,
    color: isDark ? '#fbbf24' : '#b45309',
  };

  const badgeContent = (
    <>
      <Forward size={compact ? 10 : 12} className="shrink-0" />
      <span className="truncate max-w-[260px]">
        Đã chuyển tiếp từ <strong className="font-semibold">{forwardedFrom.originalSenderName}</strong>
        {forwardedFrom.sourceConversationName ? (
          <span className="opacity-85"> · {forwardedFrom.sourceConversationName}</span>
        ) : null}
      </span>
      {threadCount > 0 && (
        <span
          className="inline-flex items-center justify-center gap-1 leading-none px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums shrink-0"
          style={{
            background: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)',
            color: isDark ? '#a5b4fc' : '#4338ca',
          }}
        >
          <MessageSquareReply size={9} className="shrink-0" />
          <span>kèm {threadCount} phản hồi</span>
        </span>
      )}
    </>
  );

  return (
    <div className="mb-1.5 flex flex-col gap-1 max-w-full" data-testid="mos-chat-forwarded-header">
      {forwardedFrom.note ? (
        <div
          className={`rounded-xl px-3 py-1.5 border-l-2 ${compact ? 'text-[11.5px]' : 'text-[12.5px]'} leading-snug break-words`}
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
            borderLeftColor: isDark ? '#f59e0b' : '#d97706',
            color: isDark ? '#e2e8f0' : '#1e293b',
          }}
        >
          {renderNoteText ? renderNoteText(forwardedFrom.note) : forwardedFrom.note}
        </div>
      ) : null}

      <div>
        {canClick ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onJumpToSource?.(forwardedFrom.sourceConversationId, forwardedFrom.sourceMessageId);
            }}
            title="Nhấn để đi tới tin nhắn gốc"
            className={`inline-flex flex-wrap items-center gap-1.5 rounded-lg ${
              compact ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11px]'
            } font-medium cursor-pointer transition-opacity hover:opacity-85 text-left`}
            style={badgeStyle}
          >
            {badgeContent}
          </button>
        ) : (
          <div
            className={`inline-flex flex-wrap items-center gap-1.5 rounded-lg ${
              compact ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11px]'
            } font-medium`}
            style={badgeStyle}
          >
            {badgeContent}
          </div>
        )}
      </div>
    </div>
  );
};
