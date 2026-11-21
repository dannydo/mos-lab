'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal, Switch, Input, message as antdMessage } from 'antd';
import {
  Forward,
  Search,
  X,
  Hash,
  MessageSquareReply,
  Check,
  Send,
  Paperclip,
  Bookmark,
  Pin,
  Users,
  UserPlus,
  Loader2,
} from 'lucide-react';
import {
  type ForwardMosChatMessageRequest,
  type ForwardMosChatMessageResponse,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatStaffMember,
  type MosChatThreadReply,
  type SafeAny,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import { MosChatAvatar } from '../MosChatAvatar';

export interface MosChatForwardModalProps {
  open: boolean;
  onClose: () => void;
  sourceConversation?: MosChatConversation | null;
  sourceMessage: MosChatMessage | null;
  sourceReply?: MosChatThreadReply | null;
  conversations: MosChatConversation[];
  staffDirectory: MosChatStaffMember[];
  currentUser?: SafeAny;
  pinnedIds?: string[];
  isDark: boolean;
  onSubmit: (payload: ForwardMosChatMessageRequest) => Promise<ForwardMosChatMessageResponse | null>;
  onNavigateToConversation?: (conversationId: string) => void;
}

interface ForwardTargetOption {
  key: string;
  kind: 'conv' | 'staff';
  conversationId?: string;
  staffId?: number;
  label: string;
  subtitle?: string;
  type: 'self' | 'space' | 'dm' | 'new_dm';
  avatar?: string | null;
  color?: string;
  isPinned?: boolean;
  updatedAtMs: number;
  searchHaystack: string;
}

const MAX_FORWARD_TARGETS = 20;

export const MosChatForwardModal: React.FC<MosChatForwardModalProps> = ({
  open,
  onClose,
  sourceConversation,
  sourceMessage,
  sourceReply,
  conversations,
  staffDirectory,
  currentUser,
  pinnedIds = [],
  isDark,
  onSubmit,
  onNavigateToConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [note, setNote] = useState('');
  const [includeThread, setIncludeThread] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openTargetAfterForward, setOpenTargetAfterForward] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const activeReplies = useMemo(() => {
    if (sourceReply || !sourceMessage) return [];
    return (sourceMessage.thread || []).filter((r) => !r.isDeleted);
  }, [sourceMessage, sourceReply]);

  const threadParticipantsSummary = useMemo(() => {
    if (activeReplies.length === 0) return '';
    const names = Array.from(new Set(activeReplies.map((r) => r.senderName).filter(Boolean)));
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  }, [activeReplies]);

  const threadAttachmentsCount = useMemo(() => {
    return activeReplies.reduce((sum, r) => sum + (r.attachments?.length || 0), 0);
  }, [activeReplies]);

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setNote('');
      setIncludeThread(true);
      setSelectedKeys([]);
      setIsSubmitting(false);
      setOpenTargetAfterForward(false);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [open, sourceMessage?.id, sourceReply?.id]);

  const myStaffId = useMemo(() => {
    const direct = Number(currentUser?.id);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const uname = String(currentUser?.username || '')
      .toLowerCase()
      .trim();
    if (!uname) return 0;
    const found = staffDirectory.find(
      (s) =>
        String(s.username || '')
          .toLowerCase()
          .trim() === uname
    );
    return found?.id || 0;
  }, [currentUser, staffDirectory]);

  const allTargetOptions = useMemo<ForwardTargetOption[]>(() => {
    const pinnedSet = new Set(pinnedIds || []);
    const options: ForwardTargetOption[] = [];
    const existingDmPeerIds = new Set<number>();
    let hasSelfChatConv = false;

    for (const conv of conversations || []) {
      if (!conv || conv.id === AI_COPILOT_CONV_ID) continue;
      const isSelf = Boolean(conv.type === 'dm' && (conv.isSelf || String(conv.id).startsWith('dm-self-')));
      if (isSelf) {
        hasSelfChatConv = true;
      } else if (conv.type === 'dm') {
        const partId = Number(conv.participantStaffId);
        if (Number.isFinite(partId) && partId > 0 && partId !== myStaffId) {
          existingDmPeerIds.add(partId);
        }
        if (Array.isArray(conv.memberIds)) {
          for (const mid of conv.memberIds) {
            const num = Number(mid);
            if (Number.isFinite(num) && num > 0 && num !== myStaffId) {
              existingDmPeerIds.add(num);
            }
          }
        }
      }

      const type: ForwardTargetOption['type'] = isSelf ? 'self' : conv.type === 'space' ? 'space' : 'dm';
      const label = isSelf
        ? 'Ghi chú cá nhân (Lưu cho tôi)'
        : conv.type === 'space'
          ? conv.name.startsWith('#')
            ? conv.name
            : `#${conv.name}`
          : conv.name;
      const subtitle =
        conv.subtitle ||
        (conv.type === 'space'
          ? `${conv.memberCount || conv.memberIds?.length || 0} thành viên`
          : isSelf
            ? 'Không gian ghi chú riêng tư'
            : 'Trò chuyện trực tiếp 1-1');

      options.push({
        key: `conv:${conv.id}`,
        kind: 'conv',
        conversationId: conv.id,
        label,
        subtitle,
        type,
        avatar: conv.avatar || null,
        color: conv.color,
        isPinned: pinnedSet.has(conv.id),
        updatedAtMs: conv.updatedAt ? new Date(conv.updatedAt).getTime() || 0 : 0,
        searchHaystack: removeVietnameseTones(`${label} ${conv.name} ${subtitle || ''}`.toLowerCase()),
      });
    }

    if (!hasSelfChatConv && myStaffId > 0) {
      options.push({
        key: `staff:${myStaffId}`,
        kind: 'staff',
        staffId: myStaffId,
        label: 'Ghi chú cá nhân (Lưu cho tôi)',
        subtitle: 'Tạo không gian ghi chú cá nhân',
        type: 'self',
        avatar: currentUser?.avatarUrl || null,
        color: '#6366f1',
        isPinned: false,
        updatedAtMs: 0,
        searchHaystack: removeVietnameseTones('ghi chu ca nhan luu cho toi self note'.toLowerCase()),
      });
    }

    for (const staff of staffDirectory || []) {
      if (!staff || staff.id <= 0 || staff.id === myStaffId) continue;
      if (existingDmPeerIds.has(staff.id)) continue;
      const displayName = staff.displayName || staff.username || `Nhân sự #${staff.id}`;
      const roleLabel = staff.role ? String(staff.role).toUpperCase() : 'Nhân sự';
      options.push({
        key: `staff:${staff.id}`,
        kind: 'staff',
        staffId: staff.id,
        label: displayName,
        subtitle: `${roleLabel} · Chưa từng chat 1-1`,
        type: 'new_dm',
        avatar: staff.avatarUrl || null,
        color: '#10b981',
        isPinned: false,
        updatedAtMs: 0,
        searchHaystack: removeVietnameseTones(
          `${displayName} ${staff.username || ''} ${staff.role || ''}`.toLowerCase()
        ),
      });
    }

    return options;
  }, [conversations, staffDirectory, pinnedIds, myStaffId, currentUser]);

  const filteredOptions = useMemo(() => {
    const qNorm = removeVietnameseTones(searchQuery.trim().toLowerCase());
    if (!qNorm) return allTargetOptions;
    return allTargetOptions.filter((opt) => opt.searchHaystack.includes(qNorm));
  }, [allTargetOptions, searchQuery]);

  const groupedTargets = useMemo(() => {
    const selfItems = filteredOptions.filter((o) => o.type === 'self');
    const pinnedItems = filteredOptions
      .filter((o) => o.type !== 'self' && o.isPinned)
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    const spaceItems = filteredOptions
      .filter((o) => o.type === 'space' && !o.isPinned)
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    const dmItems = filteredOptions
      .filter((o) => (o.type === 'dm' || o.type === 'new_dm') && !o.isPinned)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dm' ? -1 : 1;
        return b.updatedAtMs - a.updatedAtMs || a.label.localeCompare(b.label, 'vi');
      });

    return [
      { id: 'self', title: 'Ghi chú cá nhân', items: selfItems },
      { id: 'pinned', title: 'Đã ghim', items: pinnedItems },
      { id: 'spaces', title: 'Spaces', items: spaceItems },
      { id: 'dms', title: 'Tin nhắn trực tiếp & Danh bạ nhân sự', items: dmItems },
    ].filter((g) => g.items.length > 0);
  }, [filteredOptions]);

  const optionByKey = useMemo(() => {
    const map = new Map<string, ForwardTargetOption>();
    for (const o of allTargetOptions) {
      map.set(o.key, o);
    }
    return map;
  }, [allTargetOptions]);

  const toggleSelectKey = (key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_FORWARD_TARGETS) {
        antdMessage.warning(`Chỉ có thể chọn tối đa ${MAX_FORWARD_TARGETS} nơi nhận trong một lần.`);
        return prev;
      }
      return [...prev, key];
    });
  };

  const handleConfirmForward = async () => {
    if (!sourceMessage || !sourceConversation || selectedKeys.length === 0 || isSubmitting) return;

    const targetConversationIds: string[] = [];
    const targetStaffIds: number[] = [];

    for (const key of selectedKeys) {
      const opt = optionByKey.get(key);
      if (!opt) continue;
      if (opt.kind === 'conv' && opt.conversationId) {
        targetConversationIds.push(opt.conversationId);
      } else if (opt.kind === 'staff' && opt.staffId) {
        targetStaffIds.push(opt.staffId);
      }
    }

    if (targetConversationIds.length === 0 && targetStaffIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        sourceConversationId: sourceConversation.id,
        sourceMessageId: sourceMessage.id,
        sourceReplyId: sourceReply?.id || null,
        includeThread: !sourceReply && activeReplies.length > 0 ? includeThread : false,
        targetConversationIds,
        targetStaffIds,
        note: note.trim() || null,
      });
      if (res?.success) {
        const firstDestId = res.results?.[0]?.conversationId;
        onClose();
        if (openTargetAfterForward && firstDestId && onNavigateToConversation) {
          onNavigateToConversation(firstDestId);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sourceMessage) return null;

  const previewAuthor = sourceReply ? sourceReply.senderName : sourceMessage.senderName;
  const previewText = sourceReply ? sourceReply.text : sourceMessage.text;
  const previewAttachments = sourceReply ? sourceReply.attachments : sourceMessage.attachments;
  const previewCard = sourceReply ? sourceReply.customerCard : sourceMessage.customerCard;

  const surfaceBg = isDark ? '#141414' : '#ffffff';
  const cardBg = isDark ? '#1c1c20' : '#f8fafc';
  const borderCol = isDark ? '#2a2a2f' : '#e2e8f0';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const primaryText = isDark ? '#f1f5f9' : '#0f172a';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
      zIndex={1550}
      width={540}
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      closable={{
        closeIcon: (
          <span
            aria-label="Đóng hộp thoại chuyển tiếp"
            className={`inline-flex items-center justify-center p-1 rounded-lg ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <X size={16} />
          </span>
        ),
      }}
      styles={{
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: surfaceBg,
          border: `1px solid ${borderCol}`,
        },
        body: {
          padding: 0,
          overscrollBehavior: 'contain',
        },
      }}
      title={null}
    >
      <div className="flex flex-col max-h-[86vh]">
        {/* Header */}
        <div
          className="px-4 py-3.5 border-b flex items-center gap-2.5 pr-11"
          style={{ borderColor: borderCol, backgroundColor: isDark ? '#18181c' : '#f8fafc' }}
        >
          <div
            className="w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(217, 119, 6, 0.12)',
              color: isDark ? '#fbbf24' : '#d97706',
            }}
          >
            <Forward size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold leading-tight m-0" style={{ color: primaryText }}>
              {sourceReply ? 'Chuyển tiếp phản hồi' : 'Chuyển tiếp tin nhắn'}
            </h2>
            <p className="text-[11.5px] m-0 mt-0.5 truncate" style={{ color: mutedText }}>
              Chọn 1 hoặc nhiều Space, DM hoặc đồng nghiệp bất kỳ để gửi qua
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>
          {/* Source Preview */}
          <div
            className="rounded-xl p-2.5 border-l-[3px]"
            style={{
              backgroundColor: cardBg,
              borderTop: `1px solid ${borderCol}`,
              borderRight: `1px solid ${borderCol}`,
              borderBottom: `1px solid ${borderCol}`,
              borderLeftColor: isDark ? '#f59e0b' : '#d97706',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11.5px] font-bold truncate" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                {previewAuthor}
              </span>
              {sourceConversation ? (
                <span className="text-[10.5px] truncate shrink-0" style={{ color: mutedText }}>
                  {sourceConversation.type === 'space'
                    ? `#${sourceConversation.name}`
                    : sourceConversation.isSelf
                      ? 'Ghi chú cá nhân'
                      : `DM · ${sourceConversation.name}`}
                </span>
              ) : null}
            </div>
            {previewText ? (
              <p className="text-[12.5px] line-clamp-2 m-0 break-words" style={{ color: primaryText }}>
                {previewText}
              </p>
            ) : null}
            {(previewAttachments && previewAttachments.length > 0) || previewCard ? (
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]" style={{ color: mutedText }}>
                {previewAttachments && previewAttachments.length > 0 && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Paperclip size={11} />
                    <span>{previewAttachments.length} tệp / hình ảnh</span>
                  </span>
                )}
                {previewCard && (
                  <span className="inline-flex items-center gap-1">
                    <span>👤 Hồ sơ: {previewCard.name}</span>
                  </span>
                )}
              </div>
            ) : null}
          </div>

          {/* Subthread Toggle (Default ON when source message has active replies) */}
          {!sourceReply && activeReplies.length > 0 && (
            <div
              className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
              style={{
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.06)',
                border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.22)'}`,
              }}
            >
              <div className="min-w-0 flex-1">
                <div
                  className="flex items-center gap-1.5 text-[12.5px] font-bold"
                  style={{ color: isDark ? '#c7d2fe' : '#3730a3' }}
                >
                  <MessageSquareReply size={14} className="shrink-0" />
                  <span className="tabular-nums">
                    Chuyển tiếp kèm toàn bộ luồng trả lời phụ ({activeReplies.length} phản hồi)
                  </span>
                </div>
                <p className="text-[11px] m-0 mt-0.5 truncate" style={{ color: mutedText }}>
                  {threadParticipantsSummary ? `Gồm: ${threadParticipantsSummary}` : 'Giữ nguyên toàn bộ mạch trao đổi'}
                  {threadAttachmentsCount > 0 ? ` · ${threadAttachmentsCount} tệp đính kèm` : ''}
                </p>
              </div>
              <Switch
                aria-label="Chuyển tiếp kèm toàn bộ luồng trả lời phụ"
                checked={includeThread}
                onChange={setIncludeThread}
                size="small"
              />
            </div>
          )}

          {/* Optional Note */}
          <div>
            <Input.TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm lời nhắn đi kèm (tùy chọn, hỗ trợ @mention)..."
              autoSize={{ minRows: 1, maxRows: 3 }}
              maxLength={1000}
              style={{
                backgroundColor: cardBg,
                borderColor: borderCol,
                color: primaryText,
                borderRadius: 10,
                fontSize: 12.5,
              }}
            />
          </div>

          {/* Selected Destination Chips */}
          {selectedKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedKeys.map((key) => {
                const opt = optionByKey.get(key);
                if (!opt) return null;
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 leading-none px-2 py-1 rounded-full text-[11.5px] font-semibold"
                    style={{
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(217, 119, 6, 0.1)',
                      border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.3)'}`,
                      color: isDark ? '#fcd34d' : '#b45309',
                    }}
                  >
                    <span className="truncate max-w-[150px]">{opt.label}</span>
                    <button
                      type="button"
                      aria-label={`Bỏ chọn ${opt.label}`}
                      onClick={() => toggleSelectKey(key)}
                      className="hover:opacity-75 cursor-pointer inline-flex items-center"
                    >
                      <X size={11} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Search Bar */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{ backgroundColor: cardBg, borderColor: borderCol }}
          >
            <Search size={14} style={{ color: mutedText }} className="shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên Space, DM hoặc tên đồng nghiệp..."
              aria-label="Tìm nơi nhận chuyển tiếp"
              className="w-full bg-transparent border-none outline-none text-[13px]"
              style={{ color: primaryText }}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={() => setSearchQuery('')}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                style={{ color: mutedText }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Destination List */}
          <div className="max-h-[260px] overflow-y-auto space-y-2.5 pr-1" style={{ overscrollBehavior: 'contain' }}>
            {groupedTargets.length === 0 ? (
              <div className="py-8 text-center text-[12.5px]" style={{ color: mutedText }}>
                Không tìm thấy phòng chat hoặc nhân sự phù hợp.
              </div>
            ) : (
              groupedTargets.map((group) => (
                <div key={group.id}>
                  <div
                    className="text-[10.5px] font-bold uppercase tracking-wider px-1 mb-1 flex items-center gap-1"
                    style={{ color: mutedText }}
                  >
                    {group.id === 'self' && <Bookmark size={11} />}
                    {group.id === 'pinned' && <Pin size={11} />}
                    {group.id === 'spaces' && <Hash size={11} />}
                    {group.id === 'dms' && <Users size={11} />}
                    <span>{group.title}</span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isSelected = selectedKeys.includes(item.key);
                      const isSourceSame =
                        item.kind === 'conv' && sourceConversation && item.conversationId === sourceConversation.id;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleSelectKey(item.key)}
                          className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors"
                          style={{
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(245, 158, 11, 0.14)'
                                : 'rgba(217, 119, 6, 0.08)'
                              : 'transparent',
                            border: `1px solid ${
                              isSelected
                                ? isDark
                                  ? 'rgba(245, 158, 11, 0.4)'
                                  : 'rgba(217, 119, 6, 0.35)'
                                : 'transparent'
                            }`,
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {item.type === 'space' ? (
                              <div
                                className="w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 text-white font-bold text-xs"
                                style={{ backgroundColor: item.color || '#3b82f6' }}
                              >
                                <Hash size={14} />
                              </div>
                            ) : item.type === 'self' ? (
                              <div
                                className="w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 text-white"
                                style={{ backgroundColor: '#6366f1' }}
                              >
                                <Bookmark size={14} />
                              </div>
                            ) : (
                              <MosChatAvatar
                                size="sm"
                                src={item.avatar}
                                name={item.label}
                                staffId={item.staffId}
                                staffDirectory={staffDirectory}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-semibold truncate" style={{ color: primaryText }}>
                                  {item.label}
                                </span>
                                {item.type === 'new_dm' && (
                                  <span
                                    className="inline-flex items-center justify-center gap-0.5 leading-none px-1.5 py-0.5 rounded-full text-[9.5px] font-bold shrink-0"
                                    style={{
                                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.12)',
                                      color: isDark ? '#34d399' : '#059669',
                                    }}
                                  >
                                    <UserPlus size={9} />
                                    <span>Tạo DM mới</span>
                                  </span>
                                )}
                                {isSourceSame && (
                                  <span
                                    className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[9.5px] font-semibold shrink-0"
                                    style={{
                                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                                      color: mutedText,
                                    }}
                                  >
                                    Phòng hiện tại
                                  </span>
                                )}
                              </div>
                              {item.subtitle && (
                                <p className="text-[11px] m-0 truncate" style={{ color: mutedText }}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className="w-5 h-5 rounded-md inline-flex items-center justify-center shrink-0 transition-colors"
                            style={{
                              backgroundColor: isSelected ? '#f59e0b' : 'transparent',
                              border: `1.5px solid ${isSelected ? '#f59e0b' : borderCol}`,
                              color: '#0f172a',
                            }}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2"
          style={{ borderColor: borderCol, backgroundColor: isDark ? '#18181c' : '#f8fafc' }}
        >
          {onNavigateToConversation ? (
            <label
              className="inline-flex items-center gap-2 text-[12px] cursor-pointer select-none"
              style={{ color: mutedText }}
            >
              <input
                type="checkbox"
                checked={openTargetAfterForward}
                onChange={(e) => setOpenTargetAfterForward(e.target.checked)}
                className="accent-amber-500 rounded cursor-pointer"
              />
              <span>Mở phòng đích sau khi gửi</span>
            </label>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold cursor-pointer transition-colors border"
              style={{
                backgroundColor: 'transparent',
                borderColor: borderCol,
                color: mutedText,
              }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleConfirmForward}
              disabled={selectedKeys.length === 0 || isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[12.5px] font-bold cursor-pointer transition-all disabled:opacity-45 disabled:cursor-not-allowed tabular-nums"
              style={{
                backgroundColor: '#f59e0b',
                color: '#0f172a',
              }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
              <span>{selectedKeys.length > 0 ? `Chuyển tiếp (${selectedKeys.length})` : 'Chuyển tiếp'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
