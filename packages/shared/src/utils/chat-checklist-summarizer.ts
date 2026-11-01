import type {
  ExtractMosChatChecklistSuggestion,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskChecklistItem,
  MosChatTaskItem,
} from '../types/mos-chat.js';

export interface SummarizedChecklistResult {
  summary: string | null;
  suggestions: ExtractMosChatChecklistSuggestion[];
  sourceMessageId?: string | null;
}

export interface ParsedChecklistTitleBadges {
  domainBadge: string | null;
  timeframeBadge: string | null;
  cleanTitle: string;
}

const GREETING_OR_INTRO_REGEX =
  /^(?:dạ\s+bẩm\s+thầy|dạ\s+thưa|dạ\s+anh|dạ\s+em|em\s+chào|chào\s+anh|chào\s+thầy|kính\s+gửi|báo\s+cáo\s+anh|danny\s+do\s+và\s+team|mục\s+tiêu\s+tuần\s+này)/i;

const RECAP_HEADER_REGEX = /^\*{0,4}\s*(?:tóm\s+lại|tổng\s+kết|kết\s+luận|tóm\s+tắt)\s*:?\s*$/i;

const SECTION_HEADER_REGEX =
  /^(?:(?:\d+|[IVX]+)[.)]\s*|\*{1,3}\s*)?(?:về\s+|mảng\s+|bộ\s+phận\s+|phần\s+)?(CSKH|CS|HR|Nhân\s+sự|Vận\s+hành|VH|Marketing|MKT|Sale|Telesales|Kế\s+toán|Đào\s+tạo|Kỹ\s+thuật|Chuyên\s+môn)\s*:?\s*$/i;

const KNOWN_DOMAINS = new Set([
  'CS',
  'CSKH',
  'HR',
  'NHÂN SỰ',
  'VẬN HÀNH',
  'VH',
  'MKT',
  'MARKETING',
  'SALE',
  'KẾ TOÁN',
  'ĐÀO TẠO',
  'KỸ THUẬT',
]);

const ACTION_VERB_START_REGEX =
  /^(?:đảm\s+bảo|triển\s+khai|hoàn\s+tất|hoàn\s+thành|xây\s+dựng|xây\s+công\s+cụ|kiểm\s+tra|báo\s+cáo|rà\s+soát|chuẩn\s+bị|cập\s+nhật|gửi|soạn|kê\s+khai|lưu\s+trữ|tuyển\s+dụng|tuyển|đào\s+tạo|lên\s+kế\s+hoạch|thiết\s+lập|tối\s+ưu|xử\s+lý|phối\s+hợp|theo\s+dõi|chốt|duyệt|nộp|làm\s+việc)\b/i;

/**
 * Detects casual chat/commentary lines (e.g. boss feedback, meta chat about the checklist UI,
 * system logs, or casual acknowledgements) so they are never mistaken for checklist deliverables.
 */
