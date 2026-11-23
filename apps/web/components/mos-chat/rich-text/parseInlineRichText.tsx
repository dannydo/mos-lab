import React from 'react';
import { AtSign, ExternalLink } from 'lucide-react';
import { parseGoogleWorkspaceUrl, removeVietnameseTones, type SafeAny } from '@mos-lab/shared';
import { MosChatMathBlock, MosChatMathInline, isMathValid } from '../MosChatMathBlock';
import { MosChatGoogleSmartChip } from './MosChatGoogleSmartChip';
import { decodeHtmlEntities } from './richTextUtils';

export interface InlineRichTextContext {
  inlineRegexSource: string;
  isMe: boolean;
  isDark: boolean;
  currentUser: SafeAny;
  memberNicknames?: Record<string, string>;
}

/**
 * Phân tích inline markup sang React Nodes:
 * Hỗ trợ lồng nhau an toàn (recursive with depth guard)
 */
export function parseInlineRichTextNodes(
  text: string,
  ctx: InlineRichTextContext,
  keyPrefix = 'inline',
  depth = 0
): React.ReactNode[] {
  if (!text) return [];
  if (depth > 5) return [decodeHtmlEntities(text)];

  // Siêu tối ưu plain text: nếu không chứa ký tự định dạng đặc biệt, trả về ngay
  if (!/[<*~`$@\[]|https?:\/\//.test(text)) {
    return [decodeHtmlEntities(text)];
  }

  const { inlineRegexSource, isMe, isDark, currentUser, memberNicknames } = ctx;
  const regex = new RegExp(inlineRegexSource, 'gu');
  const parseChild = (childText: string, childKey: string) =>
    parseInlineRichTextNodes(childText, ctx, childKey, depth + 1);

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
            {parseChild(inner, `${key}-sp`)}
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
        const gwParsed = parseGoogleWorkspaceUrl(linkHref);
        if (gwParsed) {
          const plainLabel = decodeHtmlEntities(linkLabel.replace(/<[^>]+>/g, '').trim());
          elements.push(
            <MosChatGoogleSmartChip key={key} parsed={gwParsed} customLabel={plainLabel} isDark={isDark} />
          );
        } else {
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
              <span>{parseChild(linkLabel, `${key}-a`)}</span>
              <ExternalLink size={10} className="inline shrink-0 opacity-70" />
            </a>
          );
        }
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
        const gwParsed = parseGoogleWorkspaceUrl(linkHref);
        if (gwParsed) {
          elements.push(
            <MosChatGoogleSmartChip
              key={key}
              parsed={gwParsed}
              customLabel={decodeHtmlEntities(linkLabel)}
              isDark={isDark}
            />
          );
        } else {
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
        }
      } else {
        elements.push(fullMatch);
      }
    }
    // 5. In đậm HTML <b>...</b> hoặc <strong>...</strong>
    else if (/^<(?:b|strong)[^>]*>[\s\S]+?<\/(?:b|strong)>$/i.test(fullMatch)) {
      const inner = fullMatch.replace(/^<(?:b|strong)[^>]*>/i, '').replace(/<\/(?:b|strong)>$/i, '');
      elements.push(
        <strong key={key} className={isDark ? 'font-bold text-amber-300 drop-shadow-xs' : 'font-bold text-amber-800'}>
          {parseChild(inner, `${key}-b`)}
        </strong>
      );
    }
    // 5.5 In đậm và in nghiêng Markdown ***...***
    else if (fullMatch.startsWith('***') && fullMatch.endsWith('***') && fullMatch.length >= 6) {
      const inner = fullMatch.slice(3, -3);
      elements.push(
        <strong key={key} className={isDark ? 'font-bold text-amber-300 drop-shadow-xs' : 'font-bold text-amber-800'}>
          <em className="italic opacity-95">{parseChild(inner, `${key}-bi`)}</em>
        </strong>
      );
    }
    // 6. In đậm Markdown **...**
    else if (fullMatch.startsWith('**') && fullMatch.endsWith('**') && fullMatch.length >= 4) {
      const inner = fullMatch.slice(2, -2);
      elements.push(
        <strong key={key} className={isDark ? 'font-bold text-amber-300 drop-shadow-xs' : 'font-bold text-amber-800'}>
          {parseChild(inner, `${key}-b`)}
        </strong>
      );
    }
    // 7. In nghiêng HTML <i>...</i> hoặc <em>...</em>
    else if (/^<(?:i|em)[^>]*>[\s\S]+?<\/(?:i|em)>$/i.test(fullMatch)) {
      const inner = fullMatch.replace(/^<(?:i|em)[^>]*>/i, '').replace(/<\/(?:i|em)>$/i, '');
      elements.push(
        <em key={key} className="italic opacity-90">
          {parseChild(inner, `${key}-i`)}
        </em>
      );
    }
    // 8. In nghiêng Markdown *...*
    else if (fullMatch.startsWith('*') && fullMatch.endsWith('*') && fullMatch.length >= 2) {
      const inner = fullMatch.slice(1, -1);
      elements.push(
        <em key={key} className="italic opacity-90">
          {parseChild(inner, `${key}-i`)}
        </em>
      );
    }
    // 9. Gạch chân HTML <u>...</u> hoặc <ins>...</ins>
    else if (/^<(?:u|ins)[^>]*>[\s\S]+?<\/(?:u|ins)>$/i.test(fullMatch)) {
      const inner = fullMatch.replace(/^<(?:u|ins)[^>]*>/i, '').replace(/<\/(?:u|ins)>$/i, '');
      elements.push(
        <u key={key} className="underline underline-offset-2">
          {parseChild(inner, `${key}-u`)}
        </u>
      );
    }
    // 10. Gạch ngang HTML <s>, <del>, <strike>
    else if (/^<(?:s|del|strike)[^>]*>[\s\S]+?<\/(?:s|del|strike)>$/i.test(fullMatch)) {
      const inner = fullMatch.replace(/^<(?:s|del|strike)[^>]*>/i, '').replace(/<\/(?:s|del|strike)>$/i, '');
      elements.push(
        <del key={key} className="line-through opacity-70">
          {parseChild(inner, `${key}-d`)}
        </del>
      );
    }
    // 11. Gạch ngang Markdown ~~...~~
    else if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~') && fullMatch.length >= 4) {
      const inner = fullMatch.slice(2, -2);
      elements.push(
        <del key={key} className="line-through opacity-70">
          {parseChild(inner, `${key}-d`)}
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
          {parseChild(inner, `${key}-m`)}
        </mark>
      );
    }
    // 15. Chữ nhỏ <small>...</small>
    else if (/^<small[^>]*>[\s\S]+?<\/small>$/i.test(fullMatch)) {
      const inner = fullMatch.replace(/^<small[^>]*>/i, '').replace(/<\/small>$/i, '');
      elements.push(
        <small key={key} className="text-[10.5px] opacity-80">
          {parseChild(inner, `${key}-sm`)}
        </small>
      );
    }
    // 16. Chỉ số dưới <sub>...</sub>
    else if (/^<sub[^>]*>[\s\S]+?<\/sub>$/i.test(fullMatch)) {
      const inner = fullMatch.replace(/^<sub[^>]*>/i, '').replace(/<\/sub>$/i, '');
      elements.push(
        <sub key={key} className="text-[10px]">
          {parseChild(inner, `${key}-sub`)}
        </sub>
      );
    }
    // 17. Chỉ số trên <sup>...</sup>
    else if (/^<sup[^>]*>[\s\S]+?<\/sup>$/i.test(fullMatch)) {
      const inner = fullMatch.replace(/^<sup[^>]*>/i, '').replace(/<\/sup>$/i, '');
      elements.push(
        <sup key={key} className="text-[10px]">
          {parseChild(inner, `${key}-sup`)}
        </sup>
      );
    }
    // 18. Khối phân đoạn inline <p> / <div>
    else if (/^<(?:p|div)[^>]*>[\s\S]+?<\/(?:p|div)>$/i.test(fullMatch)) {
      const inner = fullMatch.replace(/^<(?:p|div)[^>]*>/i, '').replace(/<\/(?:p|div)>$/i, '');
      elements.push(
        <span key={key} className="block my-0.5">
          {parseChild(inner, `${key}-block`)}
        </span>
      );
    }
    // 19. Link URL thuần
    else if (fullMatch.startsWith('http://') || fullMatch.startsWith('https://')) {
      const gwParsed = parseGoogleWorkspaceUrl(fullMatch);
      if (gwParsed) {
        elements.push(<MosChatGoogleSmartChip key={key} parsed={gwParsed} isDark={isDark} />);
      } else {
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
}
