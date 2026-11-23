import type { MosChatStaffMember } from '@mos-lab/shared';
import { removeVietnameseTones } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../../lib/api-base-url';

export const AVATAR_COLOR_PALETTES = [
  { bg: 'from-amber-600 to-amber-700', border: 'border-amber-500/40', text: 'text-amber-100' },
  { bg: 'from-blue-600 to-indigo-700', border: 'border-blue-500/40', text: 'text-blue-100' },
  { bg: 'from-emerald-600 to-teal-700', border: 'border-emerald-500/40', text: 'text-emerald-100' },
  { bg: 'from-purple-600 to-indigo-700', border: 'border-purple-500/40', text: 'text-purple-100' },
  { bg: 'from-rose-600 to-pink-700', border: 'border-rose-500/40', text: 'text-rose-100' },
  { bg: 'from-cyan-600 to-blue-700', border: 'border-cyan-500/40', text: 'text-cyan-100' },
  { bg: 'from-violet-600 to-fuchsia-700', border: 'border-violet-500/40', text: 'text-violet-100' },
];

export function getAvatarColorPalette(name?: string | null): { bg: string; border: string; text: string } {
  if (!name) return AVATAR_COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_COLOR_PALETTES.length;
  return AVATAR_COLOR_PALETTES[idx];
}

export function getAvatarInitials(name?: string | null, fallback?: string | null): string {
  const cleanFallback = String(fallback || '').trim();
  if (cleanFallback && !cleanFallback.includes('/') && !cleanFallback.includes('.')) {
    const fbChars = Array.from(cleanFallback);
    if (fbChars.length > 0 && fbChars.length <= 3) {
      return fbChars.join('').toUpperCase();
    }
  }
  const clean = String(name || '')
    .replace(/\s*\(Ghi chú cho tôi\)\s*$/i, '')
    .replace(/^⭐\s*Chính tôi\s*\((.+)\)\s*$/i, '$1')
    .replace(/^Chuyên Viên\s+/i, '')
    .replace(/^(CV|KTV|Admin|Super Admin)\s+/i, '')
    .replace(/^[^\p{L}\p{N}]+/gu, '')
    .trim();
  if (!clean) {
    const rawChars = Array.from(String(name || '').trim());
    return rawChars.length > 0 ? rawChars[0].toUpperCase() : 'NV';
  }
  const parts = clean
    .split(/\s+/)
    .map((p) => p.replace(/^[^\p{L}\p{N}]+/gu, ''))
    .filter(Boolean);
  if (parts.length >= 2) {
    const first = Array.from(parts[0])[0] || '';
    const last = Array.from(parts[parts.length - 1])[0] || '';
    return `${first}${last}`.toUpperCase();
  }
  return Array.from(clean).slice(0, 2).join('').toUpperCase();
}

export function normalizeAvatarImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const isLikelyImageUrl =
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/api/') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('data:image/') ||
    /\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?|$)/i.test(trimmed);
  if (!isLikelyImageUrl) return null;
  const formatted = trimmed.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com');
  return resolveMediaUrl(formatted);
}

export function resolveStaffAvatarUrl({
  staffId,
  name,
  username,
  rawAvatar,
  staffDirectory,
}: {
  staffId?: number | string | null;
  name?: string | null;
  username?: string | null;
  rawAvatar?: string | null;
  staffDirectory?: MosChatStaffMember[];
}): string | null {
  const direct = normalizeAvatarImageUrl(rawAvatar);
  if (direct) return direct;

  if (!staffDirectory || staffDirectory.length === 0) return null;

  const targetId = staffId && !isNaN(Number(staffId)) ? Number(staffId) : null;
  const cleanName = String(name || '')
    .replace(/\s*\(Ghi chú cho tôi\)\s*$/i, '')
    .replace(/^Chuyên Viên\s+/i, '')
    .trim()
    .toLowerCase();
  const cleanNameNorm = removeVietnameseTones(cleanName);

  const cleanUser = String(username || '')
    .trim()
    .toLowerCase();

  const matched = staffDirectory.find((s) => {
    if (targetId && Number(s.id) === targetId) return true;
    if (targetId && s.legacyStaffId && Number(s.legacyStaffId) === targetId) return true;

    const sName = String(s.displayName || '')
      .trim()
      .toLowerCase();
    const sNameNorm = removeVietnameseTones(sName);
    if (cleanName && sName && (sName === cleanName || sName.endsWith(` ${cleanName}`))) return true;
    if (cleanNameNorm && sNameNorm && (sNameNorm === cleanNameNorm || sNameNorm.endsWith(` ${cleanNameNorm}`)))
      return true;

    const sUser = String(s.username || '')
      .trim()
      .toLowerCase();
    if (cleanUser && sUser && sUser === cleanUser) return true;
    if (cleanName && sUser && (sUser.includes(cleanName) || cleanName.includes(sUser))) return true;

    return false;
  });

  if (matched?.avatarUrl) {
    return normalizeAvatarImageUrl(matched.avatarUrl);
  }

  return null;
}

export interface TaskPersonNode {
  key: string;
  name: string;
  avatar: string | null;
  color: string;
}

export function resolveTaskPeopleFlow(
  task: {
    creatorName?: string | null;
    assignerId?: number | string | null;
    assignerName?: string | null;
    assigneeId?: number | string | null;
    assigneeName?: string | null;
    sourceAuthorName?: string | null;
  },
  staffDirectory: MosChatStaffMember[] = []
): {
  creator: TaskPersonNode;
  assigner: TaskPersonNode;
  assignee: TaskPersonNode;
  participants: TaskPersonNode[];
} {
  const creatorName = task.sourceAuthorName || task.creatorName || 'Hệ thống';
  const assignerName = task.assignerName || task.creatorName || creatorName;
  const assigneeName = task.assigneeName || 'Chung';

  const creatorAvatar = resolveStaffAvatarUrl({
    name: creatorName,
    staffDirectory,
  });
  const assignerAvatar = resolveStaffAvatarUrl({
    staffId: task.assignerId,
    name: assignerName,
    staffDirectory,
  });
  const assigneeAvatar = resolveStaffAvatarUrl({
    staffId: task.assigneeId,
    name: assigneeName,
    staffDirectory,
  });

  const participants: TaskPersonNode[] = [];
  if (creatorName && creatorName !== assignerName && creatorName !== assigneeName) {
    participants.push({
      key: `creator-${creatorName}`,
      name: creatorName,
      avatar: creatorAvatar,
      color: '#6366f1',
    });
  }

  return {
    creator: {
      key: `creator-${creatorName}`,
      name: creatorName,
      avatar: creatorAvatar,
      color: '#6366f1',
    },
    assigner: {
      key: `assigner-${assignerName}`,
      name: assignerName,
      avatar: assignerAvatar,
      color: '#0284c7',
    },
    assignee: {
      key: `assignee-${assigneeName}`,
      name: assigneeName,
      avatar: assigneeAvatar,
      color: '#d97706',
    },
    participants,
  };
}
