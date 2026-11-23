'use client';

import { useCallback } from 'react';
import type { MosChatConversation, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import type { MosChatMobileView } from '../types/mos-chat-types';

export interface UseMosChatSpaceActionsParams {
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  conversations: MosChatConversation[];
  activeConvId: string;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setActiveConvId: React.Dispatch<React.SetStateAction<string>>;
  setMobileView: React.Dispatch<React.SetStateAction<MosChatMobileView>>;
  markConversationAsRead: (convId: string) => Promise<void>;
}

/**
 * Handles Space/DM lifecycle inside MosChatContext: start DM, manage space members, nicknames, and config.
 */
export function useMosChatSpaceActions({
  currentUser,
  staffDirectory,
  conversations,
  activeConvId,
  setConversations,
  setActiveConvId,
  setMobileView,
  markConversationAsRead,
}: UseMosChatSpaceActionsParams) {
  const startDirectMessage = useCallback(
    async (staff: MosChatStaffMember): Promise<string | null> => {
      const peerId = Number(staff.id);
      const myStaffId = Number(currentUser?.id) || 0;
      const staffName = staff.displayName || staff.username || `Nhân sự #${staff.id}`;

      const existing = conversations.find((c) => {
        if (c.type !== 'dm' || c.isSelf) return false;
        if (myStaffId > 0 && peerId > 0 && Array.isArray(c.memberIds)) {
          const nums = c.memberIds.map(Number);
          if (nums.includes(myStaffId) && nums.includes(peerId)) return true;
        }
        return Number(c.participantStaffId) === peerId || c.name === staffName;
      });

      if (existing) {
        setActiveConvId(existing.id);
        markConversationAsRead(existing.id);
        setMobileView('room');
        return existing.id;
      }

      try {
        const res = await apiClient.chat.createConversation({
          type: 'dm',
          name: staffName,
          participantStaffId: staff.id,
        });
        if (res?.conversation) {
          setConversations((prev) => [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]);
          setActiveConvId(res.conversation.id);
          markConversationAsRead(res.conversation.id);
          setMobileView('room');
          return res.conversation.id;
        }
      } catch {
        const localDmId = `dm-${staff.id}`;
        const newDm: MosChatConversation = {
          id: localDmId,
          type: 'dm',
          name: staffName,
          color: '#3b82f6',
          participantStaffId: staff.id,
          memberIds: [myStaffId, peerId],
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
          messages: [],
        };
        setConversations((prev) => [newDm, ...prev]);
        setActiveConvId(localDmId);
        setMobileView('room');
        return localDmId;
      }
      return null;
    },
    [conversations, currentUser, markConversationAsRead, setActiveConvId, setConversations, setMobileView]
  );

  const addMemberToSpace = useCallback(
    async (staffId: number | number[], spaceId?: string): Promise<MosChatConversation | null> => {
      const targetSpaceId = spaceId || activeConvId;
      if (!targetSpaceId) return null;

      try {
        const res = await apiClient.chat.addMember(targetSpaceId, staffId);
        if (res?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
          return res.conversation;
        }
      } catch (err: SafeAny) {
        console.warn('apiClient.chat.addMember failed or mocked, applying optimistic fallback:', err);
      }

      let updatedConv: MosChatConversation | null = null;
      const idsToAdd = Array.isArray(staffId) ? staffId.map(Number) : [Number(staffId)];
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetSpaceId) return c;
          const currentIds = Array.isArray(c.memberIds) ? c.memberIds.map(Number) : [];
          const newIds = idsToAdd.filter((id) => !currentIds.includes(id));
          if (newIds.length === 0) return c;
          const updatedIds = [...currentIds, ...newIds];
          const updatedMembers = Array.isArray(c.members) ? [...c.members] : [];
          for (const id of newIds) {
            const targetStaff = staffDirectory.find((s) => Number(s.id) === id);
            if (targetStaff && !updatedMembers.some((m) => Number(m.id) === id)) {
              updatedMembers.push(targetStaff);
            }
          }
          updatedConv = {
            ...c,
            memberIds: updatedIds,
            members: updatedMembers,
            memberCount: updatedIds.length,
          };
          return updatedConv;
        })
      );
      return updatedConv;
    },
    [activeConvId, setConversations, staffDirectory]
  );

  const removeMemberFromSpace = useCallback(
    async (staffId: number, spaceId?: string): Promise<MosChatConversation | null> => {
      const targetSpaceId = spaceId || activeConvId;
      if (!targetSpaceId) return null;

      try {
        const res = await apiClient.chat.removeMember(targetSpaceId, staffId);
        if (res?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
          return res.conversation;
        }
      } catch (err: SafeAny) {
        console.warn('apiClient.chat.removeMember failed or mocked, applying optimistic fallback:', err);
      }

      let updatedConv: MosChatConversation | null = null;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetSpaceId) return c;
          const currentIds = Array.isArray(c.memberIds) ? c.memberIds.map(Number) : [];
          const updatedIds = currentIds.filter((id) => id !== Number(staffId));
          const updatedMembers = (c.members || []).filter((m) => Number(m.id) !== Number(staffId));
          updatedConv = {
            ...c,
            memberIds: updatedIds,
            members: updatedMembers,
            memberCount: updatedIds.length,
          };
          return updatedConv;
        })
      );
      return updatedConv;
    },
    [activeConvId, setConversations]
  );

  const updateMemberNickname = useCallback(
    async (staffId: number, nickname: string, spaceId?: string): Promise<boolean> => {
      const targetSpaceId = spaceId || activeConvId;
      if (!targetSpaceId) return false;

      try {
        const res = await apiClient.chat.updateNickname(targetSpaceId, { targetStaffId: staffId, nickname });
        if (res?.success && res.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
          return true;
        }
      } catch (err: SafeAny) {
        console.warn('apiClient.chat.updateNickname failed or mocked:', err);
      }
      return false;
    },
    [activeConvId, setConversations]
  );

  const updateSpaceConfig = useCallback(
    async (
      convId: string,
      payload: { name?: string; subtitle?: string; avatar?: string; color?: string }
    ): Promise<boolean> => {
      try {
        const res = await apiClient.chat.updateSpaceConfig(convId, payload);
        if (res?.success && res.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
          return true;
        }
      } catch (err) {
        console.error('Failed to update space config:', err);
      }
      return false;
    },
    [setConversations]
  );

  return {
    startDirectMessage,
    addMemberToSpace,
    removeMemberFromSpace,
    updateMemberNickname,
    updateSpaceConfig,
  };
}
