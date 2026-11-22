import {
  columnIndexToLetter,
  type MosChatGoogleDocHeading,
  type MosChatGoogleDocSection,
  type MosChatGoogleSheetTabSummary,
  type ParsedGoogleWorkspaceLink,
} from '@mos-lab/shared';

export function decodeBasicHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

export function stripTags(html: string): string {
  return decodeBasicHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseCsvRows(csvText: string, maxRows = 300, maxCols = 52): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      if (row.length < maxCols) row.push(cell);
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      if (row.length < maxCols) row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      if (rows.length >= maxRows) break;
    } else if (ch === '\n' || ch === '\r') {
      if (row.length < maxCols) row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (rows.length >= maxRows) break;
    } else {
      cell += ch;
    }
  }

  if (rows.length < maxRows && (cell.length > 0 || row.length > 0)) {
    if (row.length < maxCols) row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function buildSheetSnippet(
  rows: string[][],
  parsedRange?: ParsedGoogleWorkspaceLink['parsedRange']
): {
  snippetRowStart: number;
  snippetRows: Array<{ rowNumber: number; cells: string[] }>;
  snippetColStart: number;
  snippetColHeaders: string[];
} {
  if (!rows || rows.length === 0) {
    return {
      snippetRowStart: 1,
      snippetRows: [],
      snippetColStart: 0,
      snippetColHeaders: [],
    };
  }

  const maxRowCols = rows.reduce((acc, r) => Math.max(acc, r.length), 0);
  const effectiveCols = Math.max(1, maxRowCols);

  let rowStart1Based: number;
  let colStart0Based = 0;
  const maxSnippetCols = 5;
  const maxSnippetRows = 5;

  if (parsedRange) {
    rowStart1Based = Math.max(1, Math.min(rows.length, parsedRange.startRow - 1));
    if (rowStart1Based + maxSnippetRows - 1 > rows.length) {
      rowStart1Based = Math.max(1, rows.length - maxSnippetRows + 1);
    }
    colStart0Based = Math.max(0, parsedRange.startCol - 1);
    if (colStart0Based + maxSnippetCols > Math.max(effectiveCols, parsedRange.endCol + 1)) {
      colStart0Based = Math.max(0, Math.max(effectiveCols, parsedRange.endCol + 1) - maxSnippetCols);
    }
  } else {
    const firstNonEmptyIdx = rows.findIndex((r) => r.some((c) => String(c || '').trim().length > 0));
    rowStart1Based = firstNonEmptyIdx >= 0 ? firstNonEmptyIdx + 1 : 1;
  }

  const rowEnd1Based = Math.min(rows.length, rowStart1Based + maxSnippetRows - 1);
  const colEnd0Based = Math.min(Math.max(effectiveCols - 1, colStart0Based), colStart0Based + maxSnippetCols - 1);

  const snippetColHeaders: string[] = [];
  for (let c = colStart0Based; c <= colEnd0Based; c++) {
    snippetColHeaders.push(columnIndexToLetter(c));
  }

  const snippetRows: Array<{ rowNumber: number; cells: string[] }> = [];
  for (let r = rowStart1Based; r <= rowEnd1Based; r++) {
    const rawRow = rows[r - 1] || [];
    const slice: string[] = [];
    for (let c = colStart0Based; c <= colEnd0Based; c++) {
      slice.push(String(rawRow[c] ?? ''));
    }
    snippetRows.push({ rowNumber: r, cells: slice });
  }

  return {
    snippetRowStart: rowStart1Based,
    snippetRows,
    snippetColStart: colStart0Based,
    snippetColHeaders,
  };
}

export function parseGoogleDocHtmlToStructured(html: string): {
  docTitleFromHtml?: string;
  headings: MosChatGoogleDocHeading[];
  sections: MosChatGoogleDocSection[];
  excerpt: string;
  plainText: string;
} {
  const cleanedHtml = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');

  const titleMatch = cleanedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const docTitleFromHtml = titleMatch ? stripTags(titleMatch[1]) : undefined;

  const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : cleanedHtml;

  const headings: MosChatGoogleDocHeading[] = [];
  const sections: MosChatGoogleDocSection[] = [];
  const plainChunks: string[] = [];

  // Match headings, tables, lists, and paragraphs in source order
  const blockPattern =
    /<(h[1-4])[^>]*>([\s\S]*?)<\/\1>|<table[^>]*>([\s\S]*?)<\/table>|<(ul|ol)[^>]*>([\s\S]*?)<\/\4>|<p[^>]*>([\s\S]*?)<\/p>/gi;

  let idx = 0;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(bodyHtml)) !== null) {
    if (sections.length >= 250) break;

    if (match[1]) {
      const level = Math.min(4, Math.max(1, Number(match[1].slice(1)))) as 1 | 2 | 3 | 4;
      const text = stripTags(match[2] || '');
      if (!text) continue;
      const id = `doc-h-${idx++}`;
      headings.push({ id, level, text });
      sections.push({ id, type: 'heading', level, text });
      plainChunks.push(`${'#'.repeat(level)} ${text}`);
    } else if (match[3] !== undefined) {
      const tableHtml = match[3];
      const rows: string[][] = [];
      const trMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      for (const tr of trMatches) {
        const rowCells: string[] = [];
        const cellMatches = tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
        for (const td of cellMatches) {
          rowCells.push(stripTags(td[1] || ''));
        }
        if (rowCells.some((c) => c.length > 0)) {
          rows.push(rowCells);
        }
      }
      if (rows.length > 0) {
        const id = `doc-tbl-${idx++}`;
        sections.push({ id, type: 'table', rows: rows.slice(0, 80) });
        plainChunks.push(
          rows
            .slice(0, 15)
            .map((r) => `| ${r.join(' | ')} |`)
            .join('\n')
        );
      }
    } else if (match[4]) {
      const listHtml = match[5] || '';
      const items: string[] = [];
      const liMatches = listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
      for (const li of liMatches) {
        const text = stripTags(li[1] || '');
        if (text) items.push(text);
      }
      if (items.length > 0) {
        const id = `doc-list-${idx++}`;
        sections.push({ id, type: 'list', items: items.slice(0, 60) });
        plainChunks.push(items.map((item) => `- ${item}`).join('\n'));
      }
    } else if (match[6] !== undefined) {
      const text = stripTags(match[6] || '');
      if (!text) continue;
      const id = `doc-p-${idx++}`;
      sections.push({ id, type: 'paragraph', text });
      plainChunks.push(text);
    }
  }

  if (sections.length === 0) {
    const fallbackText = stripTags(bodyHtml);
    if (fallbackText) {
      sections.push({ id: 'doc-p-0', type: 'paragraph', text: fallbackText.slice(0, 8000) });
      plainChunks.push(fallbackText.slice(0, 8000));
    }
  }

  const plainText = plainChunks.join('\n\n').slice(0, 12_000);
  const firstReadable =
    sections.find((s) => s.type === 'paragraph' && s.text)?.text ||
    sections.find((s) => s.type === 'heading' && s.text)?.text ||
    plainText;
  const excerpt = (firstReadable || '').replace(/\s+/g, ' ').trim().slice(0, 280);

  return {
    docTitleFromHtml,
    headings,
    sections,
    excerpt,
    plainText,
  };
}