export function isConversationalChatterLine(rawText: string): boolean {
  const stripped = (rawText || '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^[-*•+]\s*(\[[ xX]\])?\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();

  if (!stripped || stripped.length < 4) return true;

  // System checklist log messages in subthreads
  if (/^\[Checklist\]/i.test(rawText.trim()) || /^📋\s*mOS\s+Task/i.test(rawText.trim())) {
    return true;
  }

  // Meta discussion about the checklist / AI / UI feature itself
  if (
    /(?:anh\s+đang\s+thiết\s+kế|tự\s+động\s+đọc\s+nội\s+dung|tóm\s+tắt\s+và\s+tạo\s+checklist|không\s+thích\s+cái\s+nào\s+thì\s+xo[áa]|khong\s+thich\s+cai\s+nao\s+thi\s+xoa|nhanh\s+hơn\s+tự\s+phải\s+viết)/i.test(
      stripped
    )
  ) {
    return true;
  }

  // Short casual chat / acknowledgements / questions
  if (
    /^(?:ok|oke|okay|dạ\s+ok|dạ\s+vâng|vâng\s+ạ|dạ\s+rồi|cảm\s+ơn|thank|thanks|để\s+anh\s+xem|để\s+em\s+xem|anh\s+ơi|em\s+ơi|thầy\s+ơi|alo|test\b)/i.test(
      stripped
    )
  ) {
    return true;
  }

  // Exclamatory or conversational remarks ending in "!" or "?" that don't start with an action verb
  if (/[!?]$/.test(stripped) && !ACTION_VERB_START_REGEX.test(stripped)) {
    return true;
  }

  return false;
}

function normalizeSectionCode(rawSection: string): string {
  const s = rawSection.trim();
  const upper = s.toUpperCase();
  if (upper === 'CS' || upper === 'CSKH') return 'CS';
  if (upper === 'HR' || /^NHÂN\s+SỰ$/i.test(s)) return 'HR';
  if (upper === 'VH' || /^VẬN\s+HÀNH$/i.test(s)) return 'Vận hành';
  if (upper === 'MKT' || /^MARKETING$/i.test(s)) return 'MKT';
  return s;
}

function normalizeTimeframeLabel(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  // Match "Tuần X của Tháng Y" or "Tuần X Tháng Y" or "Tuần X/Y"
  const weekOfMonthMatch = text.match(/tuần\s*(\d+)\s*(?:của\s*)?(?:tháng\s*|\/|t)(\d+)/i);
  if (weekOfMonthMatch) {
    return `Tuần ${weekOfMonthMatch[1]}/T${weekOfMonthMatch[2]}`;
  }

  // Match "Trong tuần này" / "Tuần này"
  if (/(?:trong\s+)?tuần\s+này/i.test(text)) {
    return 'Tuần này';
  }

  // Match "Tuần tiếp theo" / "Tuần sau" / "Tuần tới"
  if (/tuần\s+(?:tiếp\s+theo|sau|tới)/i.test(text)) {
    return 'Tuần sau';
  }

  // Match "Các tuần còn lại"
  if (/các\s+tuần\s+còn\s+lại/i.test(text)) {
    return 'Trong tháng';
  }

  // Match "Trong Tháng X" / "Tháng X"
  const monthMatch = text.match(/(?:trong\s+)?tháng\s*(\d{1,2})/i);
  if (monthMatch) {
    return `Tháng ${monthMatch[1]}`;
  }

  // Match "Hôm nay" / "Trong ngày"
  if (/hôm\s+nay|trong\s+ngày/i.test(text)) {
    return 'Hôm nay';
  }

  // Match "Ngày mai"
  if (/ngày\s+mai/i.test(text)) {
    return 'Ngày mai';
  }

  // Match "Quý X"
  const quarterMatch = text.match(/quý\s*(\d)/i);
  if (quarterMatch) {
    return `Quý ${quarterMatch[1]}`;
  }

  // Match KPI target hint like "Đạt tối thiểu 85%"
  const kpiMatch = text.match(/^(?:đạt\s+)?(tối\s+thiểu\s+\d+%)$/i);
  if (kpiMatch) {
    const kpi = kpiMatch[1].trim();
    return kpi.charAt(0).toUpperCase() + kpi.slice(1);
  }

  return null;
}

/**
 * Infers a concrete ISO deadline string from a timeframe label (e.g. "Tuần này", "Tuần 1/T11", "Tháng 11")
 * so checklist items automatically have a real deadline set and can be sorted by urgency.
 */
export function inferChecklistDeadlineIso(
  timeframeLabel: string | null | undefined,
  fallbackPeriod?: string | null,
  referenceDateInput?: Date | string | null
): string | null {
  const ref = referenceDateInput ? new Date(referenceDateInput) : new Date();
  const baseDate = isNaN(ref.getTime()) ? new Date() : ref;
  const year = baseDate.getFullYear();
  const currentMonth0 = baseDate.getMonth(); // 0-indexed

  const candidates = [timeframeLabel, fallbackPeriod].filter(Boolean) as string[];
  for (const label of candidates) {
    const norm = label.trim();
    if (!norm) continue;

    if (/^hôm\s+nay$/i.test(norm)) {
      const d = new Date(baseDate);
      d.setHours(18, 0, 0, 0);
      return d.toISOString();
    }

    if (/^ngày\s+mai$/i.test(norm)) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
      return d.toISOString();
    }

    if (/^tuần\s+này$/i.test(norm)) {
      // End of current workweek (5 days out if on Sunday/Monday, otherwise upcoming Friday/Saturday)
      const d = new Date(baseDate);
      const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
      const daysUntilEndOfWeek = dayOfWeek === 0 ? 5 : Math.max(1, 6 - dayOfWeek);
      d.setDate(d.getDate() + daysUntilEndOfWeek);
      d.setHours(18, 0, 0, 0);
      return d.toISOString();
    }

    const weekMonthMatch = norm.match(/^tuần\s*(\d+)\/T(\d{1,2})$/i);
    if (weekMonthMatch) {
      const weekNum = Math.min(4, Math.max(1, Number(weekMonthMatch[1])));
      const monthNum0 = Math.min(11, Math.max(0, Number(weekMonthMatch[2]) - 1));
      const targetYear = monthNum0 < currentMonth0 - 1 ? year + 1 : year;
      const targetDay = weekNum * 7;
      const d = new Date(targetYear, monthNum0, targetDay, 18, 0, 0, 0);
      return d.toISOString();
    }

    if (/^tuần\s+sau$/i.test(norm)) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 7);
      d.setHours(18, 0, 0, 0);
      return d.toISOString();
    }

    const monthOnlyMatch = norm.match(/^tháng\s*(\d{1,2})$/i);
    if (monthOnlyMatch) {
      const monthNum0 = Math.min(11, Math.max(0, Number(monthOnlyMatch[1]) - 1));
      const targetYear = monthNum0 < currentMonth0 - 1 ? year + 1 : year;
      // Last day of target month at 18:00
      const d = new Date(targetYear, monthNum0 + 1, 0, 18, 0, 0, 0);
      return d.toISOString();
    }

    if (/^trong\s+tháng$/i.test(norm)) {
      const d = new Date(year, currentMonth0 + 1, 0, 18, 0, 0, 0);
      return d.toISOString();
    }
  }

  return null;
}

