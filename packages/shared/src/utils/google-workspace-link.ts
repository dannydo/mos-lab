export type MosChatGoogleWorkspaceKind = 'spreadsheet' | 'document' | 'canva';

/**
 * Fast pre-check before running URL regex extraction across chat messages.
 */
export function hasSupportedWorkspaceLinkInText(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return lower.includes('docs.google.com/') || lower.includes('canva.com/design/') || lower.includes('canva.link/');
}

export interface ParsedGoogleWorkspaceRange {
  sheetName?: string | null;
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
  label: string;
  anchorCell: string;
}

export interface ParsedGoogleWorkspaceLink {
  rawUrl: string;
  canonicalUrl: string;
  embedUrl: string;
  kind: MosChatGoogleWorkspaceKind;
  fileId: string;
  gid?: string | null;
  range?: string | null;
  parsedRange?: ParsedGoogleWorkspaceRange | null;
  tab?: string | null;
  heading?: string | null;
  shortChipLabel: string;
  cacheKey: string;
}

export function columnIndexToLetter(colIndex: number): string {
  if (!Number.isInteger(colIndex) || colIndex < 0) return 'A';
  let n = colIndex + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export function columnLetterToIndex(letters: string): number {
  const clean = letters.trim().toUpperCase();
  if (!/^[A-Z]{1,3}$/.test(clean)) return 0;
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    index = index * 26 + (clean.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function parseGoogleSheetRangeNotation(rawRange?: string | null): ParsedGoogleWorkspaceRange | null {
  if (!rawRange || typeof rawRange !== 'string') return null;
  let trimmed = rawRange.trim();
  if (!trimmed) return null;

  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    // keep raw string if malformed URI component
  }

  let sheetName: string | null = null;
  let a1Part = trimmed;

  const bangIndex = trimmed.lastIndexOf('!');
  if (bangIndex > 0) {
    const rawSheet = trimmed.slice(0, bangIndex).trim();
    sheetName = rawSheet.replace(/^'(.*)'$/, '$1').replace(/''/g, "'");
    a1Part = trimmed.slice(bangIndex + 1).trim();
  }

  // Standard cell or cell range: D17 or A1:F20 or $D$17:$E$20
  const cellRangeMatch = a1Part.match(/^\$?([A-Za-z]{1,3})\$?(\d{1,6})(?::\$?([A-Za-z]{1,3})\$?(\d{1,6}))?$/);
  if (cellRangeMatch) {
    const c1 = columnLetterToIndex(cellRangeMatch[1]);
    const r1 = Math.max(1, Number(cellRangeMatch[2]));
    const c2 = cellRangeMatch[3] ? columnLetterToIndex(cellRangeMatch[3]) : c1;
    const r2 = cellRangeMatch[4] ? Math.max(1, Number(cellRangeMatch[4])) : r1;
    const startCol = Math.min(c1, c2);
    const endCol = Math.max(c1, c2);
    const startRow = Math.min(r1, r2);
    const endRow = Math.max(r1, r2);
    const anchorCell = `${columnIndexToLetter(startCol)}${startRow}`;
    const label =
      startCol === endCol && startRow === endRow ? anchorCell : `${anchorCell}:${columnIndexToLetter(endCol)}${endRow}`;
    return {
      sheetName,
      startCol,
      endCol,
      startRow,
      endRow,
      label,
      anchorCell,
    };
  }

  // Whole column(s): D:D or B:E
  const colRangeMatch = a1Part.match(/^\$?([A-Za-z]{1,3}):\$?([A-Za-z]{1,3})$/);
  if (colRangeMatch) {
    const c1 = columnLetterToIndex(colRangeMatch[1]);
    const c2 = columnLetterToIndex(colRangeMatch[2]);
    const startCol = Math.min(c1, c2);
    const endCol = Math.max(c1, c2);
    const anchorCell = `${columnIndexToLetter(startCol)}1`;
    return {
      sheetName,
      startCol,
      endCol,
      startRow: 1,
      endRow: 1000,
      label: `${columnIndexToLetter(startCol)}:${columnIndexToLetter(endCol)}`,
      anchorCell,
    };
  }

  // Whole row(s): 17:17 or 5:12
  const rowRangeMatch = a1Part.match(/^\$?(\d{1,6}):\$?(\d{1,6})$/);
  if (rowRangeMatch) {
    const r1 = Math.max(1, Number(rowRangeMatch[1]));
    const r2 = Math.max(1, Number(rowRangeMatch[2]));
    const startRow = Math.min(r1, r2);
    const endRow = Math.max(r1, r2);
    return {
      sheetName,
      startCol: 0,
      endCol: 25,
      startRow,
      endRow,
      label: startRow === endRow ? `${startRow}:${startRow}` : `${startRow}:${endRow}`,
      anchorCell: `A${startRow}`,
    };
  }

  return null;
}

function trimTrailingUrlPunctuation(rawUrl: string): string {
  return rawUrl.trim().replace(/[),.;!?>\]]+$/, '');
}

