import dayjs from 'dayjs';
import type { MosChatImageAttachment, MosChatImageMimeType, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { removeVietnameseTones } from '@mos-lab/shared';
import { cleanMarkdownForSpeech } from '../../voice-assistant/speech-utils';
import { resolveMediaUrl } from '../../../lib/api-base-url';

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

const COMMON_VIETNAMESE_SURNAMES = new Set([
  'nguyen',
  'tran',
  'le',
  'pham',
  'hoang',
  'huynh',
  'phan',
  'vu',
  'vo',
  'dang',
  'bui',
  'do',
  'ho',
  'ngo',
  'duong',
  'ly',
]);

/**
 * Trích xuất danh sách nhân viên thực sự được nhắc tên (@mention) trong đoạn văn bản.
 * Thuật toán khớp dài nhất (longest-match first) để ưu tiên tên đầy đủ (@Nguyễn Quang Khải)
 * trước khi xét tên viết tắt hay người khác có cùng họ.
 */
export function extractMentionedStaff<T extends { id?: number | string; displayName?: string; username?: string }>(
  text: string,
  staffDirectory: T[],
  options?: { nicknames?: Record<string, string> }
): T[] {
  if (!text || !Array.isArray(staffDirectory) || staffDirectory.length === 0) return [];

  // Tìm tất cả các vị trí @ trong chuỗi mà đứng đầu câu hoặc sau khoảng trắng
  const atIndices: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '@' && (i === 0 || /\s/.test(text[i - 1]))) {
      atIndices.push(i);
    }
  }

  const matchedStaffIds = new Set<string | number>();
  const result: T[] = [];

  for (let idx = 0; idx < atIndices.length; idx++) {
    const atPos = atIndices[idx];
    const nextAtPos = idx + 1 < atIndices.length ? atIndices[idx + 1] : text.length;
    const windowText = text.slice(atPos + 1, nextAtPos).trim();
    if (!windowText) continue;

    if (/^(all|mọi người|moi nguoi|mai)\b/i.test(windowText)) {
      continue;
    }

    let bestMatch: T | null = null;
    let longestMatchLen = 0;

    for (const s of staffDirectory) {
      if (!s || s.id === undefined || s.id === null) continue;
      const sId = String(s.id);
      const candidatesToTest: string[] = [];

      // 1. Biệt danh trong Không gian
      if (options?.nicknames?.[sId]) {
        candidatesToTest.push(options.nicknames[sId]);
      }

      // 2. Họ và tên đầy đủ
      if (s.displayName) {
        candidatesToTest.push(s.displayName);
      }

      // 3. Username / Email handle
      if (s.username) {
        candidatesToTest.push(s.username);
        const handle = s.username.split('@')[0];
        if (handle && handle !== s.username) {
          candidatesToTest.push(handle);
        }
      }

      // 4. Tên gọi riêng (từ cuối, hoặc hai từ cuối, hoặc first name tiếng Anh nếu không phải họ phổ biến)
      if (s.displayName) {
        const parts = s.displayName.trim().split(/\s+/).filter(Boolean);
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1];
          const lastNorm = removeVietnameseTones(lastPart.toLowerCase());
          if (!COMMON_VIETNAMESE_SURNAMES.has(lastNorm)) {
            candidatesToTest.push(lastPart);
          }
          if (parts.length >= 3) {
            candidatesToTest.push(`${parts[parts.length - 2]} ${parts[parts.length - 1]}`);
          }
          const firstPart = parts[0];
          const firstNorm = removeVietnameseTones(firstPart.toLowerCase());
          if (!COMMON_VIETNAMESE_SURNAMES.has(firstNorm) && firstPart.length >= 2) {
            candidatesToTest.push(firstPart);
          }
        }
      }

      const explicitNickname = options?.nicknames?.[sId]?.trim();

      for (const cand of candidatesToTest) {
        const cTrimmed = cand.trim();
        const isExplicitNick = Boolean(explicitNickname && cTrimmed === explicitNickname);
        if (!cTrimmed || (!isExplicitNick && cTrimmed.length < 2)) continue;

        const escaped = cTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const exactRegex = new RegExp(`^${escaped}(?:\\b|[\\s.,!?;:)\\]]|$)`, 'i');
        const normEscaped = removeVietnameseTones(escaped);
        const normRegex = new RegExp(`^${normEscaped}(?:\\b|[\\s.,!?;:)\\]]|$)`, 'i');

        if (exactRegex.test(windowText) || normRegex.test(removeVietnameseTones(windowText))) {
          if (cTrimmed.length > longestMatchLen) {
            longestMatchLen = cTrimmed.length;
            bestMatch = s;
          }
        }
      }
    }

    if (bestMatch && !matchedStaffIds.has(bestMatch.id!)) {
      matchedStaffIds.add(bestMatch.id!);
      result.push(bestMatch);
    }
  }

  return result;
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

  // 2. Kiểm tra biệt danh (nickname) được gán riêng trong Space (hỗ trợ cả biệt danh 1 ký tự như '@K')
  const myId = String(user?.id || '');
  if (myId && options?.nicknames?.[myId]) {
    const nick = options.nicknames[myId].trim().toLowerCase();
    const nickNorm = removeVietnameseTones(nick);
    if (nick) {
      const escapedNick = nick.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedNickNorm = nickNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexNickExact = new RegExp(`(?:^|[\\s([{"'])@\\s*${escapedNick}(?:$|\\b|[\\s.,!?;:)\\]}"'])`, 'i');
      const regexNickNorm = new RegExp(`(?:^|[\\s([{"'])@\\s*${escapedNickNorm}(?:$|\\b|[\\s.,!?;:)\\]}"'])`, 'i');
      if (regexNickExact.test(rawTextLower) || regexNickNorm.test(textNorm)) {
        return true;
      }
    }
  }

  // 3. Kiểm tra username (hoặc phần trước @ nếu username là email)
  const username = String(user?.username || '')
    .trim()
    .toLowerCase();
  if (username) {
    const userHandle = username.split('@')[0];
    if (rawTextLower.includes(`@${username}`) || (userHandle && rawTextLower.includes(`@${userHandle}`))) {
      return true;
    }
  }

  // 4. Kiểm tra displayName đầy đủ hoặc tên gọi phổ biến
  const displayName = String(user?.displayName || '')
    .trim()
    .toLowerCase();
  if (displayName) {
    const dNameNorm = removeVietnameseTones(displayName);
    const escapedFull = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedFullNorm = dNameNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Khớp tên đầy đủ kèm ranh giới từ/dấu câu
    const regexFullExact = new RegExp(`(?:^|\\s)@\\s*${escapedFull}(?:\\b|[\\s.,!?;:)\\]]|$)`, 'i');
    const regexFullNorm = new RegExp(`(?:^|\\s)@\\s*${escapedFullNorm}(?:\\b|[\\s.,!?;:)\\]]|$)`, 'i');
    if (regexFullExact.test(rawTextLower) || regexFullNorm.test(textNorm)) {
      return true;
    }

    // Hỗ trợ tag tên riêng (given name / first name) khi tên có nhiều từ (VD: "@Danny" cho "Danny Do", "@Ti" cho "Đẫm Ti", "@Khải" cho "Nguyễn Quang Khải")
    // TUYỆT ĐỐI KHÔNG khớp họ phổ biến ("Nguyễn", "Trần", "Lê"...) vì sẽ gây dương tính giả cho tất cả đồng nghiệp cùng họ!
    const parts = displayName.split(/\s+/).filter((p) => p.length >= 2);
    if (parts.length > 1) {
      const candidates: string[] = [];

      // 1. Tên gọi chính (từ cuối cùng: "Khải", "Ti", "Do") NẾU KHÔNG PHẢI họ tiếng Việt phổ biến
      const lastPart = parts[parts.length - 1];
      const lastNorm = removeVietnameseTones(lastPart.toLowerCase());
      if (!COMMON_VIETNAMESE_SURNAMES.has(lastNorm)) {
        candidates.push(lastPart);
      }

      // 2. Hai từ cuối nếu tên 3 từ trở lên (VD: "Quang Khải" trong "Nguyễn Quang Khải")
      if (parts.length >= 3) {
        candidates.push(`${parts[parts.length - 2]} ${parts[parts.length - 1]}`);
      }

      // 3. Tên tiếng Anh / tên gọi đầu tiên (VD: "Danny" trong "Danny Do") NẾU KHÔNG PHẢI họ tiếng Việt phổ biến
      const firstPart = parts[0];
      const firstNorm = removeVietnameseTones(firstPart.toLowerCase());
      if (!COMMON_VIETNAMESE_SURNAMES.has(firstNorm)) {
        candidates.push(firstPart);
      }

      for (const cand of candidates) {
        const candNorm = removeVietnameseTones(cand);
        const regexExact = new RegExp(
          `(?:^|\\s)@\\s*${cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\b|[\\s.,!?;:)\\]]|$)`,
          'i'
        );
        const regexNorm = new RegExp(
          `(?:^|\\s)@\\s*${candNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\b|[\\s.,!?;:)\\]]|$)`,
          'i'
        );
        if (regexExact.test(rawTextLower) || regexNorm.test(textNorm)) {
          return true;
        }
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

/**
 * Kiểm tra xem một nhân sự có thuộc về Không gian (Space) hoặc cuộc trò chuyện hay không.
 * Xử lý thông minh hiện tượng 2 tài khoản (Dual Account) phổ biến trong mos-lab:
 * Tài khoản Google Workspace (id: 6 - khai.nguyen@wingslashes.com)
 * vs Tài khoản Legacy CRM (id: 43 - user45103@wingslashes.com, legacyStaffId: 45103).
 *
 * Kiểm tra qua:
 * 1. Khớp ID trực tiếp (id hoặc legacyStaffId)
 * 2. Khớp theo Biệt danh (memberNicknames)
 * 3. Khớp chéo theo Tên hiển thị chuẩn hóa (removeVietnameseTones):
 *    Nếu bất kỳ tài khoản nào của cùng nhân sự trong danh bạ (cùng tên hiển thị)
 *    đã nằm trong danh sách thành viên của nhóm, nhân sự đó được tính là THÀNH VIÊN TRONG NHÓM.
 */
export function isStaffInConversationMembers<
  TStaff extends { id?: number | string; displayName?: string; username?: string; legacyStaffId?: number | null },
  TConv extends {
    type?: string;
    memberIds?: number[];
    members?: Array<{
      id?: number | string;
      displayName?: string;
      username?: string;
      legacyStaffId?: number | null;
      staffId?: number | string;
    }>;
    memberNicknames?: Record<string, string>;
    participantStaffId?: number;
  },
>(staff: TStaff | null | undefined, conversation: TConv | null | undefined, staffDirectory?: TStaff[]): boolean {
  if (!staff) return false;
  if (!conversation) return true;

  // Nếu không phải Không gian (ví dụ 1-1 DM), không áp dụng giới hạn thành viên nhóm
  if (conversation.type && conversation.type.toLowerCase() !== 'space') {
    return true;
  }

  const staffIdNum = Number(staff.id);
  const staffLegacyIdNum = staff.legacyStaffId ? Number(staff.legacyStaffId) : null;

  // Thu thập tất cả Member IDs của cuộc trò chuyện
  const memberIdSet = new Set<number>();
  if (Array.isArray(conversation.memberIds)) {
    for (const mid of conversation.memberIds) {
      if (mid !== undefined && mid !== null) memberIdSet.add(Number(mid));
    }
  }
  if (Array.isArray(conversation.members)) {
    for (const m of conversation.members) {
      const mid = Number(m.id ?? (m as SafeAny).staffId);
      if (mid) memberIdSet.add(mid);
      const mLegacy = (m as SafeAny).legacyStaffId ? Number((m as SafeAny).legacyStaffId) : null;
      if (mLegacy) memberIdSet.add(mLegacy);
    }
  }

  // 1. Khớp ID trực tiếp
  if (staffIdNum && memberIdSet.has(staffIdNum)) return true;
  if (staffLegacyIdNum && memberIdSet.has(staffLegacyIdNum)) return true;

  // 2. Khớp qua Nickname được gán trong Space
  if (conversation.memberNicknames) {
    if (staffIdNum && conversation.memberNicknames[String(staffIdNum)]) return true;
    if (staffLegacyIdNum && conversation.memberNicknames[String(staffLegacyIdNum)]) return true;
  }

  // Chuẩn bị tên chuẩn hóa của staff cần kiểm tra
  const targetName = staff.displayName || staff.username || '';
  const targetNorm = targetName ? removeVietnameseTones(targetName.trim().toLowerCase()) : '';

  // 3. Khớp qua danh sách members đã tải trong conversation (nếu có)
  if (targetNorm && Array.isArray(conversation.members)) {
    for (const m of conversation.members) {
      const mName = m.displayName || m.username || '';
      if (mName && removeVietnameseTones(mName.trim().toLowerCase()) === targetNorm) {
        return true;
      }
    }
  }

  // 4. Khớp chéo qua staffDirectory (Dual-account detection):
  // Tìm tất cả các record tài khoản trong danh bạ có cùng Tên hiển thị chuẩn hóa hoặc cùng legacyStaffId
  if (Array.isArray(staffDirectory) && staffDirectory.length > 0) {
    for (const s of staffDirectory) {
      if (!s || s.id === undefined || s.id === null) continue;
      const sId = Number(s.id);

      // Nếu s đã nằm trong nhóm (hoặc có nickname trong nhóm)
      const isRecordInGroup =
        memberIdSet.has(sId) ||
        (s.legacyStaffId && memberIdSet.has(Number(s.legacyStaffId))) ||
        Boolean(conversation.memberNicknames?.[String(sId)]);

      if (!isRecordInGroup) continue;

      // Kiểm tra xem record s này có đại diện cho cùng một người với `staff` không:
      // a) Cùng legacyStaffId
      if (staffLegacyIdNum && s.legacyStaffId && Number(s.legacyStaffId) === staffLegacyIdNum) {
        return true;
      }

      // b) Cùng tên hiển thị chuẩn hóa (VD: "Nguyễn Quang Khải" vs "Nguyễn Quang Khải")
      if (targetNorm && s.displayName) {
        const sNorm = removeVietnameseTones(s.displayName.trim().toLowerCase());
        if (sNorm && sNorm === targetNorm) {
          return true;
        }
      }

      // c) Cùng email hoặc username prefix (VD: "khai.nguyen")
      if (staff.username && s.username) {
        const u1 = staff.username.split('@')[0].toLowerCase();
        const u2 = s.username.split('@')[0].toLowerCase();
        if (u1 && u2 && u1 === u2) {
          return true;
        }
      }
    }
  }

  return false;
}

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
  if (cleanFallback && cleanFallback.length <= 3 && !cleanFallback.includes('/') && !cleanFallback.includes('.')) {
    return cleanFallback.toUpperCase();
  }
  const clean = String(name || '')
    .replace(/\s*\(Ghi chú cho tôi\)\s*$/i, '')
    .replace(/^Chuyên Viên\s+/i, '')
    .replace(/^(CV|KTV|Admin|Super Admin)\s+/i, '')
    .trim();
  if (!clean) return 'NV';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0] || '';
    const last = parts[parts.length - 1][0] || '';
    return `${first}${last}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
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