/**
 * Parses a formatted checklist title like "[CS · Tuần 1/T11] Xây công cụ..."
 * into structured badges (`domainBadge`, `timeframeBadge`) and `cleanTitle`.
 */
export function parseChecklistTitleBadges(rawTitle: string): ParsedChecklistTitleBadges {
  const trimmed = (rawTitle || '').trim();
  const bracketMatch = trimmed.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (!bracketMatch) {
    return {
      domainBadge: null,
      timeframeBadge: null,
      cleanTitle: trimmed,
    };
  }

  const inside = bracketMatch[1].trim();
  const cleanTitle = bracketMatch[2].trim();

  if (inside.includes('·')) {
    const [left, right] = inside.split('·').map((s) => s.trim());
    return {
      domainBadge: left || null,
      timeframeBadge: right || null,
      cleanTitle,
    };
  }

  if (KNOWN_DOMAINS.has(inside.toUpperCase())) {
    return {
      domainBadge: normalizeSectionCode(inside),
      timeframeBadge: null,
      cleanTitle,
    };
  }

  return {
    domainBadge: null,
    timeframeBadge: inside,
    cleanTitle,
  };
}

/**
 * Sorts checklist items or suggestions so undone items with the nearest deadline appear first.
 */
export function sortChecklistItemsByDeadline<T extends { title: string; done?: boolean; deadline?: string | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aDone = Boolean(a.done);
    const bDone = Boolean(b.done);
    if (aDone !== bDone) return aDone ? 1 : -1;

    const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
    const aValid = Number.isFinite(aTime) ? aTime : Number.POSITIVE_INFINITY;
    const bValid = Number.isFinite(bTime) ? bTime : Number.POSITIVE_INFINITY;

    if (aValid !== bValid) return aValid - bValid;
    return 0;
  });
}

