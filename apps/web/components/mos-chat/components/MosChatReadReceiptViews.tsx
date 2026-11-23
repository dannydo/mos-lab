'use client';

import React from 'react';
import { Popover } from 'antd';
import { Check, CheckCheck } from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import { formatReadAtLabel } from '../utils/chat-helpers';

export interface ReadReceiptReaderEntry {
  staffId: number;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
  readAt?: string | null;
}

export interface MosChatSeenBreakdownPopoverContentProps {
  seenBy: ReadReceiptReaderEntry[];
  unseenBy: ReadReceiptReaderEntry[];
  scopeLabel?: string;
  isDark: boolean;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
}

export const MosChatSeenBreakdownPopoverContent: React.FC<MosChatSeenBreakdownPopoverContentProps> = ({
  seenBy,
  unseenBy,
  scopeLabel = 'Trạng thái đọc tin nhắn',
  isDark,
  renderUserAvatarNode,
}) => {
  return (
    <div className="w-64 max-h-72 overflow-y-auto p-1 select-none" onClick={(e) => e.stopPropagation()}>
      <div
        className="text-[11px] font-bold uppercase tracking-wider pb-1.5 mb-1.5 border-b flex items-center justify-between"
        style={{
          color: isDark ? '#94a3b8' : '#64748b',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
        }}
      >
        <span>{scopeLabel}</span>
        <span className="tabular-nums text-[10.5px] font-semibold" style={{ color: '#10b981' }}>
          {seenBy.length}/{seenBy.length + unseenBy.length} đã xem
        </span>
      </div>

      <div className="mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold mb-1" style={{ color: '#10b981' }}>
          <CheckCheck size={12.5} />
          <span className="tabular-nums">Đã xem ({seenBy.length})</span>
        </div>
        {seenBy.length === 0 ? (
          <div className="text-[11px] italic pl-4 py-0.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
            Chưa có người nhận nào đọc
          </div>
        ) : (
          <div className="space-y-1">
            {seenBy.map((reader) => (
              <div
                key={`seen-${reader.staffId}-${reader.displayName}`}
                className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-md"
                style={{ background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)' }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderUserAvatarNode({
                    staffId: reader.staffId,
                    name: reader.displayName,
                    avatarUrl: reader.avatarUrl,
                    sizeClass: 'w-5 h-5',
                    roundedClass: 'rounded-full',
                    textSizeClass: 'text-[9px]',
                  })}
                  <div className="min-w-0">
                    <div
                      className="text-[11.5px] font-semibold truncate leading-tight"
                      style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
                    >
                      {reader.displayName}
                    </div>
                    <div
                      className="text-[9.5px] truncate leading-tight"
                      style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    >
                      {reader.role}
                    </div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-medium tabular-nums shrink-0"
                  style={{ color: isDark ? '#34d399' : '#059669' }}
                >
                  {formatReadAtLabel(reader.readAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {unseenBy.length > 0 && (
        <div>
          <div
            className="flex items-center gap-1.5 text-[11px] font-bold mb-1"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            <Check size={12} />
            <span className="tabular-nums">Chưa xem ({unseenBy.length})</span>
          </div>
          <div className="space-y-1">
            {unseenBy.map((member) => (
              <div
                key={`unseen-${member.staffId}-${member.displayName}`}
                className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-md opacity-80"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderUserAvatarNode({
                    staffId: member.staffId,
                    name: member.displayName,
                    avatarUrl: member.avatarUrl,
                    sizeClass: 'w-5 h-5',
                    roundedClass: 'rounded-full',
                    textSizeClass: 'text-[9px]',
                  })}
                  <div className="min-w-0">
                    <div
                      className="text-[11.5px] font-medium truncate leading-tight"
                      style={{ color: isDark ? '#cbd5e1' : '#334155' }}
                    >
                      {member.displayName}
                    </div>
                    <div
                      className="text-[9.5px] truncate leading-tight"
                      style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                    >
                      {member.role}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] tabular-nums shrink-0" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                  Đã gửi
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export interface MosChatReadStatusCheckmarkProps {
  seenBy: ReadReceiptReaderEntry[];
  unseenBy: ReadReceiptReaderEntry[];
  compact?: boolean;
  scopeLabel?: string;
  showLabel?: boolean;
  isDark: boolean;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
}

export const MosChatReadStatusCheckmark: React.FC<MosChatReadStatusCheckmarkProps> = ({
  seenBy,
  unseenBy,
  compact,
  scopeLabel,
  showLabel,
  isDark,
  renderUserAvatarNode,
}) => {
  const isSeen = seenBy.length > 0;
  const totalPeers = seenBy.length + unseenBy.length;
  if (totalPeers === 0) return null;

  const iconSize = compact ? 11.5 : 13;
  return (
    <Popover
      trigger={['hover', 'click']}
      placement="top"
      content={
        <MosChatSeenBreakdownPopoverContent
          seenBy={seenBy}
          unseenBy={unseenBy}
          scopeLabel={scopeLabel}
          isDark={isDark}
          renderUserAvatarNode={renderUserAvatarNode}
        />
      }
    >
      <span
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-0.5 cursor-pointer select-none leading-none transition-opacity hover:opacity-85 tabular-nums"
        style={{ color: isSeen ? '#10b981' : isDark ? '#64748b' : '#94a3b8' }}
        title={isSeen ? `Đã xem bởi ${seenBy.map((s) => s.displayName).join(', ')}` : 'Đã gửi · Chưa có người xem'}
      >
        {isSeen ? <CheckCheck size={iconSize} strokeWidth={2.4} /> : <Check size={iconSize} strokeWidth={2.2} />}
        {showLabel && (
          <span className="text-[10px] font-semibold">
            {isSeen ? (totalPeers > 1 ? `Đã xem (${seenBy.length})` : 'Đã xem') : 'Đã gửi'}
          </span>
        )}
      </span>
    </Popover>
  );
};

export interface MosChatMiniSeenAvatarStackProps {
  readers: ReadReceiptReaderEntry[];
  unseenBy?: ReadReceiptReaderEntry[];
  align?: 'left' | 'right';
  compact?: boolean;
  scopeLabel?: string;
  isDark: boolean;
  surfaceBg: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
}

export const MosChatMiniSeenAvatarStack: React.FC<MosChatMiniSeenAvatarStackProps> = ({
  readers,
  unseenBy = [],
  align,
  compact,
  scopeLabel,
  isDark,
  surfaceBg,
  renderUserAvatarNode,
}) => {
  if (!readers || readers.length === 0) return null;
  const maxVisible = 4;
  const visibleReaders = readers.slice(0, maxVisible);
  const overflowCount = Math.max(0, readers.length - maxVisible);
  const sizeClass = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textSizeClass = compact ? 'text-[7.5px]' : 'text-[8px]';
  const alignClass = align === 'left' ? 'justify-start' : 'justify-end';

  return (
    <Popover
      trigger={['hover', 'click']}
      placement="topRight"
      content={
        <MosChatSeenBreakdownPopoverContent
          seenBy={readers}
          unseenBy={unseenBy}
          scopeLabel={scopeLabel}
          isDark={isDark}
          renderUserAvatarNode={renderUserAvatarNode}
        />
      }
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex items-center ${alignClass} gap-1 cursor-pointer select-none group/seen`}
      >
        {!compact && (
          <span
            className="text-[10px] font-medium opacity-0 group-hover/seen:opacity-100 transition-opacity tabular-nums"
            style={{ color: isDark ? '#34d399' : '#059669' }}
          >
            Đã xem{readers.length > 1 ? ` (${readers.length})` : ''}
          </span>
        )}
        <div className="flex items-center -space-x-1">
          {visibleReaders.map((r) => (
            <div
              key={`mini-seen-${r.staffId}-${r.displayName}`}
              className="rounded-full transition-transform group-hover/seen:scale-105"
              style={{ boxShadow: `0 0 0 1.5px ${surfaceBg}` }}
            >
              {renderUserAvatarNode({
                staffId: r.staffId,
                name: r.displayName,
                avatarUrl: r.avatarUrl,
                sizeClass,
                roundedClass: 'rounded-full',
                textSizeClass,
              })}
            </div>
          ))}
          {overflowCount > 0 && (
            <span
              className={`inline-flex items-center justify-center rounded-full font-extrabold tabular-nums leading-none ${sizeClass} ${textSizeClass}`}
              style={{
                background: isDark ? '#1e293b' : '#e2e8f0',
                color: isDark ? '#e2e8f0' : '#334155',
                boxShadow: `0 0 0 1.5px ${surfaceBg}`,
              }}
            >
              +{overflowCount}
            </span>
          )}
        </div>
      </div>
    </Popover>
  );
};
