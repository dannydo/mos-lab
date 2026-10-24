'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { AtSign, X, UserPlus, Users, AlertCircle } from 'lucide-react';
import { message as antdMessage } from 'antd';
import { useMosChat } from '../context/MosChatContext';
import { removeVietnameseTones } from '@mos-lab/shared';
import { isStaffInConversationMembers } from '../utils/chat-helpers';

export interface MosChatMentionCandidate {
  id: string;
  type: 'special' | 'staff';
  staffId?: number;
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
  isGroupMember: boolean; // TRUE: thành viên trong nhóm. FALSE: ngoài nhóm (cần mời vào nhóm trước)
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
  const { activeConversation, staffDirectory, currentUser, addMemberToSpace } = useMosChat();

  const [dismissedAtIndex, setDismissedAtIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<number>(() => text.length);
  const [pendingInviteCandidate, setPendingInviteCandidate] = useState<MosChatMentionCandidate | null>(null);
  const [isInviting, setIsInviting] = useState<boolean>(false);

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

  // Danh sách ứng viên: phân định rõ thành viên trong nhóm vs ngoài nhóm
  const candidates = useMemo<MosChatMentionCandidate[]>(() => {
    const list: MosChatMentionCandidate[] = [];

    // Tập hợp ID thành viên hiện tại trong Không gian (Space) hoặc Cuộc hội thoại (DM)
    const isSpace = activeConversation?.type === 'space';
    const memberIds = Array.isArray(activeConversation?.memberIds) ? activeConversation.memberIds.map(Number) : [];
    const membersList = Array.isArray(activeConversation?.members)
      ? activeConversation.members.map((m) => Number(m.id))
      : [];

    const memberSet = new Set<number>([...memberIds, ...membersList]);

    // 1. Trong Space: Thêm tag @All (Chỉ áp dụng trong nhóm)
    if (isSpace) {
      list.push({
        id: 'all',
        type: 'special',
        tagText: 'All',
        displayName: 'All (Tất cả mọi người)',
        role: 'Toàn nhóm',
        color: '#3b82f6',
        avatarText: '👥',
        isGroupMember: true,
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
      isGroupMember: true,
    });

    // 3. Danh sách đồng nghiệp từ danh bạ
    const directory = Array.isArray(staffDirectory) ? staffDirectory : [];
    const myId = Number(currentUser?.id) || 0;
    const peerId = Number(activeConversation?.participantStaffId) || 0;

    for (const s of directory) {
      if (!s || !s.id) continue;
      const realName = s.displayName || s.username || `Nhân sự #${s.id}`;
      const badge = getRoleBadgeInfo(s.role);
      const nick =
        isSpace && activeConversation?.memberNicknames
          ? activeConversation.memberNicknames[String(s.id)]?.trim()
          : undefined;

      const tagText = nick || realName;
      const displayName = nick ? `${nick} (${realName})` : realName;

      // Xác định trạng thái thành viên nhóm
      let isGroupMember = false;
      if (isSpace) {
        // Trong Không gian: kiểm tra thành viên nhóm thông minh (hỗ trợ Dual-Account)
        isGroupMember = isStaffInConversationMembers(s, activeConversation, directory);
      } else if (activeConversation?.type === 'dm') {
        // Trong 1-1 DM: chỉ người trò chuyện cùng (peer) hoặc chính mình là trong cuộc trò chuyện
        isGroupMember = s.id === peerId || s.id === myId || memberSet.has(s.id);
      } else {
        isGroupMember = true;
      }

      list.push({
        id: `staff-${s.id}`,
        type: 'staff',
        staffId: s.id,
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
        isGroupMember,
      });
    }

    // Sắp xếp: Thành viên trong nhóm lên trước, online lên trước, sau đó theo tên ABC
    return list.sort((a, b) => {
      if (a.isGroupMember !== b.isGroupMember) {
        return a.isGroupMember ? -1 : 1;
      }
      const aOn = a.isOnline ? 1 : 0;
      const bOn = b.isOnline ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn;
      return (a.displayName || a.tagText).localeCompare(b.displayName || b.tagText, 'vi');
    });
  }, [activeConversation, staffDirectory, currentUser]);

  // Phân tách thành viên trong nhóm và ngoài nhóm theo từ khóa tìm kiếm
  const { filteredInGroup, filteredOutsideGroup } = useMemo(() => {
    if (!mentionMatch) return { filteredInGroup: [], filteredOutsideGroup: [] };
    const query = mentionMatch.query.trim().toLowerCase();
    const qNorm = removeVietnameseTones(query);

    const matchesQuery = (item: MosChatMentionCandidate) => {
      if (!query) return true;
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
    };

    const inGroup = candidates.filter((c) => c.isGroupMember && matchesQuery(c));

    // Chỉ tìm kiếm người ngoài nhóm khi người dùng đã gõ từ khóa tìm kiếm cụ thể
    const outsideGroup = query.length > 0 ? candidates.filter((c) => !c.isGroupMember && matchesQuery(c)) : [];

    return {
      filteredInGroup: inGroup.slice(0, 8),
      filteredOutsideGroup: outsideGroup.slice(0, 6),
    };
  }, [candidates, mentionMatch]);

  const totalVisible = filteredInGroup.length + filteredOutsideGroup.length;
  const isVisible = Boolean(mentionMatch) && mentionMatch?.atIndex !== dismissedAtIndex && totalVisible > 0;

  if (!isVisible || !mentionMatch) return null;

  // Xử lý chèn cú pháp @tag vào tin nhắn (chỉ dùng cho thành viên trong nhóm)
  const insertMentionTag = (item: MosChatMentionCandidate) => {
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

  // Click vào ứng viên: Nếu là thành viên trong nhóm -> tag ngay; Nếu ngoài nhóm -> bắt buộc mời vào nhóm trước
  const handleCandidateClick = (item: MosChatMentionCandidate) => {
    if (item.isGroupMember) {
      insertMentionTag(item);
      return;
    }

    // Nếu người này ngoài nhóm, hiển thị modal xác nhận mời vào nhóm trước
    setPendingInviteCandidate(item);
  };

  // Xác nhận mời vào nhóm và tự động tag sau khi mời thành công
  const handleConfirmInviteAndTag = async () => {
    if (!pendingInviteCandidate || !pendingInviteCandidate.staffId) return;

    if (activeConversation?.type !== 'space') {
      antdMessage.info('Không thể mời người khác vào cuộc trò chuyện 1-1. Bạn hãy tạo Không gian riêng nhé!');
      setPendingInviteCandidate(null);
      return;
    }

    setIsInviting(true);
    try {
      if (addMemberToSpace) {
        await addMemberToSpace(pendingInviteCandidate.staffId);
      }
      antdMessage.success(`Đã mời ${pendingInviteCandidate.displayName} vào nhóm #${activeConversation.name}`);
      insertMentionTag(pendingInviteCandidate);
      setPendingInviteCandidate(null);
    } catch {
      antdMessage.error('Không thể mời đồng nghiệp vào nhóm. Vui lòng thử lại!');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <>
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
              {totalVisible}
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

        {/* Danh sách thành viên */}
        <div className="max-h-56 overflow-y-auto overscroll-contain divide-y divide-slate-800/50">
          {/* PHẦN 1: THÀNH VIÊN TRONG NHÓM (Tag trực tiếp) */}
          {filteredInGroup.length > 0 && (
            <div>
              <div className="px-3 py-1 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>Thành viên trong nhóm ({filteredInGroup.length})</span>
              </div>
              {filteredInGroup.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => handleCandidateClick(item)}
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

                  {/* Thông tin */}
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
                    {item.username && (
                      <div className="text-[10px] text-slate-400 truncate font-mono">@{item.username}</div>
                    )}
                  </div>

                  {/* Tag preview pill */}
                  <div className="shrink-0 text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-300">
                    @{item.tagText}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* PHẦN 2: NGOÀI NHÓM (Bắt buộc mời vào nhóm trước) */}
          {filteredOutsideGroup.length > 0 && (
            <div className="border-t border-slate-800/80">
              <div className="px-3 py-1 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  <span>Ngoài nhóm · Phải mời trước ({filteredOutsideGroup.length})</span>
                </span>
                <span className="text-[9.5px] font-normal normal-case opacity-80">Chưa vào nhóm</span>
              </div>
              {filteredOutsideGroup.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => handleCandidateClick(item)}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-amber-500/10 active:bg-amber-500/20 transition-colors cursor-pointer min-h-[44px] opacity-85"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0 grayscale opacity-80">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.displayName} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-sm"
                        style={{ background: item.color || '#64748b' }}
                      >
                        {item.avatarText || '@'}
                      </div>
                    )}
                  </div>

                  {/* Thông tin */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-slate-300 truncate">{item.displayName}</span>
                      {item.role && (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium shrink-0 bg-slate-800/80 border border-slate-700/60 text-slate-400">
                          {item.role}
                        </span>
                      )}
                    </div>
                    {item.username && (
                      <div className="text-[10px] text-slate-500 truncate font-mono">@{item.username}</div>
                    )}
                  </div>

                  {/* Action: Mời vào nhóm */}
                  <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 active:scale-95 transition-transform">
                    <UserPlus className="w-3 h-3 text-amber-400" />
                    <span>Mời & Tag</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL XÁC NHẬN: MỜI VÀO NHÓM TRƯỚC KHI TAG (iPhone 12 Dialog) */}
      {pendingInviteCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận mời vào nhóm"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2.5 text-amber-400">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Mời vào nhóm trước</h3>
                <p className="text-[11px] text-slate-400">Yêu cầu quyền thành viên</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Đồng nghiệp <span className="font-semibold text-white">{pendingInviteCandidate.displayName}</span> chưa
              tham gia nhóm <span className="font-semibold text-amber-400">#{activeConversation?.name}</span>.
              <br />
              <span className="text-slate-400 mt-1 inline-block">
                Bạn cần mời vào nhóm trước để có thể nhắc tên trong cuộc trò chuyện này.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPendingInviteCandidate(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 active:scale-95 transition-transform"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isInviting}
                onClick={handleConfirmInviteAndTag}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 active:scale-95 disabled:opacity-50 transition-transform shadow-md shadow-amber-500/20"
              >
                {isInviting ? 'Đang mời...' : 'Mời & Nhắc tên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
