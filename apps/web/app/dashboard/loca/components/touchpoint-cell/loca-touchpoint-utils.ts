import { LASH_TOUCHUP_SYSTEM_CONFIG, type TouchpointStatus } from '@mos-lab/shared';

export type LocaTouchpointDisplayStatus = TouchpointStatus | 'OVERDUE' | 'BLANK';

export function resolveLocaTouchpointDisplayStatus({
  days,
  touchpointKey,
  targetDays,
  isChecked,
  rawStatus,
}: {
  days: number | null | undefined;
  touchpointKey: string;
  targetDays: number;
  isChecked: boolean;
  rawStatus: TouchpointStatus | null;
}): LocaTouchpointDisplayStatus {
  let isActive = false;
  let isOverdue = false;

  if (days !== null && days !== undefined) {
    if (touchpointKey === '24h') {
      isActive = days === 1;
      isOverdue = days > 1 && !isChecked && !rawStatus;
    } else if (touchpointKey === '17') {
      isActive = days >= 16 && days <= 17;
      isOverdue = days > 17 && !isChecked && !rawStatus;
    } else if (touchpointKey === '19') {
      isActive = days >= 18 && days <= 19;
      isOverdue = days > 19 && !isChecked && !rawStatus;
    } else if (touchpointKey === String(LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS)) {
      isActive = days >= 20 && days <= LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS;
      isOverdue = days > LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS && !isChecked && !rawStatus;
    } else if (touchpointKey === '23') {
      isActive = days >= 22 && days <= 23;
      isOverdue = days > 23 && !isChecked && !rawStatus;
    } else if (touchpointKey === String(LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS)) {
      isActive = days >= 24 && days <= LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS;
      isOverdue = days > LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS && !isChecked && !rawStatus;
    } else if (touchpointKey === '30') {
      isActive = days >= 29 && days <= 30;
      isOverdue = days > 30 && !isChecked && !rawStatus;
    } else if (touchpointKey === '30plus') {
      isActive = days > 30;
      isOverdue = false;
    }
  }

  if (rawStatus) return rawStatus;
  if (isActive) return 'DUE_TODAY';
  if (days !== null && days !== undefined && days < targetDays) return 'PENDING';
  if (isOverdue) return 'OVERDUE';
  return 'BLANK';
}

export function buildDiamondAnnotatedNote(noteInput: string, hasReferredDiamond: boolean): string {
  let finalNote = noteInput.trim();
  if (hasReferredDiamond && !finalNote.includes('💎')) {
    finalNote = finalNote ? `${finalNote} [Đã tư vấn CT Kim Cương 💎]` : '[Đã tư vấn CT Kim Cương 💎]';
  } else if (!hasReferredDiamond && finalNote.includes(' [Đã tư vấn CT Kim Cương 💎]')) {
    finalNote = finalNote.replace(' [Đã tư vấn CT Kim Cương 💎]', '');
  } else if (!hasReferredDiamond && finalNote.includes('[Đã tư vấn CT Kim Cương 💎]')) {
    finalNote = finalNote.replace('[Đã tư vấn CT Kim Cương 💎]', '');
  }
  return finalNote;
}

export function getTouchpointTileClassName(displayStatus: LocaTouchpointDisplayStatus, isDark: boolean): string {
  switch (displayStatus) {
    case 'DONE':
      return isDark
        ? 'bg-emerald-600/35 border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(5,150,105,0.6)]'
        : 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(5,150,105,0.6)]';
    case 'BOOKED':
      return isDark
        ? 'bg-indigo-500/30 border border-indigo-400 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
        : 'bg-indigo-500/18 border border-indigo-400 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]';
    case 'SUCCESS':
      return isDark
        ? 'bg-emerald-500/25 border border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
        : 'bg-emerald-500/15 border border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
    case 'CALLBACK':
      return isDark
        ? 'bg-purple-500/25 border border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
        : 'bg-purple-500/15 border border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]';
    case 'MESSAGED':
      return isDark
        ? 'bg-cyan-500/25 border border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
        : 'bg-cyan-500/15 border border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]';
    case 'FAILED':
      return isDark
        ? 'bg-red-500/25 border border-red-500 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
        : 'bg-red-500/15 border border-red-500 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    case 'LOST':
      return isDark
        ? 'bg-rose-500/25 border border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.35)]'
        : 'bg-rose-500/15 border border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.35)]';
    case 'DUE_TODAY':
      return isDark
        ? 'bg-amber-500/25 border-[1.5px] border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
        : 'bg-amber-500/18 border-[1.5px] border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]';
    case 'PENDING':
      return isDark
        ? 'bg-slate-400/10 border border-slate-400/25 text-slate-400'
        : 'bg-slate-100/60 border border-slate-400/25 text-slate-400';
    case 'OVERDUE':
      return isDark
        ? 'bg-red-500/12 border border-dashed border-red-500 text-red-300'
        : 'bg-red-50 border border-dashed border-red-500 text-red-500';
    default:
      return isDark ? 'bg-transparent border-0 text-slate-500' : 'bg-transparent border-0 text-slate-400';
  }
}
