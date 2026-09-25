export type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'bold_italic'; content: string }
  | { type: 'strikethrough'; content: string }
  | { type: 'code'; content: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'soft_break' };

export interface ListItemToken {
  checked?: boolean; // undefined = standard list, true/false = task list
  tokens: InlineToken[];
  subList?: ListBlockToken;
}

export interface ListBlockToken {
  type: 'list';
  ordered: boolean;
  start?: number;
  items: ListItemToken[];
}

export type BlockToken =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; tokens: InlineToken[] }
  | { type: 'paragraph'; tokens: InlineToken[] }
  | ListBlockToken
  | {
      type: 'blockquote';
      alertType?: 'note' | 'tip' | 'important' | 'warning' | 'caution';
      tokens: InlineToken[];
    }
  | { type: 'code_block'; language: string; code: string }
  | {
      type: 'table';
      headers: InlineToken[][];
      rows: InlineToken[][][];
      alignments: ('left' | 'center' | 'right')[];
    }
  | { type: 'thematic_break' };

/**
 * Parse inline markdown tokens: bold, italic, bold_italic, strikethrough, code, links.
 */
export function parseInline(text: string): InlineToken[] {
  if (!text) return [];

  const tokens: InlineToken[] = [];
  let remaining = text;

  // Regex patterns for inline syntax
  // Order matters: bold_italic before bold/italic, code before text
  const inlineRegex =
    /(\*\*\*(.+?)\*\*\*|___(.+?)___|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*(.+?)\*|_(.+?)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining.length > 0) {
    const match = remaining.match(inlineRegex);
    if (!match || match.index === undefined) {
      tokens.push({ type: 'text', content: remaining });
      break;
    }

    // Text before match
    if (match.index > 0) {
      tokens.push({ type: 'text', content: remaining.slice(0, match.index) });
    }

    const [
      fullMatch,
      ,
      boldItalic1,
      boldItalic2,
      bold1,
      bold2,
      strikethrough,
      italic1,
      italic2,
      code,
      linkText,
      linkHref,
    ] = match;

    if (boldItalic1 || boldItalic2) {
      tokens.push({ type: 'bold_italic', content: boldItalic1 || boldItalic2 });
    } else if (bold1 || bold2) {
      tokens.push({ type: 'bold', content: bold1 || bold2 });
    } else if (strikethrough) {
      tokens.push({ type: 'strikethrough', content: strikethrough });
    } else if (italic1 || italic2) {
      tokens.push({ type: 'italic', content: italic1 || italic2 });
    } else if (code) {
      tokens.push({ type: 'code', content: code });
    } else if (linkText && linkHref) {
      tokens.push({ type: 'link', text: linkText, href: linkHref });
    } else {
      tokens.push({ type: 'text', content: fullMatch });
    }

    remaining = remaining.slice(match.index + fullMatch.length);
  }

  return tokens;
}

/**
 * Parse raw markdown text into structured BlockToken array.
 */
