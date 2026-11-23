'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatConversation,
  MosChatImageAttachment,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID, type SpaceDepartmentOrTeamGroup } from '../constants/chat-constants';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { matchesStaffGroup } from '../utils/chat-helpers';

export interface UsePortalSpacesAndDockActionsParams {
  open: boolean;
  isMobile: boolean;
  isTabVisible: boolean;
  onClose: () => void;
  activeConvId: string;
  setActiveConvId: (id: string) => void;
  activeSubtab: MosChatActiveSubtab;
  setActiveSubtab: (tab: MosChatActiveSubtab) => void;
  setMobileActiveView: (view: 'inbox' | 'conversation' | 'thread') => void;
  threadOpen: boolean;
  activeThreadMsgId: string | null;
  setActiveThreadMsgId: (id: string | null) => void;
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  staffDirectory: MosChatStaffMember[];
  conversations: MosChatConversation[];
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  visibleConversations: MosChatConversation[];
  activeConversation?: MosChatConversation;
  userPrefs: MosChatUserSidebarPrefs;
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  setDockedConvIds: React.Dispatch<React.SetStateAction<string[]>>;
  scrollToChatBottom: (target?: 'main' | 'thread' | { dockConvId: string }, behavior?: ScrollBehavior) => void;
  markThreadReadOptimisticAndSync: (convId: string, msgId: string) => void;
  notifyLivePeers: () => void;
  antdMessage: MessageInstance;
}