function extractTimeframeFromClause(clause: string): {
  cleanedClause: string;
  timeframe: string | null;
} {
  let working = clause.trim();
  let detectedTimeframe: string | null = null;

  // 1. Remove polite helper parentheticals like "(Nhờ Danny hỗ trợ em xây công cụ ạ)"
  working = working
    .replace(/\(\s*nhờ\s+[^)]+?\)/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 2. Check all parenthetical groups for timeframe expressions
  const parenRegex = /\(([^()]+)\)/g;
  const matches = Array.from(working.matchAll(parenRegex));
  for (let i = matches.length - 1; i >= 0; i--) {
    const inner = matches[i][1].trim();
    const isPureTimeframe =
      /^(?:trong\s+)?(?:tuần|tháng|hôm\s+nay|ngày|quý)\b/i.test(inner) ||
      /(?:phải\s+xong|hoàn\s+tất|deadline|hạn\s+chót)$/i.test(inner);
    if (isPureTimeframe) {
      const normalized = normalizeTimeframeLabel(inner);
      if (normalized) {
        detectedTimeframe = normalized;
        working = (working.slice(0, matches[i].index!) + working.slice(matches[i].index! + matches[i][0].length))
          .replace(/\s{2,}/g, ' ')
          .trim();
        break;
      }
    }
  }

  // 3. Check leading timeframe prefix like "Tuần này: ..." or "Tuần tiếp theo: ..."
  if (!detectedTimeframe) {
    const prefixMatch = working.match(
      /^(tuần\s+này|tuần\s+tiếp\s+theo|tuần\s+sau|các\s+tuần\s+còn\s+lại|tháng\s*\d{1,2}|hôm\s+nay|ngày\s+mai)\s*:\s*(.+)$/i
    );
    if (prefixMatch) {
      detectedTimeframe = normalizeTimeframeLabel(prefixMatch[1]);
      working = prefixMatch[2].trim();
    }
  }

  return {
    cleanedClause: working,
    timeframe: detectedTimeframe,
  };
}

function polishActionText(raw: string): string {
  let text = raw
    .replace(/^[-*•+]\s*(\[[ xX]\])?\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Concise Vietnamese phrasing polish
  text = text
    .replace(/^Triển khai được\s+/i, 'Triển khai ')
    .replace(
      /^Đảm bảo chất lượng:\s*Có công cụ lưu trữ feedback và đưa được feedback xuống shop/i,
      'Xây công cụ lưu trữ feedback & đưa xuống shop'
    )
    .replace(/^Tiếp tục duy trì các đầu mục trên,?\s*(?:và\s*)?/i, '')
    .replace(/[.;,\s]+$/, '')
    .trim();

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\[[^\]]+\]\s*/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDuplicateSuggestion(existing: ExtractMosChatChecklistSuggestion[], candidateTitle: string): boolean {
  const normCand = normalizeForDedup(candidateTitle);
  if (!normCand || normCand.length < 3) return true;

  for (const item of existing) {
    const normExist = normalizeForDedup(item.title);
    if (normExist === normCand) return true;
    const candTokens = normCand.split(' ').filter((w) => w.length >= 2 || /^\d+$/.test(w));
    const existTokens = new Set(normExist.split(' ').filter((w) => w.length >= 2 || /^\d+$/.test(w)));
    if (candTokens.length >= 4 && existTokens.size >= 4) {
      const shared = candTokens.filter((t) => existTokens.has(t)).length;
      const ratio = shared / Math.max(candTokens.length, existTokens.size);
      if (ratio >= 0.85) return true;
    }
  }
  return false;
}

/**
 * Splits a single bullet line that contains multiple distinct deliverables joined by " - "
 * e.g. "Triển khai được 1 CV Lông ĐT (Trong tuần này) - Triển khai 1 CV Lông EP (Tuần 1 Tháng 11)"
 */
function splitCompoundBulletLine(line: string): string[] {
  const parts = line
    .split(/(?<=\))\s+[-–—]\s+(?=[A-ZÀ-Ỹa-zà-ỹ0-9])/u)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    return parts;
  }
  return [line];
}