export function parseMarkdown(markdown: string): BlockToken[] {
  if (!markdown || !markdown.trim()) return [];

  const rawLines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: BlockToken[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Skip completely empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced Code Block
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      const fenceChar = trimmed[0];
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length) {
        if (rawLines[i].trim().startsWith(fenceChar.repeat(3))) {
          i++;
          break;
        }
        codeLines.push(rawLines[i]);
        i++;
      }
      blocks.push({
        type: 'code_block',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // 3. Thematic break (hr): ---, ***, ___
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'thematic_break' });
      i++;
      continue;
    }

    // 4. Headings: # H1 ... ###### H6
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const content = headingMatch[2].trim();
      blocks.push({
        type: 'heading',
        level,
        tokens: parseInline(content),
      });
      i++;
      continue;
    }

    // 5. Blockquote / Alert: > text
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].replace(/^>\s?/, ''));
        i++;
      }
      const quoteText = quoteLines.join('\n');
      let alertType: 'note' | 'tip' | 'important' | 'warning' | 'caution' | undefined;
      let cleanedText = quoteText;

      const alertMatch = quoteText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n?/i);
      if (alertMatch) {
        alertType = alertMatch[1].toLowerCase() as any;
        cleanedText = quoteText.slice(alertMatch[0].length).trim();
      }

      blocks.push({
        type: 'blockquote',
        alertType,
        tokens: parseInline(cleanedText),
      });
      continue;
    }

    // 6. Tables: starts with | and next line has |-
    if (
      line.trim().startsWith('|') &&
      i + 1 < rawLines.length &&
      rawLines[i + 1].trim().startsWith('|') &&
      rawLines[i + 1].includes('-')
    ) {
      const headerCells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      const alignLine = rawLines[i + 1];
      const alignments = alignLine
        .split('|')
        .slice(1, -1)
        .map((cell) => {
          const c = cell.trim();
          if (c.startsWith(':') && c.endsWith(':')) return 'center' as const;
          if (c.endsWith(':')) return 'right' as const;
          return 'left' as const;
        });

      i += 2;
      const rowTokens: InlineToken[][][] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
        const cells = rawLines[i]
          .split('|')
          .slice(1, -1)
          .map((cell) => parseInline(cell.trim()));
        rowTokens.push(cells);
        i++;
      }

      blocks.push({
        type: 'table',
        headers: headerCells.map((h) => parseInline(h)),
        rows: rowTokens,
        alignments,
      });
      continue;
    }

    // 7. Lists (Ordered or Unordered or Task)
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

    if (bulletMatch || orderedMatch) {
      const isOrdered = Boolean(orderedMatch);
      const startNum = orderedMatch ? parseInt(orderedMatch[2], 10) : undefined;
      const items: ListItemToken[] = [];

      while (i < rawLines.length) {
        const currentLine = rawLines[i];
        if (!currentLine.trim()) {
          break;
        }

        const bMatch = currentLine.match(/^(\s*)([-*+])\s+(.+)$/);
        const oMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.+)$/);

        // If list type matches
        if ((!isOrdered && bMatch) || (isOrdered && oMatch)) {
          const itemText = (bMatch ? bMatch[3] : oMatch![3]).trim();

          // Check for task list: [ ] or [x]
          let checked: boolean | undefined;
          let content = itemText;
          const taskMatch = itemText.match(/^\[([ xX])\]\s+(.+)$/);
          if (taskMatch) {
            checked = taskMatch[1].toLowerCase() === 'x';
            content = taskMatch[2];
          }

          items.push({
            checked,
            tokens: parseInline(content),
          });
          i++;
        } else {
          // Non-list line encountered
          break;
        }
      }

      blocks.push({
        type: 'list',
        ordered: isOrdered,
        start: startNum,
        items,
      });
      continue;
    }

    // 8. Paragraph
    const paragraphLines: string[] = [];
    while (i < rawLines.length) {
      const cur = rawLines[i];
      const curTrimmed = cur.trim();
      if (!curTrimmed) break;

      // Stop if next line is heading, list, hr, blockquote, codeblock
      if (
        cur.match(/^(#{1,6})\s+/) ||
        cur.match(/^(\s*)([-*+]|\d+\.)\s+/) ||
        curTrimmed.startsWith('>') ||
        curTrimmed.startsWith('```') ||
        curTrimmed.startsWith('~~~') ||
        /^(?:-{3,}|\*{3,}|_{3,})$/.test(curTrimmed)
      ) {
        break;
      }

      paragraphLines.push(cur);
      i++;
    }

    if (paragraphLines.length > 0) {
      // Build tokens with soft breaks
      const allTokens: InlineToken[] = [];
      paragraphLines.forEach((pLine, idx) => {
        if (idx > 0) allTokens.push({ type: 'soft_break' });
        allTokens.push(...parseInline(pLine));
      });

      blocks.push({
        type: 'paragraph',
        tokens: allTokens,
      });
    }
  }

  return blocks;
}
