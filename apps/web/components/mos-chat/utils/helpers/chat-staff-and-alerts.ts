import dayjs from 'dayjs';
import type { MosChatStaffMember, SafeAny } from '@mos-lab/shared';

export function matchesStaffGroup(member: MosChatStaffMember, groupKey: string): boolean {
  const role = String(member.role || '')
    .toLowerCase()
    .trim();
  const depts = (member.departmentCodes || []).map((d) => d.toUpperCase());
  const teams = (member.teamCodes || []).map((t) => t.toUpperCase());

  switch (groupKey) {
    case 'DEPT_SHOP':
      return (
        depts.includes('SHOP') ||
        [
          'cc',
          'coca',
          'consultant',
          'cv',
          'cvl',
          'cvll',
          'cv_plus',
          'cv_plus_plus',
          'lt',
          'technician',
          'ktv',
          'qa_qc',
        ].includes(role)
      );
    case 'DEPT_GROWTH':
      return depts.includes('GROWTH') || ['telesales', 'booker', 'oc', 'ls', 'cs', 'control'].includes(role);
    case 'DEPT_ACADEMY':
      return depts.includes('ACADEMY') || ['teacher', 'ht'].includes(role);
    case 'DEPT_BACK_OFFICE':
      return (
        depts.includes('BACK_OFFICE') ||
        [
          'super_admin',
          'admin',
          'boss',
          'manager',
          'fm',
          'cho',
          'staff',
          'office-cleaner',
          'security-guard',
          'rnd',
        ].includes(role)
      );
    case 'TEAM_CORE':
      return teams.includes('CORE') || teams.includes('CORE_TEAM') || ['super_admin', 'boss'].includes(role);
    case 'TEAM_ADMIN_MANAGER':
      return teams.includes('ADMIN_MANAGER') || ['super_admin', 'admin', 'boss', 'manager', 'fm', 'cho'].includes(role);
    case 'TEAM_CC':
      return teams.includes('CC') || ['cc', 'coca', 'consultant'].includes(role);
    case 'TEAM_CV':
      return (
        teams.includes('CV') ||
        ['cv', 'cvl', 'cvll', 'cv_plus', 'cv_plus_plus', 'lt', 'technician', 'ktv'].includes(role)
      );
    case 'TEAM_TELESALES':
      return (
        teams.includes('BK_TELESALES') || teams.includes('BK') || ['telesales', 'booker', 'oc', 'ls'].includes(role)
      );
    case 'TEAM_CS_CONTROL':
      return (
        teams.includes('BK_CS_CONTROL') ||
        teams.includes('BK_CS') ||
        teams.includes('BK_CONTROL') ||
        ['cs', 'control'].includes(role)
      );
    case 'TEAM_ACADEMY':
      return teams.includes('ACADEMY') || teams.includes('MARKETING_SALES') || ['teacher', 'ht'].includes(role);
    case 'TEAM_QA_QC':
      return teams.some((t) => t.startsWith('QA_QC')) || ['qa_qc'].includes(role);
    case 'TEAM_INTERNAL':
      return teams.includes('BACK_OFFICE_STAFF') || ['staff', 'office-cleaner', 'security-guard', 'rnd'].includes(role);
    default:
      return false;
  }
}

export function getTaskDeadlineInfo(deadlineIso?: string | null, done?: boolean) {
  if (!deadlineIso) return null;
  const d = dayjs(deadlineIso);
  if (!d.isValid()) return null;
  const now = dayjs();
  const diffMinutes = d.diff(now, 'minute');
  const isOverdue = diffMinutes < 0 && !done;
  const isDueSoon = diffMinutes >= 0 && diffMinutes <= 180 && !done;

  let relative: string;
  if (done) {
    relative = 'Đã xong';
  } else if (isOverdue) {
    const absMin = Math.abs(diffMinutes);
    if (absMin < 60) relative = `Trễ ${absMin}p`;
    else if (absMin < 1440) relative = `Trễ ${Math.floor(absMin / 60)}h ${absMin % 60}m`;
    else relative = `Trễ ${Math.floor(absMin / 1440)} ngày`;
  } else {
    if (diffMinutes < 60) relative = `Còn ${diffMinutes}p`;
    else if (diffMinutes < 1440) relative = `Còn ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
    else relative = `Còn ${Math.floor(diffMinutes / 1440)} ngày`;
  }

  let label: string;
  if (d.isSame(now, 'day')) {
    label = `Hôm nay ${d.format('HH:mm')}`;
  } else if (d.isSame(now.add(1, 'day'), 'day')) {
    label = `Mai ${d.format('HH:mm')}`;
  } else {
    label = d.format('DD/MM HH:mm');
  }

  return {
    raw: d,
    label,
    relative,
    isOverdue,
    isDueSoon,
  };
}

export function playWebAudioBuzzChime() {
  try {
    const AudioCtx = window.AudioContext || (window as SafeAny).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // High-attention dual alert pulses (880Hz -> 1320Hz -> 880Hz -> 1320Hz)
    const tones = [
      { freq: 880, time: 0 },
      { freq: 1320, time: 0.1 },
      { freq: 880, time: 0.22 },
      { freq: 1320, time: 0.32 },
    ];
    tones.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.11);
    });
  } catch {
    // non-blocking audio fallback
  }
}

export function triggerBuzzVibration() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch {
    // non-blocking vibrate fallback
  }
}

export function playWebAudioReminderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as SafeAny).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.11 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.11);
      osc.stop(ctx.currentTime + idx * 0.11 + 0.44);
    });
  } catch {
    // non-blocking audio fallback
  }
}

export function formatCountdown(remindAtIso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((new Date(remindAtIso).getTime() - nowMs) / 1000));
  if (diffSec <= 0) return '00:00';
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins >= 60) {
    return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}p`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
