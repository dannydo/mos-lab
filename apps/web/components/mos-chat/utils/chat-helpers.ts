import dayjs from 'dayjs';
import type { MosChatImageAttachment, MosChatImageMimeType, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { removeVietnameseTones } from '@mos-lab/shared';
import { cleanMarkdownForSpeech } from '../../voice-assistant/speech-utils';

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
  } catch (_) {}
}

export function triggerBuzzVibration() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch (_) {}
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
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);

  if (isHeic) {
    // 1. Try browser canvas decoding first (Safari on macOS/iOS supports HEIC natively)
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Browser cannot decode HEIC natively'));
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
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        URL.revokeObjectURL(objectUrl);
        return {
          dataBase64: dataUrl.replace(/^data:image\/jpeg;base64,/i, ''),
          mimeType: 'image/jpeg',
          width,
          height,
        };
      }
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Browser (Chrome/Firefox/Edge) cannot decode HEIC natively.
      // Read raw HEIC bytes and send to server for automatic conversion to JPEG.
    }

    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Không thể đọc tệp HEIC'));
      reader.readAsDataURL(file);
    });

    const base64Data = rawDataUrl.replace(/^data:[^;]+;base64,/i, '');
    return {
      dataBase64: base64Data,
      mimeType: 'image/heic',
    };
  }

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

/**
 * Kiểm tra xem một đoạn tin nhắn có đang tag (mention) trực tiếp người dùng hiện tại hay không.
 * Hỗ trợ: @displayName, @username, @nickname trong Space, @All, @mọi người,
 * và tự động khớp trong Direct Message (1-1 DM).
 */
export function isUserMentionedInText(
  text: string,
  user: { id?: number | string; displayName?: string; username?: string },
  options?: {
    nicknames?: Record<string, string>;
    isDirectMessage?: boolean;
  }
): boolean {
  if (!text) return Boolean(options?.isDirectMessage);
  if (options?.isDirectMessage) return true;

  // 1. Tag toàn bộ phòng (@all, @mọi người, @moi nguoi)
  if (/(?:^|\s)@\s*(?:all|mọi\s+người|moi\s+nguoi)\b/i.test(text)) {
    return true;
  }

  const rawTextLower = text.toLowerCase();
  const textNorm = removeVietnameseTones(rawTextLower);

  // 2. Kiểm tra biệt danh (nickname) được gán riêng trong Space
  const myId = String(user?.id || '');
  if (myId && options?.nicknames?.[myId]) {
    const nick = options.nicknames[myId].trim().toLowerCase();
    const nickNorm = removeVietnameseTones(nick);
    if (nick && (rawTextLower.includes(`@${nick}`) || textNorm.includes(`@${nickNorm}`))) {
      return true;
    }
  }

  // 3. Kiểm tra username (hoặc phần trước @ nếu username là email)
  const username = String(user?.username || '').trim().toLowerCase();
  if (username) {
    const userHandle = username.split('@')[0];
    if (rawTextLower.includes(`@${username}`) || (userHandle && rawTextLower.includes(`@${userHandle}`))) {
      return true;
    }
  }

  // 4. Kiểm tra displayName đầy đủ hoặc tên gọi phổ biến
  const displayName = String(user?.displayName || '').trim().toLowerCase();
  if (displayName) {
    const dNameNorm = removeVietnameseTones(displayName);
    if (rawTextLower.includes(`@${displayName}`) || textNorm.includes(`@${dNameNorm}`)) {
      return true;
    }
    // Hỗ trợ tag từng từ riêng lẻ nếu tên gồm nhiều từ (VD: "@Danny" cho "Danny Do", "@Ti" cho "Đẫm Ti")
    const parts = displayName.split(/\s+/).filter((p) => p.length >= 2);
    for (const part of parts) {
      const partNorm = removeVietnameseTones(part);
      const regexExact = new RegExp(`(?:^|\\s)@\\s*${part.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:\\b|\\s|$)`, 'i');
      const regexNorm = new RegExp(`(?:^|\\s)@\\s*${partNorm.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:\\b|\\s|$)`, 'i');
      if (regexExact.test(rawTextLower) || regexNorm.test(textNorm)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Làm sạch nội dung tin nhắn để đọc âm thanh thông báo khẩn cấp:
 * Bỏ markup markdown, bỏ tag nhắc tên ở đầu, rút ngắn độ dài vừa đủ để nghe gọn gàng tự nhiên như iPhone.
 */
export function cleanTextForUrgentVoiceAnnouncement(text: string, taggedName?: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Bỏ tag nhắc tên cụ thể nếu có
  if (taggedName) {
    const esc = taggedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`^@\\s*${esc}\\s*[:,-]?\\s*`, 'i'), '');
  }

  // 2. Bỏ @all / @mọi người ở đầu
  cleaned = cleaned.replace(/^@\s*(?:all|mọi người|moi nguoi)\s*[:,-]?\s*/i, '');

  // 3. Bỏ tên viết hoa ở đầu (VD: @Đẫm Ti, @Danny Do)
  cleaned = cleaned.replace(/^@[\p{Lu}][\p{L}0-9_]*(?:\s+[\p{Lu}][\p{L}0-9_]*)?\s*[:,-]?\s*/u, '');

  // 4. Bỏ mọi @tag còn lại ở đầu
  cleaned = cleaned.replace(/^@\S+\s*[:,-]?\s*/, '');

  // 5. Làm sạch markdown bằng cleanMarkdownForSpeech
  cleaned = cleanMarkdownForSpeech(cleaned);

  // 6. Bỏ ký tự @ trước các từ còn lại trong câu nếu có
  cleaned = cleaned.replace(/@([a-zA-Z0-9_\u00C0-\u1EF9]+)/g, '$1').trim();

  // 7. Cắt ngắn ở ranh giới từ nếu tin nhắn quá dài (> 160 ký tự)
  if (cleaned.length > 160) {
    const truncated = cleaned.slice(0, 155);
    const lastSpace = truncated.lastIndexOf(' ');
    cleaned = (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated).trim() + '...';
  }

  return cleaned;
}

/**
 * Tạo câu thoại tự nhiên chuẩn @MAI (vi-VN-HoaiMyNeural) thông báo tin nhắn khẩn cấp kiểu iPhone.
 */
export function buildMaiUrgentVoiceAnnouncement(options: {
  senderName: string;
  conversationName?: string;
  isSpace?: boolean;
  messageText: string;
  note?: string | null;
}): string {
  const sender = options.senderName?.trim() || 'Đồng nghiệp';
  const cleanBody = cleanTextForUrgentVoiceAnnouncement(options.messageText);
  const note = options.note?.trim();

  if (note && cleanBody) {
    return `${sender} vừa gửi tin nhắn khẩn cấp: ${cleanBody}. Ghi chú: ${note}`;
  }

  if (note && !cleanBody) {
    return `${sender} vừa gửi tín hiệu Buzz khẩn cấp: ${note}`;
  }

  if (options.isSpace && options.conversationName) {
    return `${sender} vừa gửi tin nhắn khẩn cấp trong nhóm ${options.conversationName}: ${cleanBody || 'xin phản hồi ngay'}`;
  }

  return `${sender} vừa gửi tin nhắn khẩn cấp: ${cleanBody || 'xin phản hồi ngay'}`;
}
