'use client';

import React, { useMemo, useCallback, useContext } from 'react';
import { Copy, ExternalLink, AtSign, Check } from 'lucide-react';
import { message as antdMessage } from 'antd';
import { removeVietnameseTones } from '@mos-lab/shared';
import { MosChatContext } from './context/MosChatContext';
import { parsePureStickerMessage, MosChatStickerVisual } from './mos-chat-stickers';
import { MosChatMermaidBlock } from './MosChatMermaidBlock';
import { MosChatMathBlock, MosChatMathInline, isMathValid } from './MosChatMathBlock';

export interface MosChatRichTextProps {
  content?: string | null;
  isMe?: boolean;
  isDark?: boolean;
  className?: string;
  staffDirectory?: any[];
  memberNicknames?: Record<string, string>;
  currentUser?: any;
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
const isTableSeparatorLine = (lineStr?: string): boolean => {
  if (!lineStr) return false;
  const s = lineStr.trim();
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(s);
};

/**
 * Phân tích các ô trong một dòng bảng Markdown
 */
const parseTableRowCells = (rowText: string): string[] => {
  return rowText
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
};

/**
 * Component render nội dung tin nhắn phong cách Rich Text / Markdown / HTML nâng cao cho mOS Chat:
 * Hỗ trợ hoàn chỉnh:
 * 1. Headings (# H1 đến ###### H6, <h1> đến <h6>)
 * 2. Đường kẻ phân cách (---, ***, ___, <hr>)
 * 3. Sơ đồ tương tác Mermaid (```mermaid) với zoom modal & chế độ xem
 * 4. Khối code cú pháp (```lang, <pre><code>) kèm nút sao chép
 * 5. Công thức toán học KaTeX ($$block$$ và $inline$)
 * 6. Bảng biểu Markdown (| Col 1 | Col 2 |) & HTML (<table>) hỗ trợ căn lề (:---, :---:, ---:)
 *    và tự động xuống dòng mượt mà khi chứa thẻ <br>
 * 7. Trích dẫn phong cách Blockquote (> text, <blockquote>)
 * 8. Danh sách công việc / Todo checklist (- [ ] / - [x])
 * 9. Danh sách dấu đầu dòng (- , * , • , <ul><li>) và số thứ tự (1. , <ol><li>)
 * 10. Định dạng chữ: **đậm** / <b> / <strong>, *nghiêng* / <i> / <em>,
 *     ~~gạch ngang~~ / <s> / <del> / <strike>, <u>gạch chân</u> / <ins>,
 *     `code nội dòng` / <code>, <mark>highlight</mark>, <small>, <sub>, <sup>,
 *     <span style="color:...">
 * 11. Nhãn @mentions thông minh (@Danny Do, @Bảo Hân, @AI, @all)
 * 12. Tự động nhận diện Sticker động độc quyền của Wings
 * 13. Giải mã HTML entities (&nbsp;, &amp;, &lt;, &gt;, &quot;, &#39;)
 */
export const MosChatRichTextPure: React.FC<MosChatRichTextProps> = React.memo(
  ({ content, isMe = false, isDark = true, className = '', staffDirectory = [], memberNicknames, currentUser }) => {
    // Danh sách tên nhân sự nhiều từ để khớp chính xác @Tên Đầy Đủ
    const knownMultiWordStaffNames = useMemo(() => {
      const set = new Set<string>([
        'Danny Do',
        'Bảo Hân',
        'Diễm Hương',
        'Bùi Sinh Nguyên',
        'Tường Đoan',
        'Sinh Nguyên',
      ]);
      staffDirectory.forEach((s: any) => {
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
    }, [staffDirectory, memberNicknames]);

    const toCaseInsensitivePattern = useCallback((str: string): string => {
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
    }, []);

    const staffPattern = useMemo(() => {
      return knownMultiWordStaffNames.length > 0
        ? `|(@(?:${knownMultiWordStaffNames.map(toCaseInsensitivePattern).join('|')})(?:\\s*[\\p{Extended_Pictographic}\\uFE0F\\u200D]+)?(?=\\s|[.,!?:;]|$))`
        : '';
    }, [knownMultiWordStaffNames, toCaseInsensitivePattern]);

    const inlineRegexSource = useMemo(() => {
      return (
        `(<[bB][rR]\\s*\\/?>)|` +
        `(<[sS][pP][aA][nN]\\s+[^>]*>[\\s\\S]+?<\\/[sS][pP][aA][nN]>)|` +
        `(<[aA]\\s+[^>]*[hH][rR][eE][fF]=["'][^"']+["'][^>]*>[\\s\\S]+?<\\/[aA]>)|` +
        `(\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\))|` +
        `(<(?:[bB]|[sS][tT][rR][oO][nN][gG])[^>]*>[\\s\\S]+?<\\/(?:[bB]|[sS][tT][rR][oO][nN][gG])>)|` +
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
    }, [staffPattern]);

    /**
     * Phân tích inline markup sang React Nodes:
     * Hỗ trợ lồng nhau an toàn (recursive with depth guard)
     */
    const parseInlineRichText = useCallback(
      (text: string, keyPrefix = 'inline', depth = 0): React.ReactNode[] => {
        if (!text) return [];
        if (depth > 5) return [decodeHtmlEntities(text)];

        // Siêu tối ưu plain text: nếu không chứa ký tự định dạng đặc biệt, trả về ngay
        if (!/[<*~`$@\[]|https?:\/\//.test(text)) {
          return [decodeHtmlEntities(text)];
        }

        const regex = new RegExp(inlineRegexSource, 'gu');

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        let i = 0;

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            elements.push(decodeHtmlEntities(text.substring(lastIndex, match.index)));
          }

          const fullMatch = match[0];
          const key = `${keyPrefix}-${i++}`;

          // 1. Thẻ ngắt dòng <br> / <br/> / <br />
          if (/^<br\s*\/?>$/i.test(fullMatch)) {
            elements.push(<br key={key} />);
          }
          // 2. Thẻ <span style="..." class="...">
          else if (/^<span\s+[^>]*>/i.test(fullMatch) && fullMatch.endsWith('</span>')) {
            const spanMatch = fullMatch.match(/^<span\s+([^>]*?)>([\s\S]+?)<\/span>$/i);
            if (spanMatch) {
              const attrs = spanMatch[1];
              const inner = spanMatch[2];
              const colorMatch = attrs.match(/color:\s*([^"';>]+)/i);
              const safeColor = colorMatch ? colorMatch[1].trim() : undefined;
              elements.push(
                <span key={key} style={safeColor ? { color: safeColor } : undefined} className="font-medium">
                  {parseInlineRichText(inner, `${key}-sp`, depth + 1)}
                </span>
              );
            } else {
              elements.push(fullMatch);
            }
          }
          // 3. Thẻ liên kết HTML <a href="...">...</a>
          else if (/^<a\s+[^>]*href=/i.test(fullMatch) && fullMatch.endsWith('</a>')) {
            const aMatch = fullMatch.match(/^<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]+?)<\/a>$/i);
            if (aMatch) {
              const linkHref = aMatch[1].trim();
              const linkLabel = aMatch[2];
              elements.push(
                <a
                  key={key}
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-0.5 break-all font-medium ${
                    isDark
                      ? 'text-sky-400 hover:text-sky-300 underline underline-offset-2'
                      : 'text-sky-600 hover:text-sky-700 underline underline-offset-2'
                  }`}
                >
                  <span>{parseInlineRichText(linkLabel, `${key}-a`, depth + 1)}</span>
                  <ExternalLink size={10} className="inline shrink-0 opacity-70" />
                </a>
              );
            } else {
              elements.push(fullMatch);
            }
          }
          // 4. Markdown Link [label](url)
          else if (fullMatch.startsWith('[') && fullMatch.includes('](') && fullMatch.endsWith(')')) {
            const mdLinkMatch = fullMatch.match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/i);
            if (mdLinkMatch) {
              const linkLabel = mdLinkMatch[1];
              const linkHref = mdLinkMatch[2];
              elements.push(
                <a
                  key={key}
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-0.5 break-all font-medium ${
                    isDark
                      ? 'text-sky-400 hover:text-sky-300 underline underline-offset-2'
                      : 'text-sky-600 hover:text-sky-700 underline underline-offset-2'
                  }`}
                >
                  <span>{decodeHtmlEntities(linkLabel)}</span>
                  <ExternalLink size={10} className="inline shrink-0 opacity-70" />
                </a>
              );
            } else {
              elements.push(fullMatch);
            }
          }
          // 5. In đậm HTML <b>...</b> hoặc <strong>...</strong>
          else if (/^<(?:b|strong)[^>]*>[\s\S]+?<\/(?:b|strong)>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<(?:b|strong)[^>]*>/i, '').replace(/<\/(?:b|strong)>$/i, '');
            elements.push(
              <strong
                key={key}
                className={isDark ? 'font-bold text-amber-300 drop-shadow-xs' : 'font-bold text-amber-800'}
              >
                {parseInlineRichText(inner, `${key}-b`, depth + 1)}
              </strong>
            );
          }
          // 6. In đậm Markdown **...**
          else if (fullMatch.startsWith('**') && fullMatch.endsWith('**') && fullMatch.length >= 4) {
            const inner = fullMatch.slice(2, -2);
            elements.push(
              <strong
                key={key}
                className={isDark ? 'font-bold text-amber-300 drop-shadow-xs' : 'font-bold text-amber-800'}
              >
                {parseInlineRichText(inner, `${key}-b`, depth + 1)}
              </strong>
            );
          }
          // 7. In nghiêng HTML <i>...</i> hoặc <em>...</em>
          else if (/^<(?:i|em)[^>]*>[\s\S]+?<\/(?:i|em)>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<(?:i|em)[^>]*>/i, '').replace(/<\/(?:i|em)>$/i, '');
            elements.push(
              <em key={key} className="italic opacity-90">
                {parseInlineRichText(inner, `${key}-i`, depth + 1)}
              </em>
            );
          }
          // 8. In nghiêng Markdown *...*
          else if (fullMatch.startsWith('*') && fullMatch.endsWith('*') && fullMatch.length >= 2) {
            const inner = fullMatch.slice(1, -1);
            elements.push(
              <em key={key} className="italic opacity-90">
                {parseInlineRichText(inner, `${key}-i`, depth + 1)}
              </em>
            );
          }
          // 9. Gạch chân HTML <u>...</u> hoặc <ins>...</ins>
          else if (/^<(?:u|ins)[^>]*>[\s\S]+?<\/(?:u|ins)>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<(?:u|ins)[^>]*>/i, '').replace(/<\/(?:u|ins)>$/i, '');
            elements.push(
              <u key={key} className="underline underline-offset-2">
                {parseInlineRichText(inner, `${key}-u`, depth + 1)}
              </u>
            );
          }
          // 10. Gạch ngang HTML <s>, <del>, <strike>
          else if (/^<(?:s|del|strike)[^>]*>[\s\S]+?<\/(?:s|del|strike)>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<(?:s|del|strike)[^>]*>/i, '').replace(/<\/(?:s|del|strike)>$/i, '');
            elements.push(
              <del key={key} className="line-through opacity-70">
                {parseInlineRichText(inner, `${key}-d`, depth + 1)}
              </del>
            );
          }
          // 11. Gạch ngang Markdown ~~...~~
          else if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~') && fullMatch.length >= 4) {
            const inner = fullMatch.slice(2, -2);
            elements.push(
              <del key={key} className="line-through opacity-70">
                {parseInlineRichText(inner, `${key}-d`, depth + 1)}
              </del>
            );
          }
          // 12. Code nội dòng HTML <code>...</code>
          else if (/^<code[^>]*>[\s\S]+?<\/code>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<code[^>]*>/i, '').replace(/<\/code>$/i, '');
            elements.push(
              <code
                key={key}
                className={`px-1.5 py-0.5 rounded text-[11.5px] font-mono select-text ${
                  isDark
                    ? 'bg-black/40 text-amber-300 border border-slate-700/60 font-medium'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/80 font-medium'
                }`}
              >
                {decodeHtmlEntities(inner)}
              </code>
            );
          }
          // 13. Code nội dòng Markdown `...`
          else if (fullMatch.startsWith('`') && fullMatch.endsWith('`') && fullMatch.length >= 2) {
            const inner = fullMatch.slice(1, -1);
            elements.push(
              <code
                key={key}
                className={`px-1.5 py-0.5 rounded text-[11.5px] font-mono select-text ${
                  isDark
                    ? 'bg-black/40 text-amber-300 border border-slate-700/60 font-medium'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/80 font-medium'
                }`}
              >
                {decodeHtmlEntities(inner)}
              </code>
            );
          }
          // 14. Thẻ đánh dấu nổi bật <mark>...</mark>
          else if (/^<mark[^>]*>[\s\S]+?<\/mark>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<mark[^>]*>/i, '').replace(/<\/mark>$/i, '');
            elements.push(
              <mark
                key={key}
                className={`px-1 py-0.2 rounded text-[11.5px] font-semibold ${
                  isDark
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {parseInlineRichText(inner, `${key}-m`, depth + 1)}
              </mark>
            );
          }
          // 15. Chữ nhỏ <small>...</small>
          else if (/^<small[^>]*>[\s\S]+?<\/small>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<small[^>]*>/i, '').replace(/<\/small>$/i, '');
            elements.push(
              <small key={key} className="text-[10.5px] opacity-80">
                {parseInlineRichText(inner, `${key}-sm`, depth + 1)}
              </small>
            );
          }
          // 16. Chỉ số dưới <sub>...</sub>
          else if (/^<sub[^>]*>[\s\S]+?<\/sub>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<sub[^>]*>/i, '').replace(/<\/sub>$/i, '');
            elements.push(
              <sub key={key} className="text-[10px]">
                {parseInlineRichText(inner, `${key}-sub`, depth + 1)}
              </sub>
            );
          }
          // 17. Chỉ số trên <sup>...</sup>
          else if (/^<sup[^>]*>[\s\S]+?<\/sup>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<sup[^>]*>/i, '').replace(/<\/sup>$/i, '');
            elements.push(
              <sup key={key} className="text-[10px]">
                {parseInlineRichText(inner, `${key}-sup`, depth + 1)}
              </sup>
            );
          }
          // 18. Khối phân đoạn inline <p> / <div>
          else if (/^<(?:p|div)[^>]*>[\s\S]+?<\/(?:p|div)>$/i.test(fullMatch)) {
            const inner = fullMatch.replace(/^<(?:p|div)[^>]*>/i, '').replace(/<\/(?:p|div)>$/i, '');
            elements.push(
              <span key={key} className="block my-0.5">
                {parseInlineRichText(inner, `${key}-block`, depth + 1)}
              </span>
            );
          }
          // 19. Link URL thuần
          else if (fullMatch.startsWith('http://') || fullMatch.startsWith('https://')) {
            elements.push(
              <a
                key={key}
                href={fullMatch}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-0.5 break-all font-medium ${
                  isDark
                    ? 'text-sky-400 hover:text-sky-300 underline underline-offset-2'
                    : 'text-sky-600 hover:text-sky-700 underline underline-offset-2'
                }`}
              >
                <span>{fullMatch}</span>
                <ExternalLink size={10} className="inline shrink-0 opacity-70" />
              </a>
            );
          }
          // 20. KaTeX Block Math inline $$...$$
          else if (fullMatch.startsWith('$$') && fullMatch.endsWith('$$') && fullMatch.length > 2) {
            const math = fullMatch.slice(2, -2).trim();
            if (isMathValid(math)) {
              elements.push(<MosChatMathBlock key={key} math={math} isDark={isDark} />);
            } else {
              elements.push(fullMatch);
            }
          }
          // 21. KaTeX Inline Math $...$
          else if (fullMatch.startsWith('$') && fullMatch.endsWith('$') && fullMatch.length > 1) {
            const math = fullMatch.slice(1, -1).trim();
            if (isMathValid(math)) {
              elements.push(<MosChatMathInline key={key} math={math} />);
            } else {
              elements.push(fullMatch);
            }
          }
          // 22. Tag @mention
          else if (fullMatch.startsWith('@')) {
            const rawTag = fullMatch.replace(/^@\s*/, '').trim();
            const cleanTag = rawTag.toLowerCase();
            const isAi = cleanTag === 'ai' || cleanTag === 'mai' || cleanTag.includes('copilot');
            const isAll = cleanTag === 'all' || cleanTag === 'mọi người' || cleanTag === 'moi nguoi';
            const myId = Number(currentUser?.id) || 0;
            const myNick = memberNicknames?.[String(myId)];
            const myNickNorm = myNick ? removeVietnameseTones(myNick.toLowerCase()) : '';
            const myName = removeVietnameseTones(
              (
                currentUser?.displayName ||
                currentUser?.fullName ||
                currentUser?.name ||
                currentUser?.username ||
                ''
              ).toLowerCase()
            );
            const myUname = (currentUser?.username || '').toLowerCase();
            const tagNorm = removeVietnameseTones(cleanTag);
            const isMentioningMe = Boolean(
              (myName && (tagNorm.includes(myName) || myName.includes(tagNorm))) ||
              (myUname && cleanTag.includes(myUname)) ||
              (myNickNorm && (tagNorm.includes(myNickNorm) || myNickNorm.includes(tagNorm))) ||
              isAll
            );

            // Tinh chỉnh màu sắc sắc nét, thẩm mỹ cao cho nhãn @mention (không bị xỉn màu khi ở trong bong bóng của tôi)
            const badgeClass = isAi
              ? isDark
                ? 'bg-purple-500/25 text-purple-200 border border-purple-400/50 shadow-xs font-semibold'
                : 'bg-purple-100 text-purple-900 border border-purple-300 font-semibold'
              : isAll
                ? isDark
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/60 shadow-xs ring-1 ring-amber-400/30 font-bold'
                  : 'bg-amber-100 text-amber-900 border border-amber-400 font-bold shadow-xs'
                : isMentioningMe
                  ? isDark
                    ? 'bg-amber-500/30 text-amber-100 border border-amber-400/70 shadow-xs ring-1 ring-amber-400/40 font-bold'
                    : 'bg-amber-200/90 text-amber-950 border border-amber-500 font-bold shadow-xs'
                  : isMe
                    ? isDark
                      ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50 font-semibold shadow-xs'
                      : 'bg-sky-100 text-sky-900 border border-sky-400/60 font-semibold shadow-xs'
                    : isDark
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-sky-50 text-sky-800 border border-sky-300';

            elements.push(
              <span
                key={key}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[11px] select-text transition-all ${badgeClass}`}
              >
                <AtSign size={10} className="shrink-0 opacity-80" />
                <span>{isAi && cleanTag === 'ai' ? 'AI' : isAi && cleanTag === 'mai' ? 'MAI' : rawTag}</span>
              </span>
            );
          } else {
            elements.push(decodeHtmlEntities(fullMatch));
          }

          lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
          elements.push(decodeHtmlEntities(text.substring(lastIndex)));
        }

        return elements.length > 0 ? elements : [decodeHtmlEntities(text)];
      },
      [knownMultiWordStaffNames, isMe, isDark, currentUser, memberNicknames]
    );

    // Phân tích toàn bộ khối tin nhắn
    const renderedContent = useMemo(() => {
      if (!content) return null;

      // Loại bỏ script độc hại hoặc action tags nội bộ
      const cleanText = content
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .replace(/<object[\s\S]*?<\/object>/gi, '')
        .replace(/<action[\s\S]*?<\/action>/gi, '')
        .replace(/<\/?action[^>]*>/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (!cleanText) return null;

      // 1. Tin nhắn thuần Sticker Wings
      const pureSticker = parsePureStickerMessage(cleanText);
      if (pureSticker) {
        return (
          <div className="py-1">
            <MosChatStickerVisual sticker={pureSticker} size="chat" />
          </div>
        );
      }

      // Helper tạo style cho bảng responsive theo ngữ cảnh theme
      const tableTheme = isDark
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

      const lines = cleanText.split('\n');
      const result: React.ReactNode[] = [];
      let inCodeBlock = false;
      let codeBlockLang = '';
      let codeBlockLines: string[] = [];
      let inMathBlock = false;
      let mathBlockLines: string[] = [];

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];

        // Khối mã Code block fences (```)
        if (line.trim().startsWith('```')) {
          if (inCodeBlock) {
            const codeContent = codeBlockLines.join('\n');
            const lang = (codeBlockLang || '').trim().toLowerCase();
            const isMermaid =
              lang === 'mermaid' ||
              lang.startsWith('mermaid') ||
              /^\s*(?:flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|pie)\b/i.test(
                codeContent.trim()
              );

            if (isMermaid) {
              result.push(
                <div key={`mermaid-${idx}`} className="my-2.5">
                  <MosChatMermaidBlock code={codeContent} isDark={isDark} />
                </div>
              );
            } else {
              result.push(
                <div
                  key={`cb-${idx}`}
                  className="my-2 rounded-xl overflow-hidden shadow-sm text-xs font-mono select-text border border-slate-700/80 bg-slate-950"
                >
                  <div className="flex items-center justify-between px-3 py-1.5 text-[10.5px] bg-slate-900 border-b border-slate-800 text-slate-400">
                    <span className="font-semibold uppercase tracking-wider">{codeBlockLang || 'Code'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard?.writeText(codeContent);
                        antdMessage.success('Đã sao chép mã code');
                      }}
                      className="cursor-pointer inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Copy size={11} />
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <pre className="p-3 overflow-x-auto leading-relaxed text-slate-200 m-0">
                    <code>{codeContent}</code>
                  </pre>
                </div>
              );
            }
            inCodeBlock = false;
            codeBlockLines = [];
            codeBlockLang = '';
          } else {
            inCodeBlock = true;
            codeBlockLang = line.trim().slice(3).trim();
            codeBlockLines = [];
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockLines.push(line);
          continue;
        }

        const trimmed = line.trim();

        // Math Block fences ($$)
        if (trimmed === '$$') {
          if (inMathBlock) {
            const mathContent = mathBlockLines.join('\n');
            result.push(
              <div key={`mb-${idx}`} className="my-2">
                <MosChatMathBlock math={mathContent} isDark={isDark} />
              </div>
            );
            inMathBlock = false;
            mathBlockLines = [];
          } else {
            inMathBlock = true;
            mathBlockLines = [];
          }
          continue;
        }

        if (inMathBlock) {
          if (trimmed.endsWith('$$')) {
            const lastPart = trimmed.slice(0, -2).trim();
            if (lastPart) mathBlockLines.push(lastPart);
            const mathContent = mathBlockLines.join('\n');
            result.push(
              <div key={`mb-${idx}`} className="my-2">
                <MosChatMathBlock math={mathContent} isDark={isDark} />
              </div>
            );
            inMathBlock = false;
            mathBlockLines = [];
          } else {
            mathBlockLines.push(line);
          }
          continue;
        }

        // Single-line Block Math: $$formula$$
        if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 2) {
          const mathContent = trimmed.slice(2, -2).trim();
          result.push(
            <div key={`mb-${idx}`} className="my-2">
              <MosChatMathBlock math={mathContent} isDark={isDark} />
            </div>
          );
          continue;
        }

        // Khối HTML <pre><code>...</code></pre>
        if (/^<pre[^>]*><code/i.test(trimmed)) {
          const preLines: string[] = [];
          while (idx < lines.length) {
            preLines.push(lines[idx]);
            if (/<\/code><\/pre>/i.test(lines[idx])) break;
            idx++;
          }
          const fullPre = preLines.join('\n');
          const preMatch = fullPre.match(
            /^<pre[^>]*><code(?:\s+class=["'](?:language-)?([a-z0-9_-]+)["'])?[^>]*>([\s\S]+?)<\/code><\/pre>$/i
          );
          if (preMatch) {
            const lang = preMatch[1] || 'Code';
            const codeText = decodeHtmlEntities(preMatch[2]);
            result.push(
              <div
                key={`html-cb-${idx}`}
                className="my-2 rounded-xl overflow-hidden shadow-sm text-xs font-mono select-text border border-slate-700/80 bg-slate-950"
              >
                <div className="flex items-center justify-between px-3 py-1.5 text-[10.5px] bg-slate-900 border-b border-slate-800 text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">{lang}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void navigator.clipboard?.writeText(codeText);
                      antdMessage.success('Đã sao chép mã code');
                    }}
                    className="cursor-pointer inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Copy size={11} />
                    <span>Sao chép</span>
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto leading-relaxed text-slate-200 m-0">
                  <code>{codeText}</code>
                </pre>
              </div>
            );
            continue;
          }
        }

        // Khối HTML Table: <table ...> ... </table>
        if (/^<table\b/i.test(trimmed)) {
          const tableLines: string[] = [];
          while (idx < lines.length) {
            tableLines.push(lines[idx]);
            if (/<\/table>/i.test(lines[idx])) break;
            idx++;
          }
          const tableHtml = tableLines.join('\n');

          const thList: string[] = [];
          const thRegex = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
          let thMatch: RegExpExecArray | null;
          while ((thMatch = thRegex.exec(tableHtml)) !== null) {
            thList.push(thMatch[1].trim());
          }

          const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
          const rows: string[][] = [];
          let trMatch: RegExpExecArray | null;
          while ((trMatch = trRegex.exec(tableHtml)) !== null) {
            const trContent = trMatch[1];
            const tdList: string[] = [];
            const tdRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
            let tdMatch: RegExpExecArray | null;
            while ((tdMatch = tdRegex.exec(trContent)) !== null) {
              tdList.push(tdMatch[1].trim());
            }
            if (tdList.length > 0) {
              rows.push(tdList);
            }
          }

          if (thList.length > 0 || rows.length > 0) {
            result.push(
              <div
                key={`html-table-${idx}`}
                className={`my-3 max-w-full overflow-x-auto rounded-xl border shadow-sm ${tableTheme.wrapper}`}
              >
                <table className={`w-full min-w-full text-xs divide-y border-collapse ${tableTheme.divider}`}>
                  {thList.length > 0 && (
                    <thead className={`font-bold sticky top-0 ${tableTheme.thead}`}>
                      <tr>
                        {thList.map((h, hIdx) => (
                          <th
                            key={`html-th-${idx}-${hIdx}`}
                            className={`px-3.5 py-2.5 font-bold tracking-wide text-[11.5px] min-w-[110px] leading-snug break-words text-left ${tableTheme.th}`}
                          >
                            {parseInlineRichText(h, `hth-${idx}-${hIdx}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className={`divide-y ${tableTheme.divider}`}>
                    {rows.map((row, rIdx) => (
                      <tr key={`html-tr-${idx}-${rIdx}`} className={`transition-colors ${tableTheme.trEven}`}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={`html-td-${idx}-${rIdx}-${cIdx}`}
                            className={`px-3.5 py-2.5 text-[12px] leading-relaxed align-top break-words min-w-[120px] text-left ${tableTheme.td}`}
                          >
                            {parseInlineRichText(cell, `htd-${idx}-${rIdx}-${cIdx}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }
        }

        // Khối Markdown Tables (| col | col |) hỗ trợ căn lề :---, :---:, ---: và thẻ <br>
        if (trimmed.includes('|') && idx + 1 < lines.length && isTableSeparatorLine(lines[idx + 1])) {
          const headerCells = parseTableRowCells(trimmed);
          const separatorLine = lines[idx + 1];
          const rawAlignments = parseTableRowCells(separatorLine).map((col) => {
            const startColon = col.startsWith(':');
            const endColon = col.endsWith(':');
            if (startColon && endColon) return 'text-center';
            if (endColon) return 'text-right';
            return 'text-left';
          });

          idx += 2; // Bỏ qua dòng tiêu đề và dòng gạch ngang
          const rows: string[][] = [];

          while (idx < lines.length) {
            const rowTrimmed = lines[idx].trim();
            if (
              !rowTrimmed ||
              rowTrimmed.startsWith('```') ||
              rowTrimmed.startsWith('#') ||
              rowTrimmed.startsWith('>')
            ) {
              break;
            }
            if (!rowTrimmed.includes('|')) {
              break;
            }
            rows.push(parseTableRowCells(rowTrimmed));
            idx++;
          }
          idx--; // Điều chỉnh chỉ số vòng lặp

          result.push(
            <div
              key={`table-${idx}`}
              className={`my-3 max-w-full overflow-x-auto rounded-xl border shadow-sm ${tableTheme.wrapper}`}
            >
              <table className={`w-full min-w-full text-xs divide-y border-collapse ${tableTheme.divider}`}>
                <thead className={`font-bold sticky top-0 ${tableTheme.thead}`}>
                  <tr>
                    {headerCells.map((h, hIdx) => {
                      const alignClass = rawAlignments[hIdx] || 'text-left';
                      const parsedHeader = parseInlineRichText(h, `th-${idx}-${hIdx}`);
                      return (
                        <th
                          key={`th-${idx}-${hIdx}`}
                          className={`px-3.5 py-2.5 font-bold tracking-wide text-[11.5px] min-w-[110px] leading-snug break-words ${tableTheme.th} ${alignClass}`}
                        >
                          {parsedHeader.length > 0 ? parsedHeader : <span className="opacity-0">&nbsp;</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className={`divide-y ${tableTheme.divider}`}>
                  {rows.map((row, rIdx) => (
                    <tr key={`tr-${idx}-${rIdx}`} className={`transition-colors ${tableTheme.trEven}`}>
                      {row.map((cell, cIdx) => {
                        const alignClass = rawAlignments[cIdx] || 'text-left';
                        const parsedCell = parseInlineRichText(cell, `td-${idx}-${rIdx}-${cIdx}`);
                        return (
                          <td
                            key={`td-${idx}-${rIdx}-${cIdx}`}
                            className={`px-3.5 py-2.5 text-[12px] leading-relaxed align-top break-words min-w-[120px] ${tableTheme.td} ${alignClass}`}
                          >
                            {parsedCell.length > 0 ? parsedCell : <span className="opacity-0">&nbsp;</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }

        // Khối danh sách HTML: <ul ...> ... </ul> hoặc <ol ...> ... </ol>
        if (/^<(?:ul|ol)\b/i.test(trimmed)) {
          const isOrdered = /^<ol\b/i.test(trimmed);
          const listLines: string[] = [];
          const endTag = isOrdered ? /<\/ol>/i : /<\/ul>/i;
          while (idx < lines.length) {
            listLines.push(lines[idx]);
            if (endTag.test(lines[idx])) break;
            idx++;
          }
          const listHtml = listLines.join('\n');
          const liMatches = Array.from(listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map((m) => m[1].trim());

          if (liMatches.length > 0) {
            result.push(
              <div key={`html-list-${idx}`} className="my-1.5 space-y-1">
                {liMatches.map((liText, liIdx) => (
                  <div key={`html-li-${idx}-${liIdx}`} className="flex items-start gap-1.5 text-xs text-left select-text">
                    {isOrdered ? (
                      <span
                        className={`shrink-0 tabular-nums select-none font-semibold text-[11.5px] min-w-[14px] ${
                          isDark ? 'text-amber-400 dark:text-amber-300' : 'text-amber-700'
                        }`}
                      >
                        {liIdx + 1}.
                      </span>
                    ) : (
                      <span
                        className={`shrink-0 select-none font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                      >
                        •
                      </span>
                    )}
                    <span className="flex-1 break-words text-left">{parseInlineRichText(liText, `hli-${idx}-${liIdx}`)}</span>
                  </div>
                ))}
              </div>
            );
            continue;
          }
        }

        // Khối trích dẫn HTML: <blockquote ...> ... </blockquote>
        if (/^<blockquote\b/i.test(trimmed)) {
          const bqLines: string[] = [];
          while (idx < lines.length) {
            bqLines.push(lines[idx]);
            if (/<\/blockquote>/i.test(lines[idx])) break;
            idx++;
          }
          const bqHtml = bqLines
            .join('\n')
            .replace(/^<blockquote[^>]*>/i, '')
            .replace(/<\/blockquote>$/i, '')
            .trim();

          result.push(
            <blockquote
              key={`html-quote-${idx}`}
              className={`my-1.5 pl-2.5 py-1 border-l-2 italic text-xs rounded-r ${
                isDark
                  ? 'border-amber-500/80 bg-amber-500/10 text-slate-200'
                  : 'border-amber-600/80 bg-amber-50 text-slate-700'
              }`}
            >
              {parseInlineRichText(bqHtml, `hbq-${idx}`)}
            </blockquote>
          );
          continue;
        }

        // Đường kẻ phân cách (Horizontal Divider): ---, ***, ___, <hr>
        if (/^<hr\s*\/?>$/i.test(trimmed) || /^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
          result.push(
            <hr
              key={`hr-${idx}`}
              className={`my-2.5 border-t ${isDark ? 'border-slate-700/70' : 'border-slate-300'}`}
            />
          );
          continue;
        }

        // Headings HTML: <h1> đến <h6>
        const htmlHMatch = trimmed.match(/^<h([1-6])[^>]*>([\s\S]+?)<\/h\1>$/i);
        if (htmlHMatch) {
          const level = parseInt(htmlHMatch[1], 10);
          const headingText = htmlHMatch[2];
          let headingClass = 'text-xs font-semibold opacity-90 mt-1.5 mb-1';

          if (level === 1) {
            headingClass = isDark
              ? 'text-base font-bold text-amber-400 tracking-tight mt-2.5 mb-1.5'
              : 'text-base font-bold text-amber-800 tracking-tight mt-2.5 mb-1.5';
          } else if (level === 2) {
            headingClass = isDark
              ? 'text-sm font-bold text-amber-300 mt-2 mb-1'
              : 'text-sm font-bold text-amber-700 mt-2 mb-1';
          } else if (level === 3) {
            headingClass = isDark
              ? 'text-xs font-bold text-amber-200 mt-1.5 mb-1'
              : 'text-[13px] font-bold text-amber-700 mt-1.5 mb-1';
          } else {
            headingClass = isDark
              ? 'text-xs font-semibold text-slate-200 mt-1 mb-0.5'
              : 'text-xs font-semibold text-slate-800 mt-1 mb-0.5';
          }

          result.push(
            <div key={`html-h${level}-${idx}`} className={headingClass}>
              {parseInlineRichText(headingText, `hh${level}-${idx}`)}
            </div>
          );
          continue;
        }

        // Headings Markdown: # H1 qua ###### H6
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headingText = headingMatch[2] || '';
          let headingClass = 'text-xs font-semibold opacity-90 mt-1.5 mb-1';

          if (level === 1) {
            headingClass = isDark
              ? 'text-base font-bold text-amber-400 tracking-tight mt-2.5 mb-1.5'
              : 'text-base font-bold text-amber-800 tracking-tight mt-2.5 mb-1.5';
          } else if (level === 2) {
            headingClass = isDark
              ? 'text-sm font-bold text-amber-300 mt-2 mb-1'
              : 'text-sm font-bold text-amber-700 mt-2 mb-1';
          } else if (level === 3) {
            headingClass = isDark
              ? 'text-xs font-bold text-amber-200 mt-1.5 mb-1'
              : 'text-[13px] font-bold text-amber-700 mt-1.5 mb-1';
          } else {
            headingClass = isDark
              ? 'text-xs font-semibold text-slate-200 mt-1 mb-0.5'
              : 'text-xs font-semibold text-slate-800 mt-1 mb-0.5';
          }

          result.push(
            <div key={`h${level}-${idx}`} className={headingClass}>
              {headingText ? (
                parseInlineRichText(headingText, `h${level}-${idx}`)
              ) : (
                <span className="opacity-0">&nbsp;</span>
              )}
            </div>
          );
          continue;
        }

        // Blockquote Markdown: > text
        if (trimmed.startsWith('> ') || trimmed === '>') {
          result.push(
            <blockquote
              key={`quote-${idx}`}
              className={`my-1.5 pl-2.5 py-1 border-l-2 italic text-xs rounded-r ${
                isDark
                  ? 'border-amber-500/80 bg-amber-500/10 text-slate-200'
                  : 'border-amber-600/80 bg-amber-50 text-slate-700'
              }`}
            >
              {parseInlineRichText(trimmed.replace(/^>\s?/, ''), `q-${idx}`)}
            </blockquote>
          );
          continue;
        }

        // Apple Notes Checklist / Todo: - [ ] hoặc - [x]
        if (/^-\s?\[([ xX])\](?:\s|$)/.test(trimmed)) {
          const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
          const itemContent = trimmed.replace(/^-\s?\[([ xX])\](?:\s+|$)/, '');
          result.push(
            <div key={`todo-${idx}`} className="flex items-start gap-2 my-1 text-xs text-left select-text">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  isChecked
                    ? isDark
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-amber-600 text-white font-bold'
                    : isDark
                      ? 'border-2 border-amber-400/70'
                      : 'border-2 border-amber-600/70'
                }`}
              >
                {isChecked ? <Check size={11} strokeWidth={3} /> : null}
              </span>
              <span className={`flex-1 break-words text-left ${isChecked ? 'line-through opacity-60' : ''}`}>
                {itemContent ? parseInlineRichText(itemContent, `t-${idx}`) : <span className="opacity-0">&nbsp;</span>}
              </span>
            </div>
          );
          continue;
        }

        // Bullet List Markdown: - item, * item, • item, hoặc **- item** / **• item**
        const boldBulletMatch = trimmed.match(/^\*\*[-*•\u2022]\s+([\s\S]+)\*\*$/);
        if (boldBulletMatch || /^[-*•\u2022](?:\s|$)/.test(trimmed)) {
          const itemContent = boldBulletMatch
            ? `**${boldBulletMatch[1]}**`
            : trimmed.replace(/^[-*•\u2022](?:\s+|$)/, '');
          const indentMatch = line.match(/^(\s+)/);
          const indentSpaces = indentMatch ? indentMatch[1].replace(/\t/g, '  ').length : 0;
          const indentLevel = Math.min(Math.floor(indentSpaces / 2), 4);
          const indentPadding = indentLevel > 0 ? { paddingLeft: indentLevel * 16 } : undefined;

          result.push(
            <div
              key={`bullet-${idx}`}
              style={indentPadding}
              className="flex items-start gap-1.5 my-0.5 text-xs text-left select-text"
            >
              <span className={`shrink-0 select-none font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                •
              </span>
              <span className="flex-1 break-words text-left">
                {itemContent ? parseInlineRichText(itemContent, `b-${idx}`) : <span className="opacity-0">&nbsp;</span>}
              </span>
            </div>
          );
          continue;
        }

        // Numbered List Markdown: 1. item hoặc **1. item**
        const boldNumMatch = trimmed.match(/^\*\*(\d+)\.\s+([\s\S]+)\*\*$/);
        const numMatch = boldNumMatch
          ? ([boldNumMatch[0], boldNumMatch[1], `**${boldNumMatch[2]}**`] as RegExpMatchArray)
          : trimmed.match(/^(\d+)\.(?:\s+(.*)|$)/);
        if (numMatch) {
          const num = numMatch[1];
          const itemContent = numMatch[2] || '';
          const indentMatch = line.match(/^(\s+)/);
          const indentSpaces = indentMatch ? indentMatch[1].replace(/\t/g, '  ').length : 0;
          const indentLevel = Math.min(Math.floor(indentSpaces / 2), 4);
          const indentPadding = indentLevel > 0 ? { paddingLeft: indentLevel * 16 } : undefined;

          result.push(
            <div
              key={`num-${idx}`}
              style={indentPadding}
              className="flex items-start gap-1.5 my-0.5 text-xs text-left select-text"
            >
              <span
                className={`shrink-0 tabular-nums select-none font-semibold text-[11.5px] min-w-[14px] ${
                  isDark ? 'text-amber-400 dark:text-amber-300' : 'text-amber-700'
                }`}
              >
                {num}.
              </span>
              <span className="flex-1 break-words text-left">
                {itemContent ? parseInlineRichText(itemContent, `n-${idx}`) : <span className="opacity-0">&nbsp;</span>}
              </span>
            </div>
          );
          continue;
        }

        // Dòng trống hoặc văn bản tiêu chuẩn
        if (trimmed === '') {
          result.push(<div key={`blank-${idx}`} className="h-1.5" />);
        } else {
          result.push(
            <div key={`p-${idx}`} className="break-words leading-relaxed text-left select-text whitespace-pre-wrap">
              {parseInlineRichText(line, `p-${idx}`)}
            </div>
          );
        }
      }

      // Xử lý code block chưa đóng ở cuối tin nhắn (Unclosed Code Block)
      if (inCodeBlock && codeBlockLines.length > 0) {
        const codeContent = codeBlockLines.join('\n');
        const lang = (codeBlockLang || '').trim().toLowerCase();
        const isMermaid =
          lang === 'mermaid' ||
          lang.startsWith('mermaid') ||
          /^\s*(?:flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|pie)\b/i.test(
            codeContent.trim()
          );

        if (isMermaid) {
          result.push(
            <div key="mermaid-unclosed" className="my-2.5">
              <MosChatMermaidBlock code={codeContent} isDark={isDark} />
            </div>
          );
        } else {
          result.push(
            <pre
              key="cb-unclosed"
              className="p-3 my-2 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed select-text border border-slate-700/80 bg-slate-950 text-slate-200"
            >
              <code>{codeContent}</code>
            </pre>
          );
        }
      }

      // Xử lý math block chưa đóng
      if (inMathBlock && mathBlockLines.length > 0) {
        result.push(
          <div key="mb-unclosed" className="my-2">
            <MosChatMathBlock math={mathBlockLines.join('\n')} isDark={isDark} />
          </div>
        );
      }

      return result;
    }, [content, isMe, isDark, parseInlineRichText]);

    if (!renderedContent) return null;

    return <div className={`space-y-0.5 text-left ${className}`}>{renderedContent}</div>;
  }
);

MosChatRichTextPure.displayName = 'MosChatRichTextPure';

const MosChatRichTextWithContext: React.FC<MosChatRichTextProps> = (props) => {
  const chatContext = useContext(MosChatContext);
  const currentUser = props.currentUser || chatContext?.currentUser;
  const staffDirectory = props.staffDirectory || chatContext?.staffDirectory || [];

  const memberNicknames = useMemo(() => {
    const merged: Record<string, string> = {};
    if (chatContext?.conversations) {
      chatContext.conversations.forEach((c) => {
        if (c.memberNicknames) {
          Object.assign(merged, c.memberNicknames);
        }
      });
    }
    if (chatContext?.activeConversation?.memberNicknames) {
      Object.assign(merged, chatContext.activeConversation.memberNicknames);
    }
    if (props.memberNicknames) {
      Object.assign(merged, props.memberNicknames);
    }
    return merged;
  }, [chatContext, props.memberNicknames]);

  return (
    <MosChatRichTextPure
      {...props}
      currentUser={currentUser}
      staffDirectory={staffDirectory}
      memberNicknames={memberNicknames}
    />
  );
};

export const MosChatRichText: React.FC<MosChatRichTextProps> = React.memo((props) => {
  if (props.staffDirectory !== undefined && props.currentUser !== undefined && props.memberNicknames !== undefined) {
    return <MosChatRichTextPure {...props} />;
  }
  return <MosChatRichTextWithContext {...props} />;
});

MosChatRichText.displayName = 'MosChatRichText';

export default MosChatRichText;