function parseQueryStringMap(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const part of raw.split('&')) {
    if (!part) continue;
    const eqIdx = part.indexOf('=');
    const rawKey = eqIdx >= 0 ? part.slice(0, eqIdx) : part;
    const rawVal = eqIdx >= 0 ? part.slice(eqIdx + 1) : '';
    try {
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' ')).trim();
      const val = decodeURIComponent(rawVal.replace(/\+/g, ' ')).trim();
      if (key) map.set(key, val);
    } catch {
      if (rawKey) map.set(rawKey, rawVal);
    }
  }
  return map;
}

export function parseGoogleWorkspaceUrl(rawUrl: string): ParsedGoogleWorkspaceLink | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const cleaned = trimTrailingUrlPunctuation(rawUrl);

  const googleMatch = cleaned.match(
    /^https?:\/\/docs\.google\.com\/(spreadsheets|document)\/d\/([a-zA-Z0-9_-]{10,})(?:\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/i
  );
  if (googleMatch) {
    const resourceType = googleMatch[1].toLowerCase();
    const fileId = googleMatch[2];
    const queryRaw = googleMatch[3] || '';
    const hashRaw = googleMatch[4] || '';

    const kind: MosChatGoogleWorkspaceKind = resourceType === 'spreadsheets' ? 'spreadsheet' : 'document';
    const queryParams = parseQueryStringMap(queryRaw);
    const hashParams = parseQueryStringMap(hashRaw);

    const gid = (hashParams.get('gid') || queryParams.get('gid') || '').trim() || null;
    const rangeRaw = (hashParams.get('range') || queryParams.get('range') || '').trim() || null;
    const parsedRange = kind === 'spreadsheet' ? parseGoogleSheetRangeNotation(rangeRaw) : null;
    const tab = (queryParams.get('tab') || hashParams.get('tab') || '').trim() || null;
    const heading = (hashParams.get('heading') || queryParams.get('heading') || '').trim() || null;

    let canonicalUrl: string;
    let embedUrl: string;

    if (kind === 'spreadsheet') {
      const queryPart = gid ? `?gid=${encodeURIComponent(gid)}` : '';
      const hashParts: string[] = [];
      if (gid) hashParts.push(`gid=${encodeURIComponent(gid)}`);
      if (rangeRaw) hashParts.push(`range=${encodeURIComponent(rangeRaw)}`);
      const hashPart = hashParts.length > 0 ? `#${hashParts.join('&')}` : '';
      canonicalUrl = `https://docs.google.com/spreadsheets/d/${fileId}/edit${queryPart}${hashPart}`;

      const embedQueryParts = ['rm=minimal'];
      if (gid) embedQueryParts.push(`gid=${encodeURIComponent(gid)}`);
      embedUrl = `https://docs.google.com/spreadsheets/d/${fileId}/edit?${embedQueryParts.join('&')}${hashPart}`;
    } else {
      const queryPart = tab ? `?tab=${encodeURIComponent(tab)}` : '';
      const hashPart = heading ? `#heading=${encodeURIComponent(heading)}` : '';
      canonicalUrl = `https://docs.google.com/document/d/${fileId}/edit${queryPart}${hashPart}`;

      const embedQueryParts = ['rm=minimal'];
      if (tab) embedQueryParts.push(`tab=${encodeURIComponent(tab)}`);
      embedUrl = `https://docs.google.com/document/d/${fileId}/edit?${embedQueryParts.join('&')}${hashPart}`;
    }

    const shortChipLabel =
      kind === 'spreadsheet' ? (parsedRange ? `Google Sheet · ${parsedRange.label}` : 'Google Sheet') : 'Google Docs';

    const cacheKey = `${kind}:${fileId}:${gid || ''}:${parsedRange?.label || rangeRaw || ''}:${tab || ''}`;

    return {
      rawUrl: cleaned,
      canonicalUrl,
      embedUrl,
      kind,
      fileId,
      gid,
      range: parsedRange?.label || rangeRaw,
      parsedRange,
      tab,
      heading,
      shortChipLabel,
      cacheKey,
    };
  }

  const canvaDesignMatch = cleaned.match(
    /^https?:\/\/(?:www\.)?canva\.com\/design\/([a-zA-Z0-9_-]{6,})(?:\/(?!view(?:$|[/?#])|edit(?:$|[/?#])|watch(?:$|[/?#]))([a-zA-Z0-9_-]{6,}))?(?:\/(view|edit|watch))?(?:\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/i
  );
  if (canvaDesignMatch) {
    const designId = canvaDesignMatch[1];
    const shareToken = canvaDesignMatch[2] || null;
    const mode = (canvaDesignMatch[3] || 'view').toLowerCase();
    const basePath = `https://www.canva.com/design/${designId}${shareToken ? `/${shareToken}` : ''}`;
    const canonicalUrl = `${basePath}/${mode === 'edit' ? 'edit' : 'view'}`;
    const embedUrl = `${basePath}/view?embed`;

    return {
      rawUrl: cleaned,
      canonicalUrl,
      embedUrl,
      kind: 'canva',
      fileId: designId,
      gid: null,
      range: null,
      parsedRange: null,
      tab: null,
      heading: null,
      shortChipLabel: 'Canva',
      cacheKey: `canva:${designId}:${shareToken || ''}`,
    };
  }

  const canvaShortMatch = cleaned.match(/^https?:\/\/(?:www\.)?canva\.link\/([a-zA-Z0-9_-]{4,64})(?:[/?#].*)?$/i);
  if (canvaShortMatch) {
    const slug = canvaShortMatch[1];
    const canonicalUrl = `https://canva.link/${slug}`;
    return {
      rawUrl: cleaned,
      canonicalUrl,
      embedUrl: canonicalUrl,
      kind: 'canva',
      fileId: `canva-link-${slug}`,
      gid: null,
      range: null,
      parsedRange: null,
      tab: null,
      heading: null,
      shortChipLabel: 'Canva',
      cacheKey: `canva:short:${slug}`,
    };
  }

  return null;
}

export function extractGoogleWorkspaceLinksFromText(text?: string | null): ParsedGoogleWorkspaceLink[] {
  if (!text || typeof text !== 'string' || !hasSupportedWorkspaceLinkInText(text)) {
    return [];
  }

  const urlRegex =
    /https?:\/\/(?:docs\.google\.com\/(?:spreadsheets|document)\/d\/|(?:www\.)?canva\.com\/design\/|(?:www\.)?canva\.link\/)[^\s<>)"'\]]+/gi;
  const matches = text.match(urlRegex) || [];
  const seen = new Set<string>();
  const results: ParsedGoogleWorkspaceLink[] = [];

  for (const raw of matches) {
    const parsed = parseGoogleWorkspaceUrl(raw);
    if (!parsed) continue;
    if (seen.has(parsed.cacheKey)) continue;
    seen.add(parsed.cacheKey);
    results.push(parsed);
  }

  return results;
}
