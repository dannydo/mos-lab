import type { MosChatConversation, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

export interface DmOmiCallTarget {
  staffId?: number;
  displayName: string;
  phone: string;
  phones: string[];
  avatarUrl?: string | null;
}

/**
 * Strips formatting characters to digits and converts leading Vietnam +84 / 84 prefix to 0.
 * Returns empty string if the result has fewer than 8 digits.
 */
export function normalizeDialablePhone(raw: string): string {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  const localDigits = digits.startsWith('84') && digits.length >= 10 ? `0${digits.slice(2)}` : digits;
  return localDigits.length >= 8 ? localDigits : '';
}

export function extractDialablePhones(phone?: string | null, phones?: string[] | null): string[] {
  const candidates = [phone, ...(Array.isArray(phones) ? phones : [])];
  const seenDigits = new Set<string>();
  const out: string[] = [];

  for (const item of candidates) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const norm = normalizeDialablePhone(trimmed);
    if (!norm || seenDigits.has(norm)) continue;
    seenDigits.add(norm);
    out.push(trimmed);
  }
  return out;
}

export function resolveDmPeerStaff(
  conv: MosChatConversation | null | undefined,
  staffDirectory: MosChatStaffMember[] | undefined,
  currentUser?: SafeAny
): MosChatStaffMember | null {
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

  return peer || null;
}

/**
 * Resolves the outbound OmiCall target (staff phones & profile) for a 1-1 DM conversation.
 * Returns null for spaces, AI Copilot, self-DMs, or staff without a valid dialable phone number.
 */
export function resolveDmOmiCallTarget(
  conv: MosChatConversation | null | undefined,
  staffDirectory: MosChatStaffMember[] | undefined,
  currentUser?: SafeAny
): DmOmiCallTarget | null {
  const peer = resolveDmPeerStaff(conv, staffDirectory, currentUser);
  if (!peer || !conv) return null;

  const validPhones = extractDialablePhones(peer.phone, peer.phones);
  if (validPhones.length === 0) return null;

  return {
    staffId: peer.id,
    displayName: peer.displayName || conv.name,
    phone: validPhones[0],
    phones: validPhones,
    avatarUrl: peer.avatarUrl || conv.avatar || null,
  };
}
