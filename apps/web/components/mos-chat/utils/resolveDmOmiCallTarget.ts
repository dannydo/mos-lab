import type { MosChatConversation, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

export interface DmOmiCallTarget {
  staffId?: number;
  displayName: string;
  phone: string;
  avatarUrl?: string | null;
}

/**
 * Resolves the outbound OmiCall target (staff phone & profile) for a 1-1 DM conversation.
 * Returns null for spaces, AI Copilot, self-DMs, or staff without a valid dialable phone number.
 */
export function resolveDmOmiCallTarget(
  conv: MosChatConversation | null | undefined,
  staffDirectory: MosChatStaffMember[] | undefined,
  currentUser?: SafeAny
): DmOmiCallTarget | null {
  if (!conv || conv.type !== 'dm') return null;
  if (conv.id === AI_COPILOT_CONV_ID || conv.isSelf || conv.id.startsWith('dm-self-')) {
    return null;
  }
  if (!Array.isArray(staffDirectory) || staffDirectory.length === 0) {
    return null;
  }

  const currentUserId = Number(currentUser?.id);
  const currentUsername = String(currentUser?.username || '')
    .trim()
    .toLowerCase();

  const isCurrentUser = (staff: MosChatStaffMember) =>
    (Number.isFinite(currentUserId) && currentUserId > 0 && Number(staff.id) === currentUserId) ||
    (currentUsername.length > 0 && staff.username.trim().toLowerCase() === currentUsername);

  let peer: MosChatStaffMember | undefined;

  const participantId = Number(conv.participantStaffId);
  if (Number.isFinite(participantId) && participantId > 0 && participantId !== currentUserId) {
    peer = staffDirectory.find((s) => Number(s.id) === participantId && !isCurrentUser(s));
  }

  if (!peer && Array.isArray(conv.memberIds)) {
    const otherMemberId = conv.memberIds
      .map(Number)
      .find((id) => Number.isFinite(id) && id > 0 && id !== currentUserId);
    if (otherMemberId) {
      peer = staffDirectory.find((s) => Number(s.id) === otherMemberId && !isCurrentUser(s));
    }
  }

  if (!peer) {
    const normalizedConvName = String(conv.name || '')
      .trim()
      .toLowerCase();
    if (normalizedConvName) {
      peer = staffDirectory.find(
        (s) =>
          !isCurrentUser(s) &&
          (s.displayName.trim().toLowerCase() === normalizedConvName ||
            s.username.trim().toLowerCase() === normalizedConvName)
      );
    }
  }

  const rawPhone = typeof peer?.phone === 'string' ? peer.phone.trim() : '';
  if (!peer || !rawPhone) return null;

  const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 8) return null;

  return {
    staffId: peer.id,
    displayName: peer.displayName || conv.name,
    phone: rawPhone,
    avatarUrl: peer.avatarUrl || conv.avatar || null,
  };
}
