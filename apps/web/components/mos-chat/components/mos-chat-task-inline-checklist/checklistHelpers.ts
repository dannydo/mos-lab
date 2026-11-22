import type { CSSProperties } from 'react';
import type { MosChatStaffMember, MosChatTaskItem } from '@mos-lab/shared';
import type { ChecklistDeadlineMeta, ChecklistQuickDeadlineOption, ChecklistStaffOption } from './checklistTypes';

const AVATAR_RGB_PALETTE = [
  'rgb(217, 119, 6)',
  'rgb(139, 92, 246)',
  'rgb(14, 165, 233)',
  'rgb(16, 185, 129)',
  'rgb(236, 72, 153)',
  'rgb(244, 63, 94)',
  'rgb(99, 102, 241)',
] as const;

const AVATAR_BG_CLASSES = [
  'bg-amber-600',
  'bg-violet-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-indigo-500',
] as const;

function hashStaffName(name?: string | null): number {
  const s = (name || 'user').trim();
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getStaffInitials(name?: string | null): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function getStaffAvatarColor(name?: string | null): string {
  return AVATAR_RGB_PALETTE[hashStaffName(name) % AVATAR_RGB_PALETTE.length];
}

export function getStaffAvatarBgClass(name?: string | null): string {
  return AVATAR_BG_CLASSES[hashStaffName(name) % AVATAR_BG_CLASSES.length];
}

export function getDomainBadgeStyle(domain: string, isDark: boolean): CSSProperties {
  const upper = domain.toUpperCase();
  if (upper === 'CS' || upper === 'CSKH') {
    return {
      background: isDark ? 'rgba(14, 165, 233, 0.18)' : 'rgba(14, 165, 233, 0.12)',
      color: isDark ? 'rgb(56, 189, 248)' : 'rgb(2, 132, 199)',
      border: '1px solid rgba(14, 165, 233, 0.35)',
    };
  }
  if (upper === 'HR' || upper.includes('NHÂN SỰ')) {
    return {
      background: isDark ? 'rgba(217, 70, 239, 0.18)' : 'rgba(217, 70, 239, 0.12)',
      color: isDark ? 'rgb(232, 121, 249)' : 'rgb(192, 38, 211)',
      border: '1px solid rgba(217, 70, 239, 0.35)',
    };
  }
  if (upper === 'MKT' || upper.includes('MARKETING')) {
    return {
      background: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.12)',
      color: isDark ? 'rgb(129, 140, 248)' : 'rgb(79, 70, 229)',
      border: '1px solid rgba(99, 102, 241, 0.35)',
    };
  }
  if (upper.includes('VẬN HÀNH') || upper === 'VH') {
    return {
      background: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)',
      color: isDark ? 'rgb(52, 211, 153)' : 'rgb(5, 150, 105)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
    };
  }
  return {
    background: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.12)',
    color: isDark ? 'rgb(251, 191, 36)' : 'rgb(217, 119, 6)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
  };
}

export function getDomainBadgeClassName(domain: string, isDark: boolean): string {
  const upper = domain.toUpperCase();
  if (upper === 'CS' || upper === 'CSKH') {
    return isDark
      ? 'bg-sky-500/[0.18] text-sky-400 border border-sky-500/[0.35]'
      : 'bg-sky-500/[0.12] text-sky-600 border border-sky-500/[0.35]';
  }
  if (upper === 'HR' || upper.includes('NHÂN SỰ')) {
    return isDark
      ? 'bg-fuchsia-500/[0.18] text-fuchsia-400 border border-fuchsia-500/[0.35]'
      : 'bg-fuchsia-500/[0.12] text-fuchsia-600 border border-fuchsia-500/[0.35]';
  }
  if (upper === 'MKT' || upper.includes('MARKETING')) {
    return isDark
      ? 'bg-indigo-500/[0.18] text-indigo-400 border border-indigo-500/[0.35]'
      : 'bg-indigo-500/[0.12] text-indigo-600 border border-indigo-500/[0.35]';
  }
  if (upper.includes('VẬN HÀNH') || upper === 'VH') {
    return isDark
      ? 'bg-emerald-500/[0.18] text-emerald-400 border border-emerald-500/[0.35]'
      : 'bg-emerald-500/[0.12] text-emerald-600 border border-emerald-500/[0.35]';
  }
  return isDark
    ? 'bg-amber-500/[0.18] text-amber-400 border border-amber-500/[0.35]'
    : 'bg-amber-500/[0.12] text-amber-600 border border-amber-500/[0.35]';
}

