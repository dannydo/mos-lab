'use client';

import React, { useMemo, useState } from 'react';
import { Search, X, Hash, MessageSquare, Users, Sparkles, CheckSquare, UserPlus, MessageSquareReply } from 'lucide-react';
import { Modal } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMosChat } from '../context/MosChatContext';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { formatChatPreviewWithStickers } from '../mos-chat-stickers';
import { isSpaceEmoji } from '../constants/chat-constants';
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

export const MosChatMobileInbox: React.FC = () => {
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
  } = useMosChat();

  const [newDmModalOpen, setNewDmModalOpen] = useState<boolean>(false);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [modalDeptFilter, setModalDeptFilter] = useState<'ALL' | 'CV' | 'CC' | 'TELESALES' | 'ADMIN'>('ALL');

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSubtitle = c.subtitle?.toLowerCase().includes(q);
        const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].text : '';
        const matchLast = lastMsg.toLowerCase().includes(q);
        if (!matchName && !matchSubtitle && !matchLast) return false;
      }

      // Tab filter
      if (sidebarFilter === 'unread') return (c.unreadCount || 0) > 0;
      if (sidebarFilter === 'spaces') return c.type === 'space';
      if (sidebarFilter === 'dms') return c.type === 'dm';

      return true;
    });
  }, [conversations, searchQuery, sidebarFilter]);

  // Colleagues matching main search query
  const matchedStaffFromSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const myId = Number(currentUser?.id) || 0;
    return (staffDirectory || []).filter((s) => {
      if (Number(s.id) === myId) return false;
      const name = (s.displayName || s.username || '').toLowerCase();
      const role = (s.role || '').toLowerCase();
      return name.includes(q) || role.includes(q);
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

      // Filter by search query
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase().trim();
        const name = (s.displayName || s.username || '').toLowerCase();
        const role = (s.role || '').toLowerCase();
        return name.includes(q) || role.includes(q);
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

  const renderConversationItem = (c: MosChatConversation) => {
    const isSelected = c.id === activeConvId;
    const isSpace = c.type === 'space';
    const isAiCopilot = c.id === 'dm-wings-ai-copilot';
    const unread = c.unreadCount || 0;

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

    return (
      <div
        key={c.id}
        onClick={() => handleSelectConv(c.id)}
        role="button"
        tabIndex={0}
        className={`w-full px-4 py-3 flex items-center gap-3 active:bg-slate-800/80 transition-colors border-b border-slate-800/40 select-none ${
          isSelected ? 'bg-slate-800/50' : 'bg-transparent'
        }`}
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
              <h3 className={`text-sm font-semibold truncate ${unread > 0 ? 'text-white' : 'text-slate-200'}`}>
                {c.name}
              </h3>
            </div>
            {timeStr && (
              <span
                className={`text-[11px] shrink-0 tabular-nums ${unread > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}
              >
                {timeStr}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs truncate ${unread > 0 ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
              {preview}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {(c.unreadThreadCount || 0) > 0 && (
                <span className="h-[18px] px-1.5 flex items-center gap-0.5 justify-center text-[10px] font-bold text-indigo-300 bg-indigo-500/25 border border-indigo-500/40 rounded-full tabular-nums">
                  <MessageSquareReply className="w-2.5 h-2.5" />
                  {c.unreadThreadCount}
                </span>
              )}
              {unread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full tabular-nums shadow-sm shadow-rose-500/40">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Search Input Bar + New DM Button */}
      <div className="px-4 pt-2.5 pb-2 flex items-center gap-2">
        <div className="relative flex-1 flex items-center bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white focus-within:border-amber-400/80 transition-colors">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm đồng nghiệp, kênh, tin nhắn..."
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 text-slate-400 hover:text-white"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setNewDmModalOpen(true)}
          className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold active:scale-95 transition-transform shrink-0 shadow-sm shadow-amber-500/20"
          title="Tin nhắn mới / Danh bạ"
          aria-label="Soạn tin nhắn DM mới"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Chips - Tin Trực Tiếp placed adjacent to Tất cả for instant mobile reach */}
      <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-800/60">
        <button
          type="button"
          aria-label="Kho Công việc & Nhắc hẹn (Tasks)"
          onClick={() => {
            setActiveSubtab('tasks');
            setMobileView('room');
          }}
          className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-1.5 active:scale-95 transition-transform"
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
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/40'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Search Result & Conversation List */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-800/30">
        {/* Matching Colleagues Section when searching */}
        {searchQuery.trim() && matchedStaffFromSearch.length > 0 && (
          <div className="bg-slate-900/60 border-b border-slate-800/80">
            <div className="px-4 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-slate-900/90">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Đồng nghiệp ({matchedStaffFromSearch.length})
              </span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">Chạm để nhắn DM</span>
            </div>
            <div className="divide-y divide-slate-800/40">
              {matchedStaffFromSearch.map((staff) => {
                const staffName = staff.displayName || staff.username || `Nhân sự #${staff.id}`;
                return (
                  <div
                    key={`search-staff-${staff.id}`}
                    onClick={() => handleStartDmWithStaff(staff)}
                    role="button"
                    tabIndex={0}
                    className="w-full px-4 py-3 flex items-center gap-3 active:bg-slate-800/90 hover:bg-slate-800/40 transition-colors select-none cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-indigo-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-base shadow-sm">
                        {staffName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <h4 className="text-sm font-semibold text-white truncate">{staffName}</h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                          {formatStaffRole(staff.role)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-500 shrink-0" />
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
          <div className="px-4 py-2 bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            Kênh & Cuộc trò chuyện ({filteredConversations.length})
          </div>
        )}

        {/* Conversation List or Empty State */}
        {filteredConversations.length === 0 && (!searchQuery.trim() || matchedStaffFromSearch.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 mt-12">
            <MessageSquare className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-300">Không tìm thấy cuộc trò chuyện hay đồng nghiệp nào</p>
            <p className="text-xs text-slate-500 mt-1">Thử đổi từ khóa hoặc chạm nút (+) để tìm danh bạ</p>
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
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <span>Tin nhắn trực tiếp mới</span>
          </div>
        }
        centered
        className="mos-chat-dm-modal"
        styles={{
          content: {
            background: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '0.75rem',
            marginBottom: '0.75rem',
          },
        }}
      >
        <div className="flex flex-col gap-3 min-h-0 flex-1">
          {/* Search inside modal */}
          <div className="relative flex items-center bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white focus-within:border-amber-400/80 transition-colors">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-400"
              autoFocus
            />
            {modalSearchQuery && (
              <button
                type="button"
                onClick={() => setModalSearchQuery('')}
                className="p-0.5 text-slate-400 hover:text-white"
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
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/40'
                  }`}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>

          {/* Staff List */}
          <div className="flex-1 overflow-y-auto max-h-[50vh] divide-y divide-slate-800/40 overscroll-contain pr-1">
            {modalStaffList.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
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
                    className="w-full py-2.5 px-2 flex items-center gap-3 hover:bg-slate-800/50 active:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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
                        <h4 className="text-xs font-semibold text-white truncate">{staffName}</h4>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                          {formatStaffRole(staff.role)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">Nhắn tin trực tiếp</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
