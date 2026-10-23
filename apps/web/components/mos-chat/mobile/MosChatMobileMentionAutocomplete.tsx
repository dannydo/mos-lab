'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { AtSign, X } from 'lucide-react';
import { useMosChat } from '../context/MosChatContext';
import { removeVietnameseTones } from '@mos-lab/shared';

export interface MosChatMentionCandidate {
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

export interface MosChatMobileMentionAutocompleteProps {
  text: string;
  onSelectMention: (nextText: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onClose?: () => void;
  className?: string;
}

/**
 * Trích xuất truy vấn @mention tại vị trí con trỏ trong đoạn văn bản.
 * Hỗ trợ unicode tiếng Việt có dấu và khoảng trắng đơn.
 */
export function getMentionQueryAtCursor(
  text: string,
  cursor: number
): { query: string; atIndex: number; cursorIndex: number } | null {
  if (!text || cursor < 0) return null;
  const textBeforeCursor = text.slice(0, cursor);
  const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\u00C0-\u1EF9\s]*)$/u);
  if (!match || match.index === undefined) return null;

  const rawMatch = match[0];
  const atOffset = rawMatch.indexOf('@');
  const atIndex = match.index + atOffset;
  const query = match[1];

  // Không mở mention nếu chứa ký tự xuống dòng, dài quá 25 ký tự hoặc quá 2 dấu cách
  if (query.includes('\n') || query.length > 25 || (query.match(/\s/g) || []).length > 2) {
    return null;
  }

  return { query, atIndex, cursorIndex: cursor };
}

/**
 * Lấy nhãn chức vụ chuẩn hóa theo văn hóa tôn trọng của Wings
 */
export function getRoleBadgeInfo(role?: string | null): { label: string; color: string } {
  const normalized = String(role || '')
    .toLowerCase()
    .trim();
  if (normalized === 'super_admin') return { label: 'Super Admin', color: '#d4a84b' };
  if (normalized === 'admin') return { label: 'Admin', color: '#a855f7' };
  if (normalized === 'telesales' || normalized === 'booker') return { label: 'Telesales', color: '#0ea5e9' };
  if (normalized === 'cc' || normalized === 'consultant') return { label: 'Tư Vấn (CC)', color: '#10b981' };
  if (normalized === 'technician' || normalized === 'ktv' || normalized === 'cv') {
    return { label: 'Chuyên Viên (CV)', color: '#14b8a6' };
  }
  return { label: role ? role.toUpperCase() : 'Nhân sự', color: '#3b82f6' };
}

