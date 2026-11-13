'use client';

import React, { useMemo, useState, useRef } from 'react';
import {
  Search,
  X,
  Hash,
  MessageSquare,
  Users,
  Sparkles,
  CheckSquare,
  UserPlus,
  MessageSquareReply,
  Pin,
  PinOff,
  MoreVertical,
} from 'lucide-react';
import { Modal } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMosChat } from '../context/MosChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { removeVietnameseTones, type MosChatConversation, type MosChatStaffMember } from '@mos-lab/shared';
import { formatChatPreviewWithStickers } from '../mos-chat-stickers';
import { AI_COPILOT_CONV_ID, isSpaceEmoji } from '../constants/chat-constants';
import { MosChatAvatar } from '../MosChatAvatar';

dayjs.extend(relativeTime);

const formatStaffRole = (role?: string) => {
  if (!role) return 'Nhân viên';
  const r = role.toLowerCase();
  if (r.includes('cv') || r.includes('chuyên viên')) return 'Chuyên Viên';
  if (r.includes('cc') || r.includes('tư vấn')) return 'Tư Vấn CC';
  if (r.includes('telesales') || r.includes('sale')) return 'Telesales';
  if (r.includes('admin') || r.includes('quản lý')) return 'Quản Lý';
  return role;
};

export interface MosChatMobileInboxProps {
  onOpenSearchSheet?: (initialQuery?: string) => void;
}

