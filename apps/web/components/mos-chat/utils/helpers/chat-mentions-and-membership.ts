import type { SafeAny } from '@mos-lab/shared';
import { removeVietnameseTones } from '@mos-lab/shared';
import { cleanMarkdownForSpeech } from '../../../voice-assistant/speech-utils';

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

  // 4. Khớp chéo qua staffDirectory (Dual-account detection)
  if (Array.isArray(staffDirectory) && staffDirectory.length > 0) {
    for (const s of staffDirectory) {
      if (!s || s.id === undefined || s.id === null) continue;
      const sId = Number(s.id);

      const isRecordInGroup =
        memberIdSet.has(sId) ||
        (s.legacyStaffId && memberIdSet.has(Number(s.legacyStaffId))) ||
        Boolean(conversation.memberNicknames?.[String(sId)]);

      if (!isRecordInGroup) continue;

      if (staffLegacyIdNum && s.legacyStaffId && Number(s.legacyStaffId) === staffLegacyIdNum) {
        return true;
      }

      if (targetNorm && s.displayName) {
        const sNorm = removeVietnameseTones(s.displayName.trim().toLowerCase());
        if (sNorm && sNorm === targetNorm) {
          return true;
        }
      }

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