/**
 * Pure deterministic Smart Summarizer & Checklist Extractor for mOS Chat messages and threads.
 */
export function summarizeAndExtractChecklistFromText(params: {
  rootText?: string | null;
  rootSenderName?: string | null;
  rootSenderId?: number | string | null;
  referenceDate?: Date | string | null;
  replies?: Array<{
    id: string;
    text: string;
    senderName?: string | null;
    senderId?: number | string | null;
    isDeleted?: boolean;
    isAiBot?: boolean;
  }>;
}): SummarizedChecklistResult {
  const rootText = (params.rootText || '').trim();
  const replies = (params.replies || []).filter((r) => !r.isDeleted && !r.isAiBot && r.text?.trim());

  const suggestions: ExtractMosChatChecklistSuggestion[] = [];
  const sectionCounts: Record<string, number> = {};
  const timeframeHighlights: Record<string, string[]> = {};

  // Detect global default timeframe from intro lines (e.g. "mục tiêu tuần này và Tháng 11 của em như sau:")
  let defaultPeriod: string | null = null;
  const firstLines = rootText.split('\n').slice(0, 4).join(' ');
  const globalMonthMatch = firstLines.match(/tháng\s*(\d{1,2})(?:\/\d{4})?/i);
  if (globalMonthMatch) {
    defaultPeriod = `Tháng ${globalMonthMatch[1]}`;
  } else if (/tuần\s+này/i.test(firstLines)) {
    defaultPeriod = 'Tuần này';
  }

  const processTextBlock = (
    textBlock: string,
    authorName?: string | null,
    authorId?: number | string | null,
    sourceReplyId?: string | null,
    isThreadReply = false
  ) => {
    const rawLines = textBlock
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let currentSection: string | null = null;
    let inRecapSection = false;
    const countBeforeBlock = suggestions.length;

    for (const rawLine of rawLines) {
      const hasExplicitBullet = /^(?:[-*•+]|\d+[.)])\s+/.test(rawLine);
      const stripped = rawLine
        .replace(/^[-*•+]\s*(\[[ xX]\])?\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .trim();

      if (!stripped || stripped.length < 3) continue;

      // 1. Check if this line is the "***Tóm lại:" header
      if (RECAP_HEADER_REGEX.test(rawLine) || RECAP_HEADER_REGEX.test(stripped)) {
        inRecapSection = true;
        continue;
      }

      // 2. Check if this line is a section header like "1. Về CS" or "2. Về HR"
      const secMatch = rawLine.match(SECTION_HEADER_REGEX) || stripped.match(SECTION_HEADER_REGEX);
      if (secMatch) {
        currentSection = normalizeSectionCode(secMatch[1]);
        inRecapSection = false;
        continue;
      }

      // 3. Skip greetings, intros, and casual conversational chatter
      if (
        GREETING_OR_INTRO_REGEX.test(stripped) ||
        (/như\s+sau\s*:$/i.test(stripped) && stripped.length < 100) ||
        (/^(?:dạ|thưa|bẩm|chào|kính\s+gửi)\b/i.test(stripped) && stripped.length < 40) ||
        /^giao\s+việc\s+cho\b/i.test(stripped) ||
        /^tự\s+tạo\s+việc\b/i.test(stripped) ||
        isConversationalChatterLine(rawLine)
      ) {
        continue;
      }

      // 3b. For thread replies when root message already has structured items,
      // only extract lines that have explicit bullets or start with a clear action verb!
      if (isThreadReply && countBeforeBlock >= 2 && !hasExplicitBullet && !ACTION_VERB_START_REGEX.test(stripped)) {
        continue;
      }

      // 4. If we are in the "***Tóm lại:" recap section and we ALREADY extracted detailed items above,
      // record timeframe highlights for the Executive Summary if helpful, but do NOT duplicate into checklist!
      if (inRecapSection && suggestions.length > countBeforeBlock) {
        const prefixMatch = stripped.match(/^(tuần\s+này|tuần\s+tiếp\s+theo|tuần\s+sau)\s*:\s*(.+)$/i);
        if (prefixMatch) {
          const tfLabel = prefixMatch[1].trim();
          const normalizedKey = /^tuần\s+này$/i.test(tfLabel) ? 'Tuần này' : 'Tuần tiếp theo';
          timeframeHighlights[normalizedKey] = [prefixMatch[2].trim()];
        }
        continue;
      }

      // 5. Split compound bullet lines (e.g. "... (Trong tuần này) - ... (Tuần 1 Tháng 11)")
      const subClauses = splitCompoundBulletLine(stripped);

      for (const clause of subClauses) {
        const { cleanedClause, timeframe } = extractTimeframeFromClause(clause);
        const effectiveTimeframe = timeframe || defaultPeriod;
        const polished = polishActionText(cleanedClause);
        if (!polished || polished.length < 4 || isConversationalChatterLine(polished)) continue;

        // Build tag prefix: [CS · Tháng 11] or [HR · Tuần này]
        let tagPrefix = '';
        if (currentSection && effectiveTimeframe) {
          tagPrefix = `[${currentSection} · ${effectiveTimeframe}] `;
        } else if (currentSection) {
          tagPrefix = `[${currentSection}] `;
        } else if (effectiveTimeframe) {
          tagPrefix = `[${effectiveTimeframe}] `;
        }

        const finalTitle = `${tagPrefix}${polished}`.slice(0, 220);
        const inferredDeadline = inferChecklistDeadlineIso(timeframe, defaultPeriod, params.referenceDate);

        if (!isDuplicateSuggestion(suggestions, finalTitle)) {
          suggestions.push({
            title: finalTitle,
            deadline: inferredDeadline,
            assigneeName: authorName || null,
            assigneeId: authorId ?? null,
            sourceReplyId: sourceReplyId ?? null,
          });

          const secKey = currentSection || 'Chung';
          sectionCounts[secKey] = (sectionCounts[secKey] || 0) + 1;

          const tfKey = effectiveTimeframe || 'Trong kỳ';
          if (!timeframeHighlights[tfKey]) {
            timeframeHighlights[tfKey] = [];
          }
          timeframeHighlights[tfKey].push(polished);
        }
      }
    }
  };

  // First process root message
  if (rootText) {
    processTextBlock(rootText, params.rootSenderName, params.rootSenderId, null, false);
  }

  // Then process thread replies for any additional structured action items
  for (const rep of replies) {
    processTextBlock(rep.text, rep.senderName, rep.senderId, rep.id, true);
  }

  if (suggestions.length === 0) {
    return {
      summary: null,
      suggestions: [],
    };
  }

  // Build concise Executive Summary
  const sectionParts = Object.entries(sectionCounts).map(([sec, count]) => `${count} ${sec}`);
  const headerStat =
    sectionParts.length > 0 && !(sectionParts.length === 1 && sectionParts[0].endsWith('Chung'))
      ? `${suggestions.length} đầu việc (${sectionParts.join(', ')})`
      : `${suggestions.length} đầu việc trọng tâm`;

  const priorityTimelineParts: string[] = [];
  if (timeframeHighlights['Tuần này']?.length) {
    priorityTimelineParts.push(`Tuần này: ${timeframeHighlights['Tuần này'].slice(0, 2).join(', ')}`);
  }
  if (timeframeHighlights['Tuần tiếp theo']?.length) {
    priorityTimelineParts.push(`Tuần tiếp theo: ${timeframeHighlights['Tuần tiếp theo'].slice(0, 2).join(', ')}`);
  } else if (timeframeHighlights['Tuần 1/T11']?.length) {
    priorityTimelineParts.push(`Tuần 1/T11: ${timeframeHighlights['Tuần 1/T11'].slice(0, 2).join(', ')}`);
  }

  const summary =
    priorityTimelineParts.length > 0
      ? `${headerStat} · ${priorityTimelineParts.join(' · ')}`
      : `${headerStat} đã được tóm tắt và chuẩn hóa tự động.`;

  return {
    summary,
    suggestions,
  };
}