export const MosChatMobileInbox: React.FC<MosChatMobileInboxProps> = ({ onOpenSearchSheet }) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const {
    conversations,
    activeConvId,
    setActiveConvId,
    sidebarFilter,
    setSidebarFilter,
    searchQuery,
    setSearchQuery,
    setMobileView,
    setActiveSubtab,
    staffDirectory,
    currentUser,
    startDirectMessage,
    pinnedConvIds,
    togglePinConversation,
    markConversationAsRead,
  } = useMosChat();

  const [newDmModalOpen, setNewDmModalOpen] = useState<boolean>(false);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [modalDeptFilter, setModalDeptFilter] = useState<'ALL' | 'CV' | 'CC' | 'TELESALES' | 'ADMIN'>('ALL');
  const [convActionTarget, setConvActionTarget] = useState<MosChatConversation | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    const list = conversations.filter((c) => {
      // Search filter with Vietnamese tone insensitivity
      if (searchQuery.trim()) {
        const normQ = removeVietnameseTones(searchQuery.toLowerCase().trim());
        const matchName = removeVietnameseTones(c.name.toLowerCase()).includes(normQ);
        const matchSubtitle = c.subtitle ? removeVietnameseTones(c.subtitle.toLowerCase()).includes(normQ) : false;
        const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].text : '';
        const matchLast = removeVietnameseTones(lastMsg.toLowerCase()).includes(normQ);
        if (!matchName && !matchSubtitle && !matchLast) return false;
      }

      // Tab filter
      if (sidebarFilter === 'unread') return (c.unreadCount || 0) > 0;
      if (sidebarFilter === 'spaces') return c.type === 'space';
      if (sidebarFilter === 'dms') return c.type === 'dm';
      if (sidebarFilter === 'pinned') return Boolean(pinnedConvIds?.has(c.id));

      return true;
    });

    return [...list].sort((a, b) => {
      if (a.id === AI_COPILOT_CONV_ID) return -1;
      if (b.id === AI_COPILOT_CONV_ID) return 1;

      // Pinned conversations always bubble up to the top!
      const aPinned = Boolean(pinnedConvIds?.has(a.id));
      const bPinned = Boolean(pinnedConvIds?.has(b.id));
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      return 0;
    });
  }, [conversations, searchQuery, sidebarFilter, pinnedConvIds]);

  // Colleagues matching main search query
  const matchedStaffFromSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const normQ = removeVietnameseTones(searchQuery.toLowerCase().trim());
    const myId = Number(currentUser?.id) || 0;
    return (staffDirectory || []).filter((s) => {
      if (Number(s.id) === myId) return false;
      const name = removeVietnameseTones((s.displayName || s.username || '').toLowerCase());
      const role = removeVietnameseTones((s.role || '').toLowerCase());
      return name.includes(normQ) || role.includes(normQ);
    });
  }, [staffDirectory, searchQuery, currentUser]);

  // Colleagues inside New DM Modal
  const modalStaffList = useMemo(() => {
    const myId = Number(currentUser?.id) || 0;
    return (staffDirectory || []).filter((s) => {
      if (Number(s.id) === myId) return false;

      // Filter by department
      if (modalDeptFilter !== 'ALL') {
        const r = (s.role || '').toLowerCase();
        if (modalDeptFilter === 'CV' && !r.includes('cv') && !r.includes('chuyên viên')) return false;
        if (modalDeptFilter === 'CC' && !r.includes('cc') && !r.includes('tư vấn')) return false;
        if (modalDeptFilter === 'TELESALES' && !r.includes('telesales') && !r.includes('sale')) return false;
        if (modalDeptFilter === 'ADMIN' && !r.includes('admin') && !r.includes('quản lý')) return false;
      }

      // Filter by search query with Vietnamese tone insensitivity
      if (modalSearchQuery.trim()) {
        const normQ = removeVietnameseTones(modalSearchQuery.toLowerCase().trim());
        const name = removeVietnameseTones((s.displayName || s.username || '').toLowerCase());
        const role = removeVietnameseTones((s.role || '').toLowerCase());
        return name.includes(normQ) || role.includes(normQ);
      }

      return true;
    });
  }, [staffDirectory, modalDeptFilter, modalSearchQuery, currentUser]);

  const handleSelectConv = (convId: string) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(10);
    }
    setActiveConvId(convId);
    setMobileView('room');
  };

  const handleStartDmWithStaff = async (staff: MosChatStaffMember) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(15);
    }
    setNewDmModalOpen(false);
    setModalSearchQuery('');
    setSearchQuery('');
    await startDirectMessage(staff);
  };

  const renderConversationItem = (c: MosChatConversation, index: number) => {
    const isSelected = c.id === activeConvId;
    const isSpace = c.type === 'space';
    const isAiCopilot = c.id === 'dm-wings-ai-copilot';
    const unread = c.unreadCount || 0;
    const isPinned = Boolean(pinnedConvIds?.has(c.id));

    // Time formatting from last message or updatedAt
    const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
    let timeStr = '';
    if (lastMsg?.createdAt || c.updatedAt) {
      const dt = dayjs(lastMsg?.createdAt || c.updatedAt);
      const isToday = dt.isSame(dayjs(), 'day');
      timeStr = isToday ? dt.format('HH:mm') : dt.format('DD/MM');
    }

    const previewRaw = lastMsg?.text || c.subtitle || 'Chưa có tin nhắn mới';
    const preview = formatChatPreviewWithStickers(previewRaw);

    const prevItem = index > 0 ? filteredConversations[index - 1] : null;
    const isPrevPinned = prevItem ? Boolean(pinnedConvIds?.has(prevItem.id)) : false;
    const showPinnedSubHeader =
      sidebarFilter !== 'pinned' && isPinned && (!prevItem || prevItem.id === AI_COPILOT_CONV_ID);
    const showUnpinnedSubHeader =
      sidebarFilter !== 'pinned' &&
      !isPinned &&
      c.id !== AI_COPILOT_CONV_ID &&
      isPrevPinned;

    return (
      <React.Fragment key={c.id}>
        {showPinnedSubHeader && (
          <div
            className={`px-4 py-1.5 bg-[var(--mos-surface)] border-b border-[var(--mos-surface-border)] flex items-center justify-between text-[11px] font-bold uppercase tracking-wider select-none ${
              isDark ? 'text-amber-400' : 'text-amber-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Pin className={`w-3 h-3 ${isDark ? 'fill-amber-400' : 'fill-amber-600'}`} />
              Đã ghim
            </span>
            <span className="text-[10px] text-[var(--mos-text-muted)] font-normal lowercase">Luôn hiển thị ở đầu</span>
          </div>
        )}

        {showUnpinnedSubHeader && (
          <div className="px-4 py-1.5 bg-[var(--mos-surface-muted)] border-b border-[var(--mos-surface-border)] text-[11px] font-bold text-[var(--mos-text-muted)] uppercase tracking-wider select-none">
            {sidebarFilter === 'spaces'
              ? 'Không gian khác'
              : sidebarFilter === 'dms'
                ? 'Tin nhắn trực tiếp khác'
                : 'Tất cả cuộc trò chuyện'}
          </div>
        )}

        <div
          onClick={() => handleSelectConv(c.id)}
          onTouchStart={() => {
            longPressTimerRef.current = setTimeout(() => {
              if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate?.(25);
              }
              setConvActionTarget(c);
            }, 450);
          }}
          onTouchMove={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }}
          onTouchEnd={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setConvActionTarget(c);
          }}
          role="button"
          tabIndex={0}
          className={`w-full px-4 py-3 flex items-center gap-3 active:bg-[var(--mos-surface-muted)] transition-colors border-b border-[var(--mos-surface-border)] select-none ${
            isSelected
              ? 'bg-[var(--mos-surface-raised)]'
              : isPinned
                ? 'bg-amber-500/[0.04]'
                : 'bg-transparent'
          }`}
          style={{
            borderLeft: isPinned ? '3px solid #f59e0b' : undefined,
          }}
        >
          {/* Avatar or Icon */}
          <div className="relative shrink-0">
            {isAiCopilot ? (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
            ) : isSpace ? (
              <div
                className="w-12 h-12 rounded-2xl border flex items-center justify-center font-bold text-2xl shadow-sm"
                style={{
                  background: `${c.color || '#f59e0b'}22`,
                  borderColor: `${c.color || '#f59e0b'}44`,
                  color: c.color || '#f59e0b',
                }}
              >
                {c.avatar && isSpaceEmoji(c.avatar) ? (
                  <span className="select-none leading-none">{c.avatar}</span>
                ) : (
                  <Hash className="w-6 h-6" />
                )}
              </div>
            ) : (
              <MosChatAvatar
                size={48}
                shape="square"
                src={c.avatar}
                name={c.name}
                staffId={c.participantStaffId}
                staffDirectory={staffDirectory}
                showOnline={true}
                isOnline={true}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3
                  className={`text-sm font-semibold truncate ${
                    unread > 0 ? 'text-[var(--mos-text)]' : isDark ? 'text-slate-200' : 'text-[var(--mos-text)]'
                  }`}
                >
                  {c.name}
                </h3>
                {isPinned && (
                  <Pin
                    className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400 fill-amber-400' : 'text-amber-600 fill-amber-600'}`}
                    aria-label="Đã ghim"
                  />
                )}
              </div>
              {timeStr && (
                <span
                  className={`text-[11px] shrink-0 tabular-nums ${
                    unread > 0 ? `${isDark ? 'text-amber-400' : 'text-amber-600'} font-semibold` : 'text-[var(--mos-text-muted)]'
                  }`}
                >
                  {timeStr}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p
                className={`text-xs truncate ${
                  unread > 0 ? 'text-[var(--mos-text)] font-medium' : 'text-[var(--mos-text-muted)]'
                }`}
              >
                {preview}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                {(c.unreadThreadCount || 0) > 0 && (
                  <span
                    className={`h-[18px] px-1.5 flex items-center gap-0.5 justify-center text-[10px] font-bold border rounded-full tabular-nums ${
                      isDark
                        ? 'text-indigo-300 bg-indigo-500/25 border-indigo-500/40'
                        : 'text-indigo-700 bg-indigo-500/15 border-indigo-500/35'
                    }`}
                  >
                    <MessageSquareReply className="w-2.5 h-2.5" />
                    {c.unreadThreadCount}
                  </span>
                )}
                {unread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full tabular-nums shadow-sm shadow-rose-500/40">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
                {!isAiCopilot && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConvActionTarget(c);
                    }}
                    className="p-1 rounded-md text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] active:bg-[var(--mos-surface-muted)]"
                    aria-label="Tác vụ cuộc trò chuyện"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] text-[var(--mos-text)] overflow-hidden select-none">
      {/* Search Input Bar + New DM Button */}
      <div className="px-4 pt-2.5 pb-2 flex items-center gap-2">
        <div className="relative flex-1 flex items-center bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] rounded-xl px-3 py-2 text-sm text-[var(--mos-text)] focus-within:border-[var(--mos-accent)] transition-colors">
          <button
            type="button"
            onClick={() => onOpenSearchSheet?.(searchQuery.trim())}
            className="p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-transform cursor-pointer mr-2 shrink-0"
            aria-label="Tìm kiếm tin nhắn sâu"
            title="Tìm kiếm tin nhắn sâu"
          >
            <Search className="w-4 h-4 text-[var(--mos-accent)]" />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                onOpenSearchSheet?.(searchQuery.trim());
              }
            }}
            placeholder="Tìm kiếm đồng nghiệp, kênh, tin nhắn..."
            className="w-full bg-transparent border-none outline-none text-xs text-[var(--mos-text)] placeholder-[var(--mos-text-muted)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setNewDmModalOpen(true)}
          className="w-9 h-9 rounded-xl bg-[var(--mos-accent)] hover:opacity-90 text-[var(--mos-accent-contrast)] flex items-center justify-center font-bold active:scale-95 transition-transform shrink-0 shadow-sm cursor-pointer"
          title="Tin nhắn mới / Danh bạ"
          aria-label="Soạn tin nhắn DM mới"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Deep Message Search Banner when typing */}
      {searchQuery.trim() && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => onOpenSearchSheet?.(searchQuery.trim())}
            className={`w-full px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs active:scale-[0.98] transition-all cursor-pointer shadow-sm shadow-amber-500/10 text-left ${
              isDark ? 'text-amber-300' : 'text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className="truncate">
                Tìm <strong className={isDark ? 'text-amber-200' : 'text-amber-900'}>&ldquo;{searchQuery.trim()}&rdquo;</strong> trong toàn bộ tin nhắn...
              </span>
            </div>
            <span
              className={`text-[11px] font-bold bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                isDark ? 'text-amber-400' : 'text-amber-700'
              }`}
            >
              Tìm sâu ➔
            </span>
          </button>
        </div>
      )}

      {/* Filter Chips - Tin Trực Tiếp placed adjacent to Tất cả for instant mobile reach */}
      <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--mos-surface-border)]">
        <button
          type="button"
          aria-label="Kho Công việc & Nhắc hẹn (Tasks)"
          onClick={() => {
            setActiveSubtab('tasks');
            setMobileView('room');
          }}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-1.5 active:scale-95 transition-transform ${
            isDark ? 'text-amber-400' : 'text-amber-700'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Kho Công việc</span>
        </button>
        {(
          [
            { id: 'all', label: 'Tất cả' },
            { id: 'dms', label: 'Tin Trực Tiếp' },
            { id: 'spaces', label: 'Kênh Không Gian' },
            { id: 'unread', label: 'Chưa đọc' },
            {
              id: 'pinned',
              label:
                pinnedConvIds && pinnedConvIds.size > 0
                  ? `Đã ghim (${pinnedConvIds.size})`
                  : 'Đã ghim',
            },
          ] as const
        ).map((chip) => {
          const active = sidebarFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setSidebarFilter(chip.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                active
                  ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold shadow-sm'
                  : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] border border-[var(--mos-surface-border)]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Search Result & Conversation List */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-[var(--mos-surface-border)]">
        {/* Matching Colleagues Section when searching */}
        {searchQuery.trim() && matchedStaffFromSearch.length > 0 && (
          <div className="bg-[var(--mos-surface-muted)] border-b border-[var(--mos-surface-border)]">
            <div
              className={`px-4 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider bg-[var(--mos-surface)] ${
                isDark ? 'text-amber-400' : 'text-amber-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Đồng nghiệp ({matchedStaffFromSearch.length})
              </span>
              <span className="text-[10px] text-[var(--mos-text-muted)] font-normal lowercase">Chạm để nhắn DM</span>
            </div>
            <div className="divide-y divide-[var(--mos-surface-border)]">
              {matchedStaffFromSearch.map((staff) => {
                const staffName = staff.displayName || staff.username || `Nhân sự #${staff.id}`;
                return (
                  <div
                    key={`search-staff-${staff.id}`}
                    onClick={() => handleStartDmWithStaff(staff)}
                    role="button"
                    tabIndex={0}
                    className="w-full px-4 py-3 flex items-center gap-3 active:bg-[var(--mos-surface-raised)] hover:bg-[var(--mos-surface-muted)] transition-colors select-none cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <MosChatAvatar
                        size={44}
                        shape="square"
                        showOnline
                        isOnline={Boolean(staff.isOnline ?? true)}
                        src={staff.avatarUrl}
                        name={staffName}
                        staffId={staff.id}
                        username={staff.username}
                        staffDirectory={staffDirectory}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <h4 className="text-sm font-semibold text-[var(--mos-text)] truncate">{staffName}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 border border-amber-500/30 shrink-0 ${
                            isDark ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          {formatStaffRole(staff.role)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--mos-text-muted)] truncate flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-[var(--mos-text-muted)] shrink-0" />
                        <span>Mở cuộc trò chuyện trực tiếp 1-1</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section title for conversations when searching */}
        {searchQuery.trim() && filteredConversations.length > 0 && (
          <div className="px-4 py-2 bg-[var(--mos-surface)] text-[11px] font-bold uppercase tracking-wider text-[var(--mos-text-muted)] border-b border-[var(--mos-surface-border)] flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-[var(--mos-text-muted)]" />
            Kênh & Cuộc trò chuyện ({filteredConversations.length})
          </div>
        )}

        {/* Conversation List or Empty State */}
        {filteredConversations.length === 0 && (!searchQuery.trim() || matchedStaffFromSearch.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--mos-text-muted)] mt-12">
            <MessageSquare className="w-12 h-12 text-[var(--mos-text-muted)] opacity-50 mb-3" />
            <p className="text-sm font-medium text-[var(--mos-text)]">Không tìm thấy cuộc trò chuyện hay đồng nghiệp nào</p>
            <p className="text-xs text-[var(--mos-text-muted)] mt-1">Thử đổi từ khóa hoặc chạm nút (+) để tìm danh bạ</p>
          </div>
        ) : (
          filteredConversations.map(renderConversationItem)
        )}
      </div>

      {/* New DM & Colleague Directory Modal */}
      <Modal
        open={newDmModalOpen}
        onCancel={() => {
          setNewDmModalOpen(false);
          setModalSearchQuery('');
        }}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-[var(--mos-text)] font-bold text-base">
            <UserPlus className="w-5 h-5 text-[var(--mos-accent)]" />
            <span>Tin nhắn trực tiếp mới</span>
          </div>
        }
        centered
        className="mos-chat-dm-modal"
        styles={{
          content: {
            background: 'var(--mos-surface-raised)',
            border: '1px solid var(--mos-surface-border-strong)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--mos-text)',
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid var(--mos-surface-border)',
            paddingBottom: '0.75rem',
            marginBottom: '0.75rem',
          },
        }}
      >
        <div className="flex flex-col gap-3 min-h-0 flex-1">
          {/* Search inside modal */}
          <div className="relative flex items-center bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-xl px-3 py-2 text-sm text-[var(--mos-text)] focus-within:border-[var(--mos-accent)] transition-colors">
            <Search className="w-4 h-4 text-[var(--mos-text-muted)] shrink-0 mr-2" />
            <input
              type="text"
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full bg-transparent border-none outline-none text-xs text-[var(--mos-text)] placeholder-[var(--mos-text-muted)]"
              autoFocus
            />
            {modalSearchQuery && (
              <button
                type="button"
                onClick={() => setModalSearchQuery('')}
                className="p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {(
              [
                { id: 'ALL', label: 'Tất cả' },
                { id: 'CV', label: 'Chuyên Viên' },
                { id: 'CC', label: 'Tư Vấn CC' },
                { id: 'TELESALES', label: 'Telesales' },
                { id: 'ADMIN', label: 'Quản Lý' },
              ] as const
            ).map((dept) => {
              const active = modalDeptFilter === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setModalDeptFilter(dept.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all active:scale-95 ${
                    active
                      ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold shadow-sm'
                      : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] border border-[var(--mos-surface-border)]'
                  }`}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>

          {/* Staff List */}
          <div className="flex-1 overflow-y-auto max-h-[50vh] divide-y divide-[var(--mos-surface-border)] overscroll-contain pr-1">
            {/* Trợ lý mOS AI (MAI) direct shortcut */}
            {(modalDeptFilter === 'ALL' ||
              modalDeptFilter === 'ADMIN' ||
              !modalSearchQuery ||
              /mai|ai|copilot/i.test(modalSearchQuery)) && (
              <div
                onClick={() => {
                  setNewDmModalOpen(false);
                  handleSelectConv(AI_COPILOT_CONV_ID);
                }}
                role="button"
                tabIndex={0}
                className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[var(--mos-text)] truncate">🤖 MAI</p>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                          isDark
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-purple-500/15 text-purple-700 border-purple-500/35'
                        }`}
                      >
                        mOS AI
                      </span>
                    </div>
                    <p className={`text-xs truncate ${isDark ? 'text-purple-300/80' : 'text-purple-700/80'}`}>
                      Trợ lý AI · Tra cứu dữ liệu & Phân tích riêng tư
                    </p>
                  </div>
                </div>
                <Sparkles className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
            )}

            {modalStaffList.length === 0 ? (
              <div className="py-8 text-center text-[var(--mos-text-muted)]">
                <Users className="w-8 h-8 opacity-50 mx-auto mb-2" />
                <p className="text-xs">Không tìm thấy đồng nghiệp phù hợp</p>
              </div>
            ) : (
              modalStaffList.map((staff) => {
                const staffName = staff.displayName || staff.username || `Nhân sự #${staff.id}`;
                return (
                  <div
                    key={`modal-staff-${staff.id}`}
                    onClick={() => handleStartDmWithStaff(staff)}
                    role="button"
                    tabIndex={0}
                    className="w-full py-2.5 px-2 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl transition-colors cursor-pointer"
                  >
                    <MosChatAvatar
                      size={40}
                      shape="square"
                      src={staff.avatarUrl}
                      name={staffName}
                      staffId={staff.id}
                      staffDirectory={staffDirectory}
                      showOnline={true}
                      isOnline={Boolean(staff.isOnline)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-semibold text-[var(--mos-text)] truncate">{staffName}</h4>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 border border-amber-500/30 shrink-0 ${
                            isDark ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          {formatStaffRole(staff.role)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--mos-text-muted)] truncate">Nhắn tin trực tiếp</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Conversation Action Bottom Sheet */}
      <Modal
        open={convActionTarget !== null}
        onCancel={() => setConvActionTarget(null)}
        footer={null}
        closable={false}
        centered={false}
        className="mos-chat-conv-action-modal !p-0 !m-0 !max-w-full"
        wrapClassName="flex items-end justify-center !p-0"
        styles={{
          content: {
            background: 'var(--mos-surface-raised)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            border: '1px solid var(--mos-surface-border-strong)',
            padding: '16px',
            width: '100%',
            maxWidth: '500px',
            margin: '0 auto',
            color: 'var(--mos-text)',
          },
        }}
      >
        {convActionTarget && (
          <div className="flex flex-col gap-3 select-none">
            <div className="w-10 h-1 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mb-1" />

            {/* Target Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--mos-surface-border)]">
              <div className="relative shrink-0">
                {convActionTarget.type === 'space' ? (
                  <div
                    className="w-11 h-11 rounded-2xl border flex items-center justify-center font-bold text-xl shadow-sm"
                    style={{
                      background: `${convActionTarget.color || '#f59e0b'}22`,
                      borderColor: `${convActionTarget.color || '#f59e0b'}44`,
                      color: convActionTarget.color || '#f59e0b',
                    }}
                  >
                    {convActionTarget.avatar && isSpaceEmoji(convActionTarget.avatar) ? (
                      <span>{convActionTarget.avatar}</span>
                    ) : (
                      <Hash className="w-5 h-5" />
                    )}
                  </div>
                ) : (
                  <MosChatAvatar
                    size={44}
                    shape="square"
                    src={convActionTarget.avatar}
                    name={convActionTarget.name}
                    staffId={convActionTarget.participantStaffId}
                    staffDirectory={staffDirectory}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-[var(--mos-text)] truncate">{convActionTarget.name}</h3>
                  {pinnedConvIds?.has(convActionTarget.id) && (
                    <Pin className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400 fill-amber-400' : 'text-amber-600 fill-amber-600'}`} />
                  )}
                </div>
                <p className="text-xs text-[var(--mos-text-muted)] truncate">
                  {convActionTarget.type === 'space' ? 'Kênh Không Gian' : 'Trò chuyện trực tiếp 1-1'}
                </p>
              </div>
            </div>

            {/* Actions List */}
            <div className="flex flex-col gap-1 py-1">
              {/* Toggle Pin Action */}
              <button
                type="button"
                onClick={() => {
                  const targetId = convActionTarget.id;
                  setConvActionTarget(null);
                  togglePinConversation(targetId);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl transition-colors font-medium cursor-pointer"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    pinnedConvIds?.has(convActionTarget.id)
                      ? `bg-amber-500/20 border border-amber-500/40 ${isDark ? 'text-amber-400' : 'text-amber-600'}`
                      : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)]'
                  }`}
                >
                  <Pin
                    className={`w-4 h-4 ${
                      pinnedConvIds?.has(convActionTarget.id)
                        ? `fill-current ${isDark ? 'text-amber-400' : 'text-amber-600'}`
                        : ''
                    }`}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold text-[var(--mos-text)]">
                    {pinnedConvIds?.has(convActionTarget.id)
                      ? convActionTarget.type === 'space'
                        ? 'Bỏ ghim Không gian này'
                        : 'Bỏ ghim cuộc trò chuyện này'
                      : convActionTarget.type === 'space'
                        ? '📌 Ghim Không gian lên đầu danh sách'
                        : '📌 Ghim cuộc trò chuyện lên đầu danh sách'}
                  </div>
                  <div className="text-[11px] text-[var(--mos-text-muted)]">
                    {pinnedConvIds?.has(convActionTarget.id)
                      ? 'Không gian sẽ trở về thứ tự thời gian bình thường'
                      : 'Không gian sẽ luôn hiển thị ở trên cùng danh sách'}
                  </div>
                </div>
              </button>

              {/* Mark Read Action */}
              <button
                type="button"
                onClick={() => {
                  const targetId = convActionTarget.id;
                  setConvActionTarget(null);
                  markConversationAsRead(targetId);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl transition-colors font-medium cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold text-[var(--mos-text)]">Đánh dấu đã đọc</div>
                  <div className="text-[11px] text-[var(--mos-text-muted)]">Xóa các thông báo chưa đọc của cuộc trò chuyện này</div>
                </div>
              </button>

              {/* Open Conversation */}
              <button
                type="button"
                onClick={() => {
                  const targetId = convActionTarget.id;
                  setConvActionTarget(null);
                  handleSelectConv(targetId);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 text-sm hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl transition-colors font-medium cursor-pointer ${
                  isDark ? 'text-emerald-300' : 'text-emerald-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center ${
                    isDark ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  <MessageSquareReply className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    Vào cuộc trò chuyện
                  </div>
                  <div className="text-[11px] text-[var(--mos-text-muted)]">Xem tin nhắn và trao đổi</div>
                </div>
              </button>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setConvActionTarget(null)}
              className="w-full py-2.5 mt-1 rounded-xl bg-[var(--mos-surface-muted)] text-[var(--mos-text)] font-semibold text-xs border border-[var(--mos-surface-border)] active:opacity-80 transition-opacity"
            >
              Đóng
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
