export interface RichTextTableTheme {
  wrapper: string;
  thead: string;
  th: string;
  divider: string;
  trEven: string;
  td: string;
}

/**
 * Giải mã các thực thể HTML thông dụng an toàn
 */
export const decodeHtmlEntities = (str: string): string => {
  if (!str || typeof str !== 'string' || !str.includes('&')) return str;
  return str
    .replace(/&nbsp;/gi, '\u00A0')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    });
};

/**
 * Kiểm tra xem một dòng có phải là dòng phân cách bảng Markdown (|---|---| hoặc |:---|:---:|---:|) không
 */
export const isTableSeparatorLine = (lineStr?: string): boolean => {
  if (!lineStr) return false;
  const s = lineStr.trim();
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(s);
};

/**
 * Phân tích các ô trong một dòng bảng Markdown
 */
export const parseTableRowCells = (rowText: string): string[] => {
  return rowText
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
};

export function buildKnownMultiWordStaffNames(
  staffDirectory: Array<{
    displayName?: unknown;
    fullName?: unknown;
    name?: unknown;
    realName?: unknown;
    nickname?: unknown;
    username?: unknown;
  }>,
  memberNicknames?: Record<string, string>
): string[] {
  const set = new Set<string>(['Danny Do', 'Bảo Hân', 'Diễm Hương', 'Bùi Sinh Nguyên', 'Tường Đoan', 'Sinh Nguyên']);
  staffDirectory.forEach((s) => {
    const candidates = [s.displayName, s.fullName, s.name, s.realName, s.nickname, s.username];
    candidates.forEach((name) => {
      if (typeof name === 'string' && name.trim()) {
        const clean = name.trim();
        set.add(clean);
        const withoutEmoji = clean.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, '').trim();
        if (withoutEmoji && withoutEmoji.length > 1) {
          set.add(withoutEmoji);
        }
      }
    });
    if (s.displayName && typeof s.displayName === 'string') {
      const parts = s.displayName.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        set.add(parts[parts.length - 1]);
        set.add(`${parts[parts.length - 2]} ${parts[parts.length - 1]}`);
      }
    }
  });
  if (memberNicknames) {
    Object.values(memberNicknames).forEach((nick) => {
      if (typeof nick === 'string' && nick.trim()) {
        const clean = nick.trim();
        set.add(clean);
        const withoutEmoji = clean.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, '').trim();
        if (withoutEmoji && withoutEmoji.length > 1) {
          set.add(withoutEmoji);
        }
      }
    });
  }
  return Array.from(set).sort((a, b) => b.length - a.length);
}

export function toCaseInsensitivePattern(str: string): string {
  return str
    .split('')
    .map((c) => {
      const up = c.toUpperCase();
      const lo = c.toLowerCase();
      if (up !== lo) {
        return `[${up}${lo}]`;
      }
      return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
}

export function buildInlineRegexSource(staffPattern: string): string {
  return (
    `(<[bB][rR]\\s*\\/?>)|` +
    `(<[sS][pP][aA][nN]\\s+[^>]*>[\\s\\S]+?<\\/[sS][pP][aA][nN]>)|` +
    `(<[aA]\\s+[^>]*[hH][rR][eE][fF]=["'][^"']+["'][^>]*>[\\s\\S]+?<\\/[aA]>)|` +
    `(\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\))|` +
    `(<(?:[bB]|[sS][tT][rR][oO][nN][gG])[^>]*>[\\s\\S]+?<\\/(?:[bB]|[sS][tT][rR][oO][nN][gG])>)|` +
    `(\\*\\*\\*(.+?)\\*\\*\\*)|` +
    `(\\*\\*(.+?)\\*\\*)|` +
    `(<(?:[iI]|[eE][mM])[^>]*>[\\s\\S]+?<\\/(?:[iI]|[eE][mM])>)|` +
    `(\\*([^\\*\\n]+)\\*)|` +
    `(<(?:[uU]|[iI][nN][sS])[^>]*>[\\s\\S]+?<\\/(?:[uU]|[iI][nN][sS])>)|` +
    `(<(?:[sS]|[dD][eE][lL]|[sS][tT][rR][iI][kK][eE])[^>]*>[\\s\\S]+?<\\/(?:[sS]|[dD][eE][lL]|[sS][tT][rR][iI][kK][eE])>)|` +
    `(~~(.+?)~~)|` +
    `(<[cC][oO][dD][eE][^>]*>[\\s\\S]+?<\\/[cC][oO][dD][eE]>)|` +
    `(\`([^\`]+)\`)|` +
    `(<[mM][aA][rR][kK][^>]*>[\\s\\S]+?<\\/[mM][aA][rR][kK]>)|` +
    `(<[sS][mM][aA][lL][lL][^>]*>[\\s\\S]+?<\\/[sS][mM][aA][lL][lL]>)|` +
    `(<[sS][uU][bB][^>]*>[\\s\\S]+?<\\/[sS][uU][bB]>)|` +
    `(<[sS][uU][pP][^>]*>[\\s\\S]+?<\\/[sS][uU][pP]>)|` +
    `(<(?:[pP]|[dD][iI][vV])[^>]*>[\\s\\S]+?<\\/(?:[pP]|[dD][iI][vV])>)|` +
    `(https?:\\/\\/[^\\s<)]+)|` +
    `(\\$\\$([^\\$]+?)\\$\\$)|` +
    `(\\$([^\\$\\s\\n](?:[^\\$\\n]*?[^\\$\\s\\n])?)\\$)|` +
    `(@\\s*(?:[aA][iI]|[cC][oO][pP][iI][lL][oO][tT]|[mM][aA][iI]|[aA][lL][lL]|[mM]ọi\\s+[nN]gười|[mM]oi\\s+[nN]guoi)(?=\\s|[.,!?:;]|$))` +
    `${staffPattern}|` +
    `(@[\\p{L}0-9_]+(?:\\s*[\\p{Extended_Pictographic}\\uFE0F\\u200D]+)?(?=\\s|[.,!?:;]|$))`
  );
}

export function getRichTextTableTheme(isDark: boolean): RichTextTableTheme {
  return isDark
    ? {
        wrapper: 'border-slate-700/80 bg-slate-950/70',
        thead: 'bg-slate-900/95 text-amber-300',
        th: 'text-amber-400 dark:text-amber-300 border-b border-slate-700/80',
        divider: 'divide-slate-800/80',
        trEven: 'odd:bg-transparent even:bg-slate-900/30 hover:bg-slate-800/40',
        td: 'text-slate-200',
      }
    : {
        wrapper: 'border-slate-300 bg-white/80',
        thead: 'bg-slate-100 text-slate-800',
        th: 'text-slate-800 border-b border-slate-300',
        divider: 'divide-slate-200',
        trEven: 'even:bg-slate-50 hover:bg-slate-100',
        td: 'text-slate-700',
      };
}

export function sanitizeRichTextContent(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<action[\s\S]*?<\/action>/gi, '')
    .replace(/<\/?action[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
