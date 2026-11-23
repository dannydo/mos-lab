import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  removeVietnameseTones,
  type MosChatConversation,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import { formatChatPreviewWithStickers } from '../../mos-chat-stickers';
import type { MosChatSidebarFilter } from '../../types/mos-chat-types';
import type { DeptFilterChip, InboxFilterChip, NewDmDeptFilter } from './inboxTypes';

dayjs.extend(relativeTime);

export const SIDEBAR_FILTER_CHIPS: readonly InboxFilterChip[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'spaces', label: 'Kênh' },
] as const;

export const NEW_DM_DEPT_CHIPS: readonly DeptFilterChip[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'CV', label: 'Chuyên Viên' },
  { id: 'CC', label: 'Tư Vấn CC' },
  { id: 'TELESALES', label: 'Telesales' },
  { id: 'ADMIN', label: 'Quản Lý' },
] as const;

export function formatStaffRole(role?: string): string {
  if (!role) return 'Nhân viên';
  const r = role.toLowerCase();
  if (r.includes('cv') || r.includes('chuyên viên')) return 'Chuyên Viên';
  if (r.includes('cc') || r.includes('tư vấn')) return 'Tư Vấn CC';
  if (r.includes('telesales') || r.includes('sale')) return 'Telesales';
  if (r.includes('admin') || r.includes('quản lý')) return 'Quản Lý';
  return role;
}

export function formatConversationTimeLabel(conv: MosChatConversation): string {
  const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
  const dateSource = lastMsg?.createdAt || conv.updatedAt;
  if (!dateSource) return '';
  const dt = dayjs(dateSource);
  return dt.isSame(dayjs(), 'day') ? dt.format('HH:mm') : dt.format('DD/MM');
}

export function getConversationPreviewText(conv: MosChatConversation): string {
  const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
  const previewRaw = lastMsg?.text || conv.subtitle || 'Chưa có tin nhắn mới';
  return formatChatPreviewWithStickers(previewRaw);
}

/**
 * Map a Space's configured RGB hex string (parsed numerically) to Tailwind surface/border/text tone classes
 * with dark/light theme parity, avoiding inline style objects and literal color codes.
 */
export function resolveSpaceAvatarToneClasses(color?: string, isDark = true): string {
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

    if (delta <= 45) {
      return `bg-slate-500/15 border-slate-500/30 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
    }

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

    if (deg < 20 || deg >= 345) {
      return `bg-red-500/15 border-red-500/30 ${isDark ? 'text-red-400' : 'text-red-600'}`;
    }
    if (deg < 35) {
      return `bg-orange-500/15 border-orange-500/30 ${isDark ? 'text-orange-400' : 'text-orange-600'}`;
    }
    if (deg < 60) {
      return `bg-amber-500/15 border-amber-500/30 ${isDark ? 'text-amber-400' : 'text-amber-600'}`;
    }
    if (deg < 165) {
      return `bg-emerald-500/15 border-emerald-500/30 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`;
    }
    if (deg < 185) {
      return `bg-teal-500/15 border-teal-500/30 ${isDark ? 'text-teal-400' : 'text-teal-600'}`;
    }
    if (deg < 205) {
      return `bg-cyan-500/15 border-cyan-500/30 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`;
    }
    if (deg < 230) {
      return `bg-blue-500/15 border-blue-500/30 ${isDark ? 'text-blue-400' : 'text-blue-600'}`;
    }
    if (deg < 252) {
      return `bg-indigo-500/15 border-indigo-500/30 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`;
    }
    if (deg < 305) {
      return `bg-purple-500/15 border-purple-500/30 ${isDark ? 'text-purple-400' : 'text-purple-600'}`;
    }
    return `bg-pink-500/15 border-pink-500/30 ${isDark ? 'text-pink-400' : 'text-pink-600'}`;
  }

  return `bg-amber-500/15 border-amber-500/30 ${isDark ? 'text-amber-400' : 'text-amber-600'}`;
}

export function filterAndSortInboxConversations(
  conversations: MosChatConversation[],
  searchQuery: string,
  sidebarFilter: MosChatSidebarFilter,
  pinnedConvIds?: Set<string>
): MosChatConversation[] {
  const trimmedQuery = searchQuery.trim();
  const normQ = trimmedQuery ? removeVietnameseTones(trimmedQuery.toLowerCase()) : '';

  const list = conversations.filter((c) => {
    if (normQ) {
      const matchName = removeVietnameseTones(c.name.toLowerCase()).includes(normQ);
      const matchSubtitle = c.subtitle ? removeVietnameseTones(c.subtitle.toLowerCase()).includes(normQ) : false;
      const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].text : '';
      const matchLast = removeVietnameseTones(lastMsg.toLowerCase()).includes(normQ);
      if (!matchName && !matchSubtitle && !matchLast) return false;
    }

    if (sidebarFilter === 'unread') return (c.unreadCount || 0) > 0;
    if (sidebarFilter === 'spaces') return c.type === 'space';
    if (sidebarFilter === 'dms') return c.type === 'dm';
    if (sidebarFilter === 'pinned') return Boolean(pinnedConvIds?.has(c.id));

    return true;
  });

  return [...list].sort((a, b) => {
    if (a.id === AI_COPILOT_CONV_ID) return -1;
    if (b.id === AI_COPILOT_CONV_ID) return 1;

    const aPinned = Boolean(pinnedConvIds?.has(a.id));
    const bPinned = Boolean(pinnedConvIds?.has(b.id));
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    return 0;
  });
}

export function filterColleagues(
  staffDirectory: MosChatStaffMember[] | undefined,
  currentUser: SafeAny,
  query: string,
  deptFilter: NewDmDeptFilter = 'ALL'
): MosChatStaffMember[] {
  const myId = Number(currentUser?.id) || 0;
  const trimmed = query.trim();
  const normQ = trimmed ? removeVietnameseTones(trimmed.toLowerCase()) : '';

  return (staffDirectory || []).filter((s) => {
    if (Number(s.id) === myId) return false;

    if (deptFilter !== 'ALL') {
      const r = (s.role || '').toLowerCase();
      if (deptFilter === 'CV' && !r.includes('cv') && !r.includes('chuyên viên')) return false;
      if (deptFilter === 'CC' && !r.includes('cc') && !r.includes('tư vấn')) return false;
      if (deptFilter === 'TELESALES' && !r.includes('telesales') && !r.includes('sale')) return false;
      if (deptFilter === 'ADMIN' && !r.includes('admin') && !r.includes('quản lý')) return false;
    }

    if (normQ) {
      const name = removeVietnameseTones((s.displayName || s.username || '').toLowerCase());
      const role = removeVietnameseTones((s.role || '').toLowerCase());
      return name.includes(normQ) || role.includes(normQ);
    }

    return true;
  });
}

export function shouldShowAiCopilotShortcut(deptFilter: NewDmDeptFilter, searchQuery: string): boolean {
  return deptFilter === 'ALL' || deptFilter === 'ADMIN' || !searchQuery || /mai|ai|copilot/i.test(searchQuery);
}

export function triggerHapticFeedback(durationMs: number): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate?.(durationMs);
  }
}
