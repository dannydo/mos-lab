import dayjs from 'dayjs';
import type { MosChatImageAttachment, MosChatImageMimeType, MosChatStaffMember, SafeAny } from '@mos-lab/shared';

export function matchesStaffGroup(member: MosChatStaffMember, groupKey: string): boolean {
  const role = String(member.role || '')
    .toLowerCase()
    .trim();
  const depts = (member.departmentCodes || []).map((d) => d.toUpperCase());
  const teams = (member.teamCodes || []).map((t) => t.toUpperCase());

  switch (groupKey) {
    case 'DEPT_SHOP':
      return (
        depts.includes('SHOP') || ['cc', 'coca', 'consultant', 'cv', 'lt', 'technician', 'ktv', 'qa_qc'].includes(role)
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
      return teams.includes('CV') || ['cv', 'lt', 'technician', 'ktv'].includes(role);
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

  let relative = '';
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

  let label = '';
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
  } catch (_) {}
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

export function parseGoogleDriveImageFromText(rawText: string): MosChatImageAttachment | null {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return null;
  const match =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/uc\?(?:export=\w+&)?id=([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]{15,})/);
  if (!match) return null;
  const fileId = match[1];
  return {
    id: `drive-${fileId.slice(0, 8)}-${Date.now()}`,
    url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    name: `Google-Drive-${fileId.slice(0, 6)}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 0,
    source: 'drive',
  };
}

export async function readOrCompressImagePayload(
  file: File
): Promise<{ dataBase64: string; mimeType: MosChatImageMimeType; width?: number; height?: number }> {
  if (file.type === 'image/gif') {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Không thể đọc ảnh GIF'));
      reader.readAsDataURL(file);
    });
    return {
      dataBase64: dataUrl.replace(/^data:image\/gif;base64,/i, ''),
      mimeType: 'image/gif',
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không thể giải mã hình ảnh'));
      el.src = objectUrl;
    });

    const maxDim = 1600;
    let width = img.naturalWidth || img.width || 800;
    let height = img.naturalHeight || img.height || 600;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không khởi tạo được bộ nén ảnh');
    ctx.drawImage(img, 0, 0, width, height);

    let targetMime: MosChatImageMimeType = file.type === 'image/png' ? 'image/png' : 'image/webp';
    let dataUrl = canvas.toDataURL(targetMime, 0.86);
    if (!dataUrl.startsWith(`data:${targetMime};base64,`)) {
      targetMime = 'image/jpeg';
      dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    }

    if (targetMime === 'image/png' && dataUrl.length > 3_200_000) {
      targetMime = 'image/webp';
      dataUrl = canvas.toDataURL('image/webp', 0.86);
      if (!dataUrl.startsWith('data:image/webp;base64,')) {
        targetMime = 'image/jpeg';
        dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      }
    }

    return {
      dataBase64: dataUrl.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, ''),
      mimeType: targetMime,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