export function parseTabsFromPublicSheetHtml(html: string): MosChatGoogleSheetTabSummary[] {
  const tabs: MosChatGoogleSheetTabSummary[] = [];
  const seen = new Set<string>();
  const pattern = /items\.push\(\s*\{\s*name\s*:\s*"((?:[^"\\]|\\.)*)"[^}]*?\bgid\s*:\s*"?(\d+)"?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const rawName = match[1];
    const gid = match[2];
    if (seen.has(gid)) continue;
    seen.add(gid);
    let title: string;
    try {
      title = JSON.parse(`"${rawName}"`);
    } catch {
      title = rawName;
    }
    tabs.push({
      sheetId: Number(gid),
      gid,
      title,
    });
  }
  return tabs;
}

interface CanvaTextNodeCandidate {
  y: number;
  x: number;
  fontSize: number;
  isBold: boolean;
  text: string;
}

/**
 * Extracts title, design type, author, and spatially ordered text blocks from
 * Canva's public `/view?embed` HTML (`window['bootstrap']` + meta tags).
 */
export function parseCanvaEmbedHtmlToStructured(html: string): {
  title?: string;
  authorName?: string;
  designType?: string;
  headings: MosChatGoogleDocHeading[];
  sections: MosChatGoogleDocSection[];
  excerpt: string;
  plainText: string;
} {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const rawHtmlTitle = titleMatch ? decodeBasicHtmlEntities(titleMatch[1]).trim() : '';
  const cleanHtmlTitle =
    rawHtmlTitle && !/^(?:unsupported client|canva|sign in|log in)/i.test(rawHtmlTitle) ? rawHtmlTitle : undefined;

  let designType: string | undefined;
  let authorName: string | undefined;
  const metaDescMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (metaDescMatch?.[1]) {
    const desc = decodeBasicHtmlEntities(metaDescMatch[1]).trim();
    const byMatch = desc.match(/^Check out this\s+(.+?)\s+designed by\s+(.+?)\.?$/i);
    if (byMatch) {
      designType = byMatch[1].trim() || undefined;
      authorName = byMatch[2].trim() || undefined;
    }
  }

  const candidates: CanvaTextNodeCandidate[] = [];
  let bootTitle: string | undefined;
  let bootAuthor: string | undefined;

  const bootstrapMatch = html.match(/window\[['"]bootstrap['"]\]\s*=\s*JSON\.parse\('((?:\\.|[^'])*)'\)/);
  if (bootstrapMatch?.[1]) {
    try {
      const jsonText = bootstrapMatch[1].replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[\s\S])/g, (full, esc: string) => {
        if (esc === "'") return "'";
        if (esc === '\\') return '\\';
        if (esc === 'n') return '\n';
        if (esc === 'r') return '\r';
        if (esc === 't') return '\t';
        if (esc === 'b') return '\b';
        if (esc === 'f') return '\f';
        if (esc.startsWith('x')) return String.fromCharCode(parseInt(esc.slice(1), 16));
        return full;
      });
      const boot = JSON.parse(jsonText) as Record<string, unknown>;
      const pageRoot = (boot?.page as Record<string, unknown> | undefined) || boot;

      const metaTitle = (pageRoot as { C?: { D?: { A?: { D?: unknown } }; F?: { displayName?: unknown } } })?.C?.D?.A
        ?.D;
      if (typeof metaTitle === 'string' && metaTitle.trim()) {
        bootTitle = metaTitle.trim();
      }
      const metaAuthor = (pageRoot as { C?: { F?: { displayName?: unknown } } })?.C?.F?.displayName;
      if (typeof metaAuthor === 'string' && metaAuthor.trim()) {
        bootAuthor = metaAuthor.trim();
      }

      const walk = (node: unknown, depth: number) => {
        if (!node || typeof node !== 'object' || depth > 40) return;
        if (Array.isArray(node)) {
          for (const child of node) walk(child, depth + 1);
          return;
        }
        const rec = node as Record<string, unknown>;
        const textChunks = (rec.a as { C?: { A?: unknown; C?: unknown } } | undefined)?.C?.A;
        if (rec['A?'] === 'K' && Array.isArray(textChunks)) {
          const text = textChunks
            .filter((part): part is string => typeof part === 'string')
            .join('')
            .replace(/\r\n/g, '\n')
            .trim();
          if (text) {
            const rawStyles = (rec.a as { C?: { C?: unknown } } | undefined)?.C?.C;
            const styles = Array.isArray(rawStyles) ? rawStyles : [];
            const sizeEntry = styles.find((s): s is { G?: string } =>
              Boolean(s && typeof s === 'object' && typeof (s as { G?: unknown }).G === 'string')
            );
            const fontSize = sizeEntry?.G ? Number.parseFloat(sizeEntry.G) || 0 : 0;
            const isBold = styles.some((s) =>
              Boolean(s && typeof s === 'object' && (s as { I?: unknown }).I === 'bold')
            );
            candidates.push({
              y: Number(rec.A) || 0,
              x: Number(rec.B) || 0,
              fontSize,
              isBold,
              text,
            });
          }
        }
        for (const val of Object.values(rec)) {
          walk(val, depth + 1);
        }
      };

      walk(pageRoot, 0);
    } catch {
      // Malformed/encrypted bootstrap payload — oEmbed metadata still supplies preview
    }
  }

  candidates.sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));

  const headings: MosChatGoogleDocHeading[] = [];
  const sections: MosChatGoogleDocSection[] = [];
  const seenTexts = new Set<string>();

  for (let i = 0; i < candidates.length && sections.length < 160; i++) {
    const item = candidates[i];
    const normalized = item.text.replace(/\s+/g, ' ').trim();
    if (!normalized || seenTexts.has(normalized)) continue;
    seenTexts.add(normalized);

    const isUpperHeading =
      item.isBold && normalized.length >= 3 && normalized.length <= 70 && normalized === normalized.toUpperCase();
    const isHeading = item.fontSize >= 26 || isUpperHeading;

    if (isHeading && headings.length < 24) {
      const level: 1 | 2 = item.fontSize >= 30 || isUpperHeading ? 1 : 2;
      const id = `canva-h-${headings.length}`;
      headings.push({ id, level, text: normalized });
      sections.push({ id, type: 'heading', level, text: normalized });
    } else {
      sections.push({ id: `canva-p-${sections.length}`, type: 'paragraph', text: item.text });
    }
  }

  const plainText = sections
    .map((s) => s.text || '')
    .filter(Boolean)
    .join('\n')
    .slice(0, 12_000);
  const firstMeaningful =
    sections.find((s) => s.type === 'paragraph' && s.text)?.text ||
    sections.find((s) => s.type === 'heading' && s.text)?.text ||
    plainText;
  const excerpt = (firstMeaningful || '').replace(/\s+/g, ' ').trim().slice(0, 280);

  return {
    title: bootTitle || cleanHtmlTitle,
    authorName: authorName || bootAuthor,
    designType,
    headings,
    sections,
    excerpt,
    plainText,
  };
}
