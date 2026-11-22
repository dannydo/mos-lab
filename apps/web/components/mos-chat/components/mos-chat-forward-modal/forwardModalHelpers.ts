import {
  type MosChatConversation,
  type MosChatMessage,
  type MosChatStaffMember,
  type MosChatThreadReply,
  type SafeAny,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import type { ForwardTargetGroup, ForwardTargetOption, ThreadForwardSummary } from './forwardModalTypes';

const SPACE_BADGE_CLASSES = [
  'bg-blue-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-indigo-500',
] as const;

/** Map a space hex color string (parsed numerically) or name to a Tailwind bg-* class. */
export function resolveSpaceBadgeBgClass(color?: string, fallbackName?: string): string {
  const cleaned = String(color || '')
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '');

  if (cleaned.length === 6) {
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta <= 45) return 'bg-slate-500';

    let hue = 0;
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    const rawDeg = Math.round(hue * 60);
    const deg = rawDeg < 0 ? rawDeg + 360 : rawDeg;

    if (deg < 20 || deg >= 345) return 'bg-red-500';
    if (deg < 35) return 'bg-orange-500';
    if (deg < 60) return 'bg-amber-500';
    if (deg < 165) return 'bg-emerald-500';
    if (deg < 185) return 'bg-teal-500';
    if (deg < 205) return 'bg-cyan-500';
    if (deg < 230) return 'bg-blue-500';
    if (deg < 252) return 'bg-indigo-500';
    if (deg < 305) return 'bg-violet-500';
    return 'bg-pink-500';
  }

  if (fallbackName) {
    let hash = 0;
    for (let i = 0; i < fallbackName.length; i++) {
      hash = (hash << 5) - hash + fallbackName.charCodeAt(i);
      hash |= 0;
    }
    return SPACE_BADGE_CLASSES[Math.abs(hash) % SPACE_BADGE_CLASSES.length];
  }

  return 'bg-blue-500';
}

export function summarizeThreadReplies(
  sourceMessage: MosChatMessage | null,
  sourceReply?: MosChatThreadReply | null
): ThreadForwardSummary {
  if (sourceReply || !sourceMessage) {
    return {
      activeReplies: [],
      threadParticipantsSummary: '',
      threadAttachmentsCount: 0,
    };
  }

  const activeReplies = (sourceMessage.thread || []).filter((r) => !r.isDeleted);
  const names = Array.from(new Set(activeReplies.map((r) => r.senderName).filter(Boolean)));
  const threadParticipantsSummary =
    names.length === 0
      ? ''
      : names.length <= 3
        ? names.join(', ')
        : `${names.slice(0, 3).join(', ')} +${names.length - 3}`;

  const threadAttachmentsCount = activeReplies.reduce((sum, r) => sum + (r.attachments?.length || 0), 0);

  return {
    activeReplies,
    threadParticipantsSummary,
    threadAttachmentsCount,
  };
}

export function resolveCurrentStaffId(currentUser: SafeAny, staffDirectory: MosChatStaffMember[]): number {
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
}

export function buildForwardTargetOptions({
  conversations,
  staffDirectory,
  pinnedIds,
  myStaffId,
  currentUser,
}: {
  conversations: MosChatConversation[];
  staffDirectory: MosChatStaffMember[];
  pinnedIds: string[];
  myStaffId: number;
  currentUser?: SafeAny;
}): ForwardTargetOption[] {
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
      badgeBgClass: type === 'space' ? resolveSpaceBadgeBgClass(conv.color, conv.name) : undefined,
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
      isPinned: false,
      updatedAtMs: 0,
      searchHaystack: removeVietnameseTones(`${displayName} ${staff.username || ''} ${staff.role || ''}`.toLowerCase()),
    });
  }

  return options;
}

export function filterAndGroupForwardTargets(
  allTargetOptions: ForwardTargetOption[],
  searchQuery: string
): ForwardTargetGroup[] {
  const qNorm = removeVietnameseTones(searchQuery.trim().toLowerCase());
  const filteredOptions = qNorm
    ? allTargetOptions.filter((opt) => opt.searchHaystack.includes(qNorm))
    : allTargetOptions;

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

  const groups: ForwardTargetGroup[] = [
    { id: 'self', title: 'Ghi chú cá nhân', items: selfItems },
    { id: 'pinned', title: 'Đã ghim', items: pinnedItems },
    { id: 'spaces', title: 'Spaces', items: spaceItems },
    { id: 'dms', title: 'Tin nhắn trực tiếp & Danh bạ nhân sự', items: dmItems },
  ];

  return groups.filter((g) => g.items.length > 0);
}
