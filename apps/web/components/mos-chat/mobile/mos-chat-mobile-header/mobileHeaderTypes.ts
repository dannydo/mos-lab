import type { MosChatPresenceStatus } from '@mos-lab/shared';

export interface MosChatMobileHeaderProps {
  onOpenSettings?: () => void;
  onCallRoom?: () => void;
  onOpenTaskModal?: () => void;
  onOpenMembersModal?: () => void;
  onOpenSearch?: () => void;
  onOpenPushSettings?: () => void;
  onOpenThemeSheet?: () => void;
  onOpenNewDm?: () => void;
  isPushSubscribed?: boolean;
  onClose?: () => void;
}

export interface PresenceOption {
  id: MosChatPresenceStatus;
  label: string;
  dotClass: string;
}

export const PRESENCE_OPTIONS: readonly PresenceOption[] = [
  { id: 'active', label: 'Online', dotClass: 'bg-emerald-500' },
  { id: 'dnd', label: 'Bận', dotClass: 'bg-rose-500' },
  { id: 'away', label: 'Vắng', dotClass: 'bg-amber-500' },
] as const;

export function getPresenceDotClass(presence: MosChatPresenceStatus): string {
  if (presence === 'active') return 'bg-emerald-500';
  if (presence === 'dnd') return 'bg-rose-500';
  return 'bg-amber-500';
}

export function formatUnreadBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function getHeaderCountBadgeClass(tone: 'amber' | 'emerald', isDark: boolean): string {
  if (tone === 'emerald') {
    return isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800';
  }
  return isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800';
}

export function getPushStatusBadgeClass(isPushSubscribed: boolean, isDark: boolean): string {
  if (isPushSubscribed) {
    return isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
  }
  return isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800';
}
