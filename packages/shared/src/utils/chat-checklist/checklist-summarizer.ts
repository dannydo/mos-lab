import type {
  ExtractMosChatChecklistSuggestion,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskChecklistItem,
  MosChatTaskItem,
} from '../../types/mos-chat.js';
import {
  ACTION_VERB_START_REGEX,
  GREETING_OR_INTRO_REGEX,
  RECAP_HEADER_REGEX,
  SECTION_HEADER_REGEX,
  extractTimeframeFromClause,
  inferChecklistDeadlineIso,
  isConversationalChatterLine,
  isDuplicateSuggestion,
  normalizeSectionCode,
  parseChecklistTitleBadges,
  polishActionText,
  sortChecklistItemsByDeadline,
  splitCompoundBulletLine,
  type SummarizedChecklistResult,
} from './checklist-parser.js';

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