function getInitials(name?: string, fallback?: string): string {
  const clean = String(name || '')
    .replace(/\s*\(.*?\)\s*$/i, '')
    .trim();
  if (!clean) return fallback?.slice(0, 2).toUpperCase() || 'U';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export const MosChatMobileMentionAutocomplete: React.FC<MosChatMobileMentionAutocompleteProps> = ({
  text,
  onSelectMention,
  textareaRef,
  onClose,
  className = '',
}) => {
  const { activeConversation, staffDirectory, currentUser } = useMosChat();

  const [dismissedAtIndex, setDismissedAtIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<number>(() => text.length);

  // Lắng nghe vị trí con trỏ của textarea khi người dùng gõ phím hoặc chạm
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const updateCursor = () => {
      setCursorPos(el.selectionEnd ?? text.length);
    };

    el.addEventListener('keyup', updateCursor);
    el.addEventListener('click', updateCursor);
    el.addEventListener('select', updateCursor);

    return () => {
      el.removeEventListener('keyup', updateCursor);
      el.removeEventListener('click', updateCursor);
      el.removeEventListener('select', updateCursor);
    };
  }, [textareaRef, text]);

  // Phân tích trạng thái @mention tại vị trí hiện tại
  const mentionMatch = useMemo(() => {
    const currentCursor = textareaRef.current?.selectionEnd ?? cursorPos;
    return getMentionQueryAtCursor(text, currentCursor);
  }, [text, cursorPos, textareaRef]);

  // Reset trạng thái dismissed khi xoá ký tự @
  useEffect(() => {
    if (!mentionMatch) {
      setDismissedAtIndex(null);
    }
  }, [mentionMatch]);

  // Danh sách ứng viên có thể tag
  const candidates = useMemo<MosChatMentionCandidate[]>(() => {
    const list: MosChatMentionCandidate[] = [];

    // 1. Trong Space: Thêm tag @All (Toàn bộ thành viên)
    if (activeConversation?.type === 'space') {
      list.push({
        id: 'all',
        type: 'special',
        tagText: 'All',
        displayName: 'All (Tất cả mọi người)',
        role: 'Toàn nhóm',
        color: '#3b82f6',
        avatarText: '👥',
      });
    }

    // 2. Thêm tag @MAI (mOS AI Copilot)
    list.push({
      id: 'mai',
      type: 'special',
      tagText: 'MAI',
      displayName: 'MAI (mOS AI Copilot)',
      role: 'Trợ lý AI',
      color: '#8b5cf6',
      avatarText: '🤖',
    });

    // 3. Danh sách đồng nghiệp từ danh bạ
    const directory = Array.isArray(staffDirectory) ? staffDirectory : [];

    let memberSet: Set<number> | null = null;
    if (
      activeConversation?.type === 'space' &&
      Array.isArray(activeConversation.memberIds) &&
      activeConversation.memberIds.length > 0
    ) {
      memberSet = new Set(activeConversation.memberIds.map(Number));
    }

    const sortedStaff = [...directory].sort((a, b) => {
      if (memberSet) {
        const aIn = memberSet.has(a.id) ? 1 : 0;
        const bIn = memberSet.has(b.id) ? 1 : 0;
        if (aIn !== bIn) return bIn - aIn;
      }
      const aOn = a.isOnline ? 1 : 0;
      const bOn = b.isOnline ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn;
      return (a.displayName || a.username).localeCompare(b.displayName || b.username, 'vi');
    });

    for (const s of sortedStaff) {
      if (!s || !s.id) continue;
      const realName = s.displayName || s.username || `Nhân sự #${s.id}`;
      const badge = getRoleBadgeInfo(s.role);
      const nick =
        activeConversation?.type === 'space' && activeConversation.memberNicknames
          ? activeConversation.memberNicknames[String(s.id)]?.trim()
          : undefined;

      const tagText = nick || realName;
      const displayName = nick ? `${nick} (${realName})` : realName;

      list.push({
        id: `staff-${s.id}`,
        type: 'staff',
        tagText,
        displayName,
        realName,
        nickname: nick,
        username: s.username,
        role: badge.label,
        color: badge.color,
        avatarUrl: s.avatarUrl,
        avatarText: getInitials(tagText, s.username),
        isOnline: s.isOnline,
      });
    }

    return list;
  }, [activeConversation, staffDirectory]);

  // Lọc theo từ khóa tìm kiếm phía sau @
  const filteredMentions = useMemo<MosChatMentionCandidate[]>(() => {
    if (!mentionMatch) return [];
    const query = mentionMatch.query.trim().toLowerCase();
    if (!query) {
      return candidates.slice(0, 8);
    }

    const qNorm = removeVietnameseTones(query);

    return candidates
      .filter((item) => {
        const dName = item.displayName.toLowerCase();
        const dNameNorm = removeVietnameseTones(dName);
        const tag = item.tagText.toLowerCase();
        const tagNorm = removeVietnameseTones(tag);
        const real = (item.realName || '').toLowerCase();
        const realNorm = removeVietnameseTones(real);
        const uname = (item.username || '').toLowerCase();

        return (
          dName.includes(query) ||
          dNameNorm.includes(qNorm) ||
          tag.includes(query) ||
          tagNorm.includes(qNorm) ||
          real.includes(query) ||
          realNorm.includes(qNorm) ||
          uname.includes(query)
        );
      })
      .slice(0, 8);
  }, [candidates, mentionMatch]);

  // Kiểm tra điều kiện hiển thị
  const isVisible = Boolean(mentionMatch) && mentionMatch?.atIndex !== dismissedAtIndex && filteredMentions.length > 0;

  if (!isVisible || !mentionMatch) return null;

  const handleSelect = (item: MosChatMentionCandidate) => {
    const textarea = textareaRef.current;
    const currentVal = textarea?.value ?? text;
    const cursor = textarea?.selectionEnd ?? currentVal.length;

    const match = getMentionQueryAtCursor(currentVal, cursor);
    const atIdx = match ? match.atIndex : currentVal.lastIndexOf('@');
    const cursorIdx = match ? match.cursorIndex : cursor;

    const before = currentVal.slice(0, Math.max(0, atIdx));
    const after = currentVal.slice(cursorIdx);
    const inserted = `@${item.tagText} `;
    const nextVal = `${before}${inserted}${after}`;

    onSelectMention(nextVal);
    setDismissedAtIndex(atIdx);

    if (textarea) {
      textarea.value = nextVal;
      const newPos = before.length + inserted.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(120, textarea.scrollHeight)}px`;
      });
    }

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(10);
    }
  };

  return (
    <div
      role="listbox"
      aria-label="Danh sách gợi ý nhắc tên"
      className={`mos-chat-mobile-mention-dropdown absolute bottom-full left-0 right-0 mb-2 z-50 rounded-2xl shadow-2xl border border-slate-700/80 bg-slate-900/98 backdrop-blur-xl overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-bottom-2 select-none ${className}`}
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)',
        touchAction: 'pan-y',
      }}
    >
      {/* Header bar */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-800/50 text-[11px] font-semibold">
        <div className="flex items-center gap-1.5 text-amber-400">
          <AtSign className="w-3.5 h-3.5" />
          <span className="uppercase font-bold tracking-wider">Nhắc tên</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[10px] tabular-nums font-mono">
            {filteredMentions.length}
          </span>
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setDismissedAtIndex(mentionMatch.atIndex);
            onClose?.();
          }}
          className="p-1 text-slate-400 hover:text-white rounded-full active:scale-95"
          aria-label="Đóng gợi ý nhắc tên"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Danh sách thành viên gợi ý */}
      <div className="max-h-52 overflow-y-auto divide-y divide-slate-800/50 overscroll-contain">
        {filteredMentions.map((item) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected="false"
            onPointerDown={(e) => {
              // Ngăn chặn iOS Safari làm mờ (blur) textarea
              e.preventDefault();
            }}
            onClick={() => handleSelect(item)}
            className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-white/5 active:bg-amber-500/20 transition-colors cursor-pointer min-h-[44px]"
          >
            {/* Avatar */}
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
              {item.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              )}
            </div>

            {/* Thông tin tên & vai trò */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs text-white truncate">{item.displayName}</span>
                {item.role && (
                  <span
                    className="px-1.5 py-0.2 rounded text-[9.5px] font-medium shrink-0 bg-slate-800 border border-slate-700/60"
                    style={{ color: item.color }}
                  >
                    {item.role}
                  </span>
                )}
              </div>
              {item.username && <div className="text-[10px] text-slate-400 truncate font-mono">@{item.username}</div>}
            </div>

            {/* Pill tag cú pháp preview */}
            <div className="shrink-0 text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-300">
              @{item.tagText}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