/**
 * Cleans up an existing checklist array by removing conversational chatter items,
 * filling in missing deadlines/assignees, and sorting by deadline proximity.
 */
export function normalizeAndEnrichTaskChecklist(
  items: MosChatTaskChecklistItem[],
  options?: {
    defaultAssigneeId?: number | string | null;
    defaultAssigneeName?: string | null;
    defaultAssigneeAvatar?: string | null;
    referenceDate?: Date | string | null;
  }
): MosChatTaskChecklistItem[] {
  const cleaned = items.filter((item) => !isConversationalChatterLine(item.title));
  const enriched = cleaned.map((item) => {
    const parsed = parseChecklistTitleBadges(item.title);
    const inferredDeadline =
      item.deadline || inferChecklistDeadlineIso(parsed.timeframeBadge, null, options?.referenceDate);
    return {
      ...item,
      deadline: inferredDeadline || null,
      assigneeId: item.assigneeId ?? options?.defaultAssigneeId ?? null,
      assigneeName: item.assigneeName || options?.defaultAssigneeName || null,
      assigneeAvatar: item.assigneeAvatar || options?.defaultAssigneeAvatar || null,
    };
  });
  return sortChecklistItemsByDeadline(enriched);
}

/**
 * Resolves the best work-report message in a conversation for a given Task or Message ID.
 */
