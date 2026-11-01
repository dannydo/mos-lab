import type {
  ExtractMosChatChecklistSuggestion,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
} from '../types/mos-chat.js';

export interface SummarizedChecklistResult {
  summary: string | null;
  suggestions: ExtractMosChatChecklistSuggestion[];
  sourceMessageId?: string | null;
}

const GREETING_OR_INTRO_REGEX =
  /^(?:dạ\s+bẩm\s+thầy|dạ\s+thưa|dạ\s+anh|dạ\s+em|em\s+chào|chào\s+anh|chào\s+thầy|kính\s+gửi|báo\s+cáo\s+anh|danny\s+do\s+và\s+team|mục\s+tiêu\s+tuần\s+này)/i;

const RECAP_HEADER_REGEX = /^\*{0,4}\s*(?:tóm\s+lại|tổng\s+kết|kết\s+luận|tóm\s+tắt)\s*:?\s*$/i;

const SECTION_HEADER_REGEX =
  /^(?:(?:\d+|[IVX]+)[.)]\s*|\*{1,3}\s*)?(?:về\s+|mảng\s+|bộ\s+phận\s+|phần\s+)?(CSKH|CS|HR|Nhân\s+sự|Vận\s+hành|VH|Marketing|MKT|Sale|Telesales|Kế\s+toán|Đào\s+tạo|Kỹ\s+thuật|Chuyên\s+môn)\s*:?\s*$/i;

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
  const weekOfMonthMatch = text.match(/tuần\s*(\d+)\s*(?:của\s*)?(?:tháng\s*|\/)(\d+)/i);
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

  // Match "Quý X"
  const quarterMatch = text.match(/quý\s*(\d)/i);
  if (quarterMatch) {
    return `Quý ${quarterMatch[1]}`;
  }

  return null;
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
    // Only treat as a pure timeframe parenthetical if it starts with or mainly consists of time words
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
      /^(tuần\s+này|tuần\s+tiếp\s+theo|tuần\s+sau|các\s+tuần\s+còn\s+lại|tháng\s*\d{1,2}|hôm\s+nay)\s*:\s*(.+)$/i
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
  // Split when a closing parenthesis is followed by " - " and an action phrase
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
    sourceReplyId?: string | null
  ) => {
    const rawLines = textBlock
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let currentSection: string | null = null;
    let inRecapSection = false;
    const countBeforeBlock = suggestions.length;

    for (const rawLine of rawLines) {
      // Strip bullet prefix for structural checks
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

      // 3. Skip pure greeting / intro lines
      if (
        GREETING_OR_INTRO_REGEX.test(stripped) ||
        (/như\s+sau\s*:$/i.test(stripped) && stripped.length < 100) ||
        (/^(?:dạ|thưa|bẩm|chào|kính\s+gửi)\b/i.test(stripped) && stripped.length < 40) ||
        /^giao\s+việc\s+cho\b/i.test(stripped) ||
        /^tự\s+tạo\s+việc\b/i.test(stripped)
      ) {
        continue;
      }

      // 4. If we are in the "***Tóm lại:" recap section and we ALREADY extracted detailed items above,
      // do not duplicate them into the checklist! Instead, only extract if no detailed items existed.
      if (inRecapSection && suggestions.length > countBeforeBlock) {
        continue;
      }

      // 5. Split compound bullet lines (e.g. "... (Trong tuần này) - ... (Tuần 1 Tháng 11)")
      const subClauses = splitCompoundBulletLine(stripped);

      for (const clause of subClauses) {
        const { cleanedClause, timeframe } = extractTimeframeFromClause(clause);

        // If this was a recap line like "Tuần tiếp theo: A, B, C" and we had no detailed items above,
        // split by comma if needed
        const effectiveTimeframe = timeframe || defaultPeriod;
        const polished = polishActionText(cleanedClause);
        if (!polished || polished.length < 4) continue;

        // Build tag prefix: [CS · Tháng 11] or [HR · Tuần này]
        let tagPrefix = '';
        if (currentSection && effectiveTimeframe) {
          tagPrefix = `[${currentSection} · ${effectiveTimeframe}] `;
        } else if (currentSection) {
          tagPrefix = `[${currentSection}] `;
        } else if (effectiveTimeframe) {
          tagPrefix = `[${effectiveTimeframe}] `;
        }

        const finalTitle = `${tagPrefix}${polished}`.slice(0, 180);

        if (!isDuplicateSuggestion(suggestions, finalTitle)) {
          suggestions.push({
            title: finalTitle,
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

  // First process root message if it has multi-line or bullet content
  if (rootText) {
    processTextBlock(rootText, params.rootSenderName, params.rootSenderId, null);
  }

  // Then process thread replies for any additional action items
  for (const rep of replies) {
    processTextBlock(rep.text, rep.senderName, rep.senderId, rep.id);
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
  const orderedTimeKeys = Object.keys(timeframeHighlights).sort((a, b) => {
    const rank = (k: string) => {
      if (k === 'Hôm nay') return 1;
      if (k === 'Tuần này') return 2;
      if (k.startsWith('Tuần 1')) return 3;
      if (k === 'Tuần sau') return 4;
      return 5;
    };
    return rank(a) - rank(b);
  });

  for (const tfKey of orderedTimeKeys.slice(0, 3)) {
    const items = timeframeHighlights[tfKey];
    if (items && items.length > 0) {
      const shortList = items
        .slice(0, 3)
        .map((it) => {
          const shortIt = it.replace(/\([^)]*\)/g, '').trim();
          return shortIt.length > 48 ? shortIt.slice(0, 45).trim() + '...' : shortIt;
        })
        .join(', ');
      priorityTimelineParts.push(`${tfKey}: ${shortList}`);
    }
  }

  const summary =
    priorityTimelineParts.length > 0
      ? `${headerStat} · ${priorityTimelineParts.join(' | ')}`
      : `${headerStat} đã được tóm tắt và chuẩn hóa tự động.`;

  return {
    summary,
    suggestions,
  };
}

/**
 * Resolves the best work-report message in a conversation for a given Task or Message ID.
 * If the task's direct sourceMessageId is missing or points to a short system stub ("Giao việc cho..."),
 * it automatically finds the most relevant multi-line/bullet message in the conversation (prioritizing the task's assignee).
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
    if (!txt) return false;
    if (/^(?:giao\s+việc\s+cho|tự\s+tạo\s+việc)/i.test(txt) && txt.length < 80) {
      return Boolean(m.thread && m.thread.some((r) => !r.isDeleted && !r.isAiBot && (r.text || '').trim().length > 15));
    }
    const lineCount = txt.split('\n').filter((l) => l.trim().length > 0).length;
    const hasBullets = /(?:^|\n)\s*(?:[-*•+]|\d+[.)])\s+/m.test(txt);
    return lineCount >= 2 || hasBullets || txt.length >= 60 || Boolean(m.thread && m.thread.length > 0);
  };

  if (directMsg && isSubstantiveWorkMessage(directMsg)) {
    return directMsg;
  }

  // Otherwise, scan conversation messages (newest first, or near directMsg/task creation) for a substantive work report
  const assigneeNameNorm = (options.task?.assigneeName || '').trim().toLowerCase();
  const candidates = conv.messages.filter((m) => isSubstantiveWorkMessage(m));

  // 1. Prefer a multi-line bulleted message sent by the task's assignee (e.g., Bảo Hân)
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

  // 2. Prefer any recent message in this conversation that has bullet points or numbered lists
  const latestBulleted = [...candidates]
    .reverse()
    .find((m) => /(?:^|\n)\s*(?:[-*•+]|\d+[.)])\s+/m.test(m.text || '') || (m.text || '').split('\n').length >= 3);
  if (latestBulleted) return latestBulleted;

  return directMsg || candidates[candidates.length - 1] || null;
}