export function usePortalSpacesAndDockActions({
  open,
  isMobile,
  isTabVisible,
  onClose,
  activeConvId,
  setActiveConvId,
  activeSubtab,
  setActiveSubtab,
  setMobileActiveView,
  threadOpen,
  activeThreadMsgId,
  setActiveThreadMsgId,
  currentUser,
  currentUserStaffMember,
  staffDirectory,
  conversations,
  setConversations,
  visibleConversations,
  activeConversation,
  userPrefs,
  setTasks,
  setDockedConvIds,
  scrollToChatBottom,
  markThreadReadOptimisticAndSync,
  notifyLivePeers,
  antdMessage,
}: UsePortalSpacesAndDockActionsParams) {
  const [editingNicknameTarget, setEditingNicknameTarget] = useState<{
    staffId: number;
    displayName: string;
    currentNickname: string;
    isMe: boolean;
  } | null>(null);
  const [nicknameInputVal, setNicknameInputVal] = useState('');
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);

  const [newRoomModalOpen, setNewRoomModalOpen] = useState(false);
  const [newRoomType, setNewRoomType] = useState<'space' | 'dm'>('space');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSubtitle, setNewRoomSubtitle] = useState('');
  const [newRoomEmoji, setNewRoomEmoji] = useState('');
  const [newRoomColor, setNewRoomColor] = useState('#1a73e8');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomGroupFilter, setRoomGroupFilter] = useState<string>('ALL');

  const [spaceMembersModalOpen, setSpaceMembersModalOpen] = useState(false);
  const [addMemberSelectedStaffId, setAddMemberSelectedStaffId] = useState<number | null>(null);
  const [spaceConfigModalOpen, setSpaceConfigModalOpen] = useState(false);
  const [notifSettingsModalOpen, setNotifSettingsModalOpen] = useState(false);

  const prevMainMsgCountRef = useRef<{ convId: string; count: number }>({ convId: '', count: 0 });
  const prevThreadReplyCountRef = useRef<{ msgId: string; count: number }>({ msgId: '', count: 0 });

  const handlePopOutToMiniDock = () => {
    if (!activeConversation) return;
    setDockedConvIds((prev) => {
      const next = prev.includes(activeConversation.id) ? prev : [...prev, activeConversation.id];
      return next.slice(-2);
    });
    onClose();
  };

  const handleQuickCreateTaskForDock = async ({ conversationId, title }: { conversationId: string; title: string }) => {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return;

    const tempTaskId = `task_temp_${Date.now()}`;
    const myName = currentUser?.displayName || currentUser?.fullName || 'Danny Do';
    const myId = currentUser?.id ? String(currentUser.id) : 'me';
    const targetConv = conversations.find((c) => c.id === conversationId);
    const convName = targetConv?.name || 'Không gian';

    const optimisticTask: MosChatTaskItem = {
      id: tempTaskId,
      conversationId,
      conversationName: convName,
      title: cleanTitle,
      done: false,
      priority: 'NORMAL',
      creatorName: myName,
      assigneeName: myName,
      assigneeId: myId,
      remindAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [optimisticTask, ...prev]);

    try {
      const res = await apiClient.chat.createTask({
        conversationId,
        title: cleanTitle,
        assigneeName: myName,
        assigneeId: myId,
        priority: 'NORMAL',
      });
      if (res?.task) {
        setTasks((prev) => prev.map((t) => (t.id === tempTaskId ? res.task : t)));
      }
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  const handleSendThreadReplyForDock = async (
    convId: string,
    rootMsgId: string,
    text: string,
    attachments?: MosChatImageAttachment[]
  ) => {
    const cleanText = (text || '').trim();
    const attsToSend = attachments || [];
    if (!cleanText && attsToSend.length === 0) return;

    const senderName = currentUser?.displayName || 'Danny Do';
    const newReply: MosChatThreadReply = {
      id: `th-${Date.now()}`,
      senderId: currentUser?.id || 'me',
      senderName,
      senderRole: 'Super Admin',
      senderAvatar: 'DD',
      text: cleanText,
      attachments: attsToSend.length > 0 ? attsToSend : undefined,
      timeLabel: dayjs().format('HH:mm'),
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === rootMsgId ? { ...m, unreadThreadReplyCount: 0, thread: [...(m.thread || []), newReply] } : m
          ),
        };
      })
    );

    try {
      const res = await apiClient.chat.sendThreadReply({
        conversationId: convId,
        messageId: rootMsgId,
        text: cleanText,
        attachments: attsToSend.length > 0 ? attsToSend : undefined,
      });
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === convId ? res.conversation! : c)));
      }
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  const handleSelectSelfChat = async () => {
    setNewRoomModalOpen(false);
    const selfId = `dm-self-${currentUser?.id || 'me'}`;
    const existing = visibleConversations.find((c) => c.id === selfId || (c.type === 'dm' && c.isSelf));
    if (existing) {
      setActiveConvId(existing.id);
      setActiveSubtab('chat');
      if (isMobile) setMobileActiveView('conversation');
      return;
    }
    try {
      const res = await apiClient.chat.createConversation({
        type: 'dm',
        name: `${currentUser?.displayName || currentUser?.username || 'Tôi'} (Ghi chú cho tôi)`,
        isSelf: true,
      });
      if (res?.conversation) {
        setConversations((prev) => [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]);
        setActiveConvId(res.conversation.id);
        setActiveSubtab('chat');
        if (isMobile) setMobileActiveView('conversation');
        notifyLivePeers();
      }
    } catch {
      antdMessage.error('Không thể tạo không gian ghi chú cá nhân');
    }
  };

  const handleSelectColleague = async (colleague: MosChatStaffMember) => {
    setNewRoomModalOpen(false);
    const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
    const peerId = Number(colleague.id) || 0;
    const existing = visibleConversations.find((c) => {
      if (c.type !== 'dm' || c.isSelf) return false;
      if (myStaffId > 0 && peerId > 0 && Array.isArray(c.memberIds)) {
        const nums = c.memberIds.map(Number);
        if (nums.includes(myStaffId) && nums.includes(peerId)) return true;
      }
      return Number(c.participantStaffId) === peerId || c.name === colleague.displayName;
    });
    if (existing) {
      setActiveConvId(existing.id);
      setActiveSubtab('chat');
      if (isMobile) setMobileActiveView('conversation');
      return;
    }
    try {
      const res = await apiClient.chat.createConversation({
        type: 'dm',
        name: colleague.displayName,
        participantStaffId: colleague.id,
      });
      if (res?.conversation) {
        setConversations((prev) => [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]);
        setActiveConvId(res.conversation.id);
        setActiveSubtab('chat');
        if (isMobile) setMobileActiveView('conversation');
        notifyLivePeers();
      }
    } catch {
      antdMessage.error('Không thể mở cuộc trò chuyện');
    }
  };

  const handleCreateSpace = async () => {
    const cleanName = newRoomName.trim();
    if (!cleanName) {
      antdMessage.warning('Vui lòng nhập tên Không gian (Space)');
      return;
    }
    const emoji = newRoomEmoji.trim();
    const color = newRoomColor.trim() || '#1a73e8';
    setNewRoomModalOpen(false);
    setNewRoomName('');
    setNewRoomSubtitle('');
    setNewRoomEmoji('');
    setNewRoomColor('#1a73e8');
    const memberIds = [...selectedMemberIds];
    setSelectedMemberIds([]);
    try {
      const res = await apiClient.chat.createConversation({
        type: 'space',
        name: cleanName,
        subtitle: newRoomSubtitle.trim() || undefined,
        avatar: emoji || undefined,
        color,
        memberIds,
      });
      if (res?.conversation) {
        setConversations((prev) => [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]);
        setActiveConvId(res.conversation.id);
        setActiveSubtab('chat');
        if (isMobile) setMobileActiveView('conversation');
        notifyLivePeers();
      }
    } catch {
      antdMessage.error('Không thể tạo Không gian làm việc');
    }
  };

  const handleToggleDepartmentOrTeam = (group: SpaceDepartmentOrTeamGroup) => {
    const groupMembers = staffDirectory.filter((m) => matchesStaffGroup(m, group.key));
    if (groupMembers.length === 0) {
      antdMessage.info(`Hiện chưa có nhân sự thuộc ${group.label}`);
      return;
    }
    const groupIds = groupMembers.map((m) => m.id);
    const allSelected = groupIds.every((id) => selectedMemberIds.includes(id));

    if (allSelected) {
      const myId = Number(currentUser?.id);
      setSelectedMemberIds((prev) => prev.filter((id) => id === myId || !groupIds.includes(id)));
    } else {
      setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...groupIds])));
      if (!newRoomName.trim()) {
        setNewRoomName(group.defaultSlug);
      }
      if (!newRoomSubtitle.trim()) {
        setNewRoomSubtitle(group.defaultSubtitle);
      }
    }
  };

  const handleAddMemberToSpace = async (staffId: number) => {
    if (!activeConversation || activeConversation.type !== 'space') return;
    try {
      const res = await apiClient.chat.addMember(activeConversation.id, staffId);
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
        notifyLivePeers();
        antdMessage.success('Đã thêm thành viên vào Không gian');
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể thêm thành viên');
    }
  };

  const handleBulkAddGroupToSpace = async (group: SpaceDepartmentOrTeamGroup) => {
    if (!activeConversation || activeConversation.type !== 'space') return;
    const existingIds = new Set(activeConversation.memberIds || []);
    const missingIds = staffDirectory
      .filter((m) => matchesStaffGroup(m, group.key) && !existingIds.has(m.id))
      .map((m) => m.id);
    if (missingIds.length === 0) {
      antdMessage.info(`Tất cả thành viên của ${group.label} đã có mặt trong Không gian này`);
      return;
    }
    try {
      const res = await apiClient.chat.addMember(activeConversation.id, missingIds);
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
        notifyLivePeers();
        antdMessage.success(`Đã thêm ${missingIds.length} thành viên thuộc ${group.label} vào Không gian`);
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể thêm nhóm thành viên');
    }
  };

  const handleRemoveMemberFromSpace = async (staffId: number) => {
    if (!activeConversation || activeConversation.type !== 'space') return;
    try {
      const res = await apiClient.chat.removeMember(activeConversation.id, staffId);
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
        notifyLivePeers();
        antdMessage.success('Đã xóa thành viên khỏi Không gian');
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể xóa thành viên');
    }
  };

  const getMemberNickname = useCallback(
    (staffId: number | string | undefined | null): string | undefined => {
      if (!staffId || !activeConversation || activeConversation.type !== 'space') return undefined;
      return activeConversation.memberNicknames?.[String(staffId)]?.trim() || undefined;
    },
    [activeConversation]
  );

  const handleOpenNicknameModal = useCallback(
    (targetStaffId: number) => {
      if (!activeConversation || activeConversation.type !== 'space') return;
      const targetStaff = staffDirectory.find((s) => s.id === targetStaffId);
      const myId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      const isMe = targetStaffId === myId;
      const currentNick = activeConversation.memberNicknames?.[String(targetStaffId)] || '';
      const name = targetStaff?.displayName || targetStaff?.username || (isMe ? 'Bạn' : `Nhân sự #${targetStaffId}`);

      setEditingNicknameTarget({
        staffId: targetStaffId,
        displayName: name,
        currentNickname: currentNick,
        isMe,
      });
      setNicknameInputVal(currentNick);
    },
    [activeConversation, currentUserStaffMember.id, currentUser?.id, staffDirectory]
  );

  const handleSaveNickname = useCallback(
    async (overrideValue?: string) => {
      if (!activeConversation || !editingNicknameTarget) return;
      const newNick = (overrideValue !== undefined ? overrideValue : nicknameInputVal).trim();
      setIsUpdatingNickname(true);
      try {
        const res = await apiClient.chat.updateNickname(activeConversation.id, {
          targetStaffId: editingNicknameTarget.staffId,
          nickname: newNick,
        });

        if (res.success) {
          const updatedConv = res.conversation;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversation.id
                ? {
                    ...c,
                    memberNicknames: res.memberNicknames,
                    messages: updatedConv?.messages || c.messages,
                    updatedAt: updatedConv?.updatedAt || new Date().toISOString(),
                  }
                : c
            )
          );

          notifyLivePeers();
          antdMessage.success(newNick ? `Đã đổi biệt danh thành "${newNick}"!` : 'Đã gỡ biệt danh, trở về tên thật!');
          setEditingNicknameTarget(null);
          setNicknameInputVal('');
        }
      } catch (err: SafeAny) {
        antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể lưu biệt danh');
      } finally {
        setIsUpdatingNickname(false);
      }
    },
    [activeConversation, editingNicknameTarget, nicknameInputVal, notifyLivePeers, antdMessage, setConversations]
  );

  const activeThreadMessage = useMemo(() => {
    if (!activeConversation || !activeConversation.messages?.length) return null;
    if (activeThreadMsgId) {
      const found = activeConversation.messages.find((m) => m.id === activeThreadMsgId);
      if (found) return found;
    }
    return activeConversation.messages.find((m) => !m.isDeleted) || activeConversation.messages[0] || null;
  }, [activeConversation, activeThreadMsgId]);

  useEffect(() => {
    if (threadOpen && activeThreadMessage?.id && activeThreadMsgId !== activeThreadMessage.id) {
      setActiveThreadMsgId(activeThreadMessage.id);
    }
  }, [threadOpen, activeThreadMessage?.id, activeThreadMsgId, setActiveThreadMsgId]);

  useEffect(() => {
    setActiveThreadMsgId(null);
  }, [activeConvId, setActiveThreadMsgId]);

  useEffect(() => {
    if (!open || activeSubtab !== 'chat' || !activeConversation) return;
    const convId = activeConversation.id;
    const count = (activeConversation.messages || []).length;
    const prev = prevMainMsgCountRef.current;
    if (prev.convId !== convId) {
      prevMainMsgCountRef.current = { convId, count };
      scrollToChatBottom('main', 'auto');
    } else if (count > prev.count) {
      prevMainMsgCountRef.current = { convId, count };
      scrollToChatBottom('main', 'smooth');
    } else {
      prevMainMsgCountRef.current = { convId, count };
    }
  }, [open, activeSubtab, activeConversation, scrollToChatBottom]);

  useEffect(() => {
    if (!open || !threadOpen || !activeThreadMessage) return;
    const msgId = activeThreadMessage.id;
    const count = (activeThreadMessage.thread || []).length;
    const prev = prevThreadReplyCountRef.current;
    if (prev.msgId !== msgId) {
      prevThreadReplyCountRef.current = { msgId, count };
      scrollToChatBottom('thread', 'auto');
    } else if (count > prev.count) {
      prevThreadReplyCountRef.current = { msgId, count };
      scrollToChatBottom('thread', 'smooth');
    } else {
      prevThreadReplyCountRef.current = { msgId, count };
    }
  }, [open, threadOpen, activeThreadMessage, scrollToChatBottom]);

  useEffect(() => {
    if (!isTabVisible || !open || !threadOpen || !activeConversation || !activeThreadMessage) return;
    if (activeConversation.id === AI_COPILOT_CONV_ID) return;
    const visibleReplies = (activeThreadMessage.thread || []).filter((r) => !r.deletedAt);
    if (visibleReplies.length === 0) return;
    const currentReadReplyCount =
      userPrefs.readThreadReplyCountByMsg?.[activeThreadMessage.id] ??
      userPrefs.readThreadReplyCountByMsg?.[`${activeConversation.id}::${activeThreadMessage.id}`];
    if (currentReadReplyCount !== visibleReplies.length || (activeThreadMessage.unreadThreadReplyCount || 0) > 0) {
      markThreadReadOptimisticAndSync(activeConversation.id, activeThreadMessage.id);
    }
  }, [
    isTabVisible,
    open,
    threadOpen,
    activeConversation,
    activeThreadMessage,
    userPrefs.readThreadReplyCountByMsg,
    markThreadReadOptimisticAndSync,
  ]);

  const assigneeOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const existingSet = new Set<string>();
    staffDirectory.forEach((s) => {
      if (s.displayName && !existingSet.has(s.displayName)) {
        existingSet.add(s.displayName);
        out.push({ value: s.displayName, label: `${s.displayName} (${s.role || 'Nhân sự'})` });
      }
    });
    if (currentUser?.displayName && !existingSet.has(currentUser.displayName)) {
      out.unshift({
        value: currentUser.displayName,
        label: `${currentUser.displayName} (${currentUser.role || 'Tôi'})`,
      });
    }
    return out;
  }, [staffDirectory, currentUser]);

  return {
    editingNicknameTarget,
    setEditingNicknameTarget,
    nicknameInputVal,
    setNicknameInputVal,
    isUpdatingNickname,
    newRoomModalOpen,
    setNewRoomModalOpen,
    newRoomType,
    setNewRoomType,
    newRoomName,
    setNewRoomName,
    newRoomSubtitle,
    setNewRoomSubtitle,
    newRoomEmoji,
    setNewRoomEmoji,
    newRoomColor,
    setNewRoomColor,
    selectedMemberIds,
    setSelectedMemberIds,
    roomSearchQuery,
    setRoomSearchQuery,
    roomGroupFilter,
    setRoomGroupFilter,
    spaceMembersModalOpen,
    setSpaceMembersModalOpen,
    addMemberSelectedStaffId,
    setAddMemberSelectedStaffId,
    spaceConfigModalOpen,
    setSpaceConfigModalOpen,
    notifSettingsModalOpen,
    setNotifSettingsModalOpen,
    handlePopOutToMiniDock,
    handleQuickCreateTaskForDock,
    handleSendThreadReplyForDock,
    handleSelectSelfChat,
    handleSelectColleague,
    handleCreateSpace,
    handleToggleDepartmentOrTeam,
    handleAddMemberToSpace,
    handleBulkAddGroupToSpace,
    handleRemoveMemberFromSpace,
    getMemberNickname,
    handleOpenNicknameModal,
    handleSaveNickname,
    activeThreadMessage,
    assigneeOptions,
  };
}