export function formatShortDeadlineLabel(deadlineIso?: string | null): ChecklistDeadlineMeta | null {
  if (!deadlineIso) return null;
  const d = new Date(deadlineIso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const isDueSoon = !isOverdue && diffMs <= 3 * 24 * 3600 * 1000;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return {
    label: `${dd}/${mm}`,
    fullLabel: `${dd}/${mm}/${yyyy}`,
    isOverdue,
    isDueSoon,
  };
}

export function buildQuickDeadlineOptions(): ChecklistQuickDeadlineOption[] {
  const now = new Date();
  const today = new Date(now);
  today.setHours(18, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const endOfWeek = new Date(now);
  const day = endOfWeek.getDay();
  const daysToSat = day === 0 ? 5 : Math.max(1, 6 - day);
  endOfWeek.setDate(endOfWeek.getDate() + daysToSat);
  endOfWeek.setHours(18, 0, 0, 0);

  const week1OfMonth = new Date(now.getFullYear(), now.getMonth(), 7, 18, 0, 0, 0);
  if (week1OfMonth.getTime() < now.getTime() - 24 * 3600 * 1000) {
    week1OfMonth.setMonth(week1OfMonth.getMonth() + 1);
  }

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 18, 0, 0, 0);

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  return [
    { label: `Hôm nay (${fmt(today)})`, value: today.toISOString() },
    { label: `Ngày mai (${fmt(tomorrow)})`, value: tomorrow.toISOString() },
    { label: `Tuần này (${fmt(endOfWeek)})`, value: endOfWeek.toISOString() },
    { label: `Tuần 1 (${fmt(week1OfMonth)})`, value: week1OfMonth.toISOString() },
    { label: `Cuối tháng (${fmt(endOfMonth)})`, value: endOfMonth.toISOString() },
  ];
}

export function buildAllStaffOptions(
  staffList: MosChatStaffMember[],
  task: Pick<MosChatTaskItem, 'assigneeId' | 'assigneeName' | 'assignerId' | 'creatorName'>
): ChecklistStaffOption[] {
  const map = new Map<string, ChecklistStaffOption>();
  for (const s of staffList) {
    if (s && s.displayName) {
      map.set(s.displayName.trim().toLowerCase(), {
        id: s.id,
        displayName: s.displayName,
        role: s.role,
        avatarUrl: s.avatarUrl,
      });
    }
  }
  const fallbacks: ChecklistStaffOption[] = [
    { id: task.assigneeId || 'assignee', displayName: task.assigneeName || 'Bảo Hân', role: 'Phụ trách Task' },
    { id: task.assignerId || 'creator', displayName: task.creatorName || 'Danny Do', role: 'Người giao' },
    { id: 'bao-han', displayName: 'Bảo Hân', role: 'Admin' },
    { id: 'danny-do', displayName: 'Danny Do', role: 'CEO / Founder' },
  ];
  for (const f of fallbacks) {
    const key = f.displayName.trim().toLowerCase();
    if (key && !map.has(key)) {
      map.set(key, f);
    }
  }
  return Array.from(map.values());
}

export function filterStaffOptions(options: ChecklistStaffOption[], staffSearch: string): ChecklistStaffOption[] {
  const q = staffSearch.trim().toLowerCase();
  if (!q) return options;
  return options.filter((s) => s.displayName.toLowerCase().includes(q) || (s.role && s.role.toLowerCase().includes(q)));
}