export function resolveBestSourceMessageForTaskChecklist(
  conv: MosChatConversation | null | undefined,
  options: {
    task?: MosChatTaskItem | null;
    messageId?: string | null;
  }
): MosChatMessage | null {
  if (!conv || !Array.isArray(conv.messages) || conv.messages.length === 0) {
    return null;
  }

  const targetMsgId = options.messageId || options.task?.sourceMessageId;
  const directMsg = targetMsgId ? conv.messages.find((m) => m.id === targetMsgId) : null;

  const isSubstantiveWorkMessage = (m: MosChatMessage | null | undefined): boolean => {
    if (!m || m.isDeleted || m.isAiBot) return false;
    const txt = (m.text || '').trim();
    if (!txt || isConversationalChatterLine(txt)) return false;
    if (/^(?:giao\s+việc\s+cho|tự\s+tạo\s+việc)/i.test(txt) && txt.length < 80) {
      return Boolean(
        m.thread &&
        m.thread.some(
          (r) => !r.isDeleted && !r.isAiBot && (r.text || '').trim().length > 15 && !isConversationalChatterLine(r.text)
        )
      );
    }
    const lineCount = txt.split('\n').filter((l) => l.trim().length > 0).length;
    const hasBullets = /(?:^|\n)\s*(?:[-*•+]|\d+[.)])\s+/m.test(txt);
    return lineCount >= 2 || hasBullets || txt.length >= 60;
  };

  if (directMsg && isSubstantiveWorkMessage(directMsg)) {
    return directMsg;
  }

  const assigneeNameNorm = (options.task?.assigneeName || '').trim().toLowerCase();
  const candidates = conv.messages.filter((m) => isSubstantiveWorkMessage(m));

  if (assigneeNameNorm) {
    const byAssignee = [...candidates]
      .reverse()
      .find(
        (m) =>
          (m.senderName || '').trim().toLowerCase() === assigneeNameNorm &&
          (/(?:^|\n)\s*(?:[-*•+]|\d+[.)])\s+/m.test(m.text || '') || (m.text || '').split('\n').length >= 3)
      );
    if (byAssignee) return byAssignee;
  }

  const latestBulleted = [...candidates]
    .reverse()
    .find((m) => /(?:^|\n)\s*(?:[-*•+]|\d+[.)])\s+/m.test(m.text || '') || (m.text || '').split('\n').length >= 3);
  if (latestBulleted) return latestBulleted;

  return directMsg || candidates[candidates.length - 1] || null;
}
