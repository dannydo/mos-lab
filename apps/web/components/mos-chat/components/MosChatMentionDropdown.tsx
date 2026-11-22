'use client';

import React from 'react';
import type { GlobalToken } from 'antd';
import { AtSign } from 'lucide-react';

export interface PortalMentionItem {
  id: string;
  type: 'special' | 'staff';
  tagText: string;
  displayName: string;
  realName?: string;
  nickname?: string;
  username?: string;
  role?: string;
  avatarUrl?: string | null;
  avatarText?: string;
  color?: string;
  isOnline?: boolean;
}

export interface MosChatMentionDropdownProps {
  scope: 'main' | 'thread';
  open: boolean;
  mentionScope: 'main' | 'thread';
  filteredMentions: PortalMentionItem[];
  highlightedIndex: number;
  isDark: boolean;
  token: GlobalToken;
  onHighlightIndex: (idx: number) => void;
  onSelectMention: (item: PortalMentionItem, scope: 'main' | 'thread') => void;
}

export const MosChatMentionDropdown: React.FC<MosChatMentionDropdownProps> = ({
  scope,
  open,
  mentionScope,
  filteredMentions,
  highlightedIndex,
  isDark,
  token,
  onHighlightIndex,
  onSelectMention,
}) => {
  if (!open || mentionScope !== scope || filteredMentions.length === 0) {
    return null;
  }

  return (
    <div
      className="mos-chat-mention-dropdown absolute bottom-full left-0 mb-2 z-50 rounded-2xl shadow-2xl border backdrop-blur-xl overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-bottom-2 select-none w-72 md:w-84 max-w-[calc(100vw-32px)]"
      style={{
        background: isDark ? 'rgba(23, 23, 23, 0.96)' : 'rgba(255, 255, 255, 0.98)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)',
        boxShadow: isDark
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
          : '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div
        className="px-3.5 py-2 flex items-center justify-between text-[11px] font-semibold tracking-wide"
        style={{
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          color: token.colorTextSecondary,
        }}
      >
        <span className="flex items-center gap-1.5 uppercase font-bold text-amber-500">
          <AtSign size={13} className="shrink-0" />
          <span>Gợi ý thành viên ({filteredMentions.length})</span>
        </span>
        <span className="text-[10px] font-normal lowercase opacity-70">↑ ↓ chọn · Enter/Tab tag · Esc huỷ</span>
      </div>

      <div className="overflow-y-auto max-h-56 py-1 scrollbar-thin">
        {filteredMentions.map((item, idx) => {
          const isHighlighted = idx === highlightedIndex;
          return (
            <div
              key={item.id}
              id={`mention-item-${idx}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectMention(item, scope);
              }}
              onMouseEnter={() => onHighlightIndex(idx)}
              className={`px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                isHighlighted
                  ? isDark
                    ? 'bg-amber-500/20 text-white'
                    : 'bg-amber-50 text-slate-900'
                  : isDark
                    ? 'hover:bg-white/5 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
              }`}
              style={{
                borderLeft: isHighlighted ? '3px solid #d4a84b' : '3px solid transparent',
              }}
            >
              <div className="relative shrink-0">
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt={item.displayName} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-sm"
                    style={{ background: item.color || '#d4a84b' }}
                  >
                    {item.avatarText || '@'}
                  </div>
                )}
                {item.type === 'staff' && item.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-neutral-900" />
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.nickname ? (
                    <>
                      <span className="font-extrabold text-[13px] text-emerald-400 truncate">{item.nickname}</span>
                      <span className="text-[11px] text-slate-400 truncate font-normal">({item.realName})</span>
                    </>
                  ) : (
                    <span className="font-semibold text-[13px] truncate">{item.displayName}</span>
                  )}
                  {item.role && (
                    <span
                      className="px-1.5 py-0.2 rounded text-[10px] font-medium shrink-0"
                      style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        color: item.color || token.colorTextSecondary,
                      }}
                    >
                      {item.role}
                    </span>
                  )}
                </div>
                {item.username && <div className="text-[11px] opacity-60 truncate font-mono">@{item.username}</div>}
              </div>

              <div
                className="shrink-0 text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: isHighlighted
                    ? 'rgba(212, 168, 75, 0.28)'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.05)',
                  color: isHighlighted ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                @{item.tagText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
