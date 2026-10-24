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
}

/**
 * Component render nội dung tin nhắn phong cách Rich Text / Markdown nâng cao cho mOS Chat:
 * Hỗ trợ hoàn chỉnh:
 * 1. Headings (# H1 đến ###### H6)
 * 2. Đường kẻ phân cách (---, ***, ___)
 * 3. Sơ đồ tương tác Mermaid (```mermaid) với zoom modal & chế độ xem
 * 4. Khối code cú pháp (```lang) kèm nút sao chép và thanh cuộn ngang
 * 5. Công thức toán học KaTeX ($$block$$ và $inline$)
 * 6. Bảng biểu Markdown (| Col 1 | Col 2 |) hỗ trợ responsive cuộn ngang trên điện thoại
 * 7. Trích dẫn phong cách Blockquote (> text)
 * 8. Danh sách công việc / Todo checklist (- [ ] / - [x])
 * 9. Danh sách dấu đầu dòng (- , * , • ) và số thứ tự (1. )
 * 10. Định dạng chữ: **đậm**, *nghiêng*, ~~gạch ngang~~, <u>gạch chân</u>, `code nội dòng`
 * 11. Nhãn @mentions thông minh (@Danny Do, @Bảo Hân, @AI, @all)
 * 12. Tự động nhận diện Sticker động độc quyền của Wings
 */
export const MosChatRichText: React.FC<MosChatRichTextProps> = ({
  content,
  isMe = false,
  isDark = true,
  className = '',
}) => {
  // Trích xuất ngữ cảnh chat an toàn không vi phạm rules of hooks
  const chatContext = useContext(MosChatContext);

  const currentUser = chatContext?.currentUser;
  const staffDirectory = chatContext?.staffDirectory || [];
  const activeConversation = chatContext?.activeConversation;

  // Danh sách tên nhân sự nhiều từ để khớp chính xác @Tên Đầy Đủ
  const knownMultiWordStaffNames = useMemo(() => {
    const set = new Set<string>(['Danny Do', 'Bảo Hân', 'Diễm Hương']);
    staffDirectory.forEach((s) => {
      if (s.displayName && s.displayName.includes(' ')) set.add(s.displayName.trim());
      const extraName = (s as any).realName || (s as any).nickname;
      if (typeof extraName === 'string' && extraName.includes(' ')) set.add(extraName.trim());
    });
    if (activeConversation?.memberNicknames) {
      Object.values(activeConversation.memberNicknames).forEach((nick) => {
        if (nick && nick.includes(' ')) set.add(nick.trim());
      });
    }
    return Array.from(set).sort((a, b) => b.length - a.length);
  }, [staffDirectory, activeConversation]);

  /**
   * Phân tích inline markup sang React Nodes:
   * **đậm**, *nghiêng*, ~~gạch~~, <u>gạch chân</u>, `code`, https://..., $math$, @mentions
   */
  const parseInlineRichText = useCallback(
    (text: string, keyPrefix = 'inline'): React.ReactNode[] => {
      if (!text) return [];

      const staffPattern =
        knownMultiWordStaffNames.length > 0
          ? `|(@(?:${knownMultiWordStaffNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b)`
          : '';

      // Khớp theo thứ tự ưu tiên:
      // 1. <span style="color:...">text</span>
      // 2. [label](https?://...)
      // 3. **bold**
      // 4. ~~strike~~
      // 5. <u>underline</u>
      // 6. `code`
      // 7. *italic*
      // 8. link https?://
      // 9. $$math$$
      // 10. $math$
      // 11. @AI / @all
      // 12. Staff pattern từ directory
      // 13. @username đơn từ
      const regex = new RegExp(
        `(<span\\s+style=["']color:\\s*([^"';>]+);?["']>([\\s\\S]+?)<\\/span>)|(\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\))|(\\*\\*(.+?)\\*\\*)|(~~(.+?)~~)|(<u>(.+?)<\\/u>)|(\`([^\`]+)\`)|\\*([^\\*\\n]+)\\*|(https?:\\/\\/[^\\s<)]+)|(\\$\\$([^\\$]+?)\\$\\$)|(\\$([^\\$\\s\\n](?:[^\\$\\n]*?[^\\$\\s\\n])?)\\$)|(@\\s*(?:AI|copilot|all|mọi\\s+người|moi\\s+nguoi)\\b)${staffPattern}|(@[a-zA-Z0-9_\\u00C0-\\u1EF9]+)`,
        'gui'
      );

      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let i = 0;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          elements.push(text.substring(lastIndex, match.index));
        }

        const fullMatch = match[0];
        const key = `${keyPrefix}-${i++}`;

        const colorSpanMatch = fullMatch.match(/^<span\s+style=["']color:\s*([^"';>]+);?["']>([\s\S]+?)<\/span>$/i);
        const mdLinkMatch = fullMatch.match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/i);

        if (colorSpanMatch) {
          const safeColor = colorSpanMatch[1].trim();
          const innerContent = colorSpanMatch[2];
          elements.push(
            <span key={key} style={{ color: safeColor }} className="font-medium">
              {innerContent}
            </span>
          );
        } else if (mdLinkMatch) {
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
                isMe
                  ? 'text-slate-950 underline font-semibold'
                  : 'text-sky-400 hover:text-sky-300 underline underline-offset-2'
              }`}
            >
              <span>{linkLabel}</span>
              <ExternalLink size={10} className="inline shrink-0 opacity-70" />
            </a>
          );
        } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
          elements.push(
            <strong
              key={key}
              className={
                isMe
                  ? 'font-black text-slate-950 drop-shadow-none'
                  : 'font-bold text-amber-400 dark:text-amber-300 drop-shadow-xs'
              }
            >
              {fullMatch.slice(2, -2)}
            </strong>
          );
        } else if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~')) {
          elements.push(
            <del key={key} className="line-through opacity-70">
              {fullMatch.slice(2, -2)}
            </del>
          );
        } else if (fullMatch.startsWith('<u>') && fullMatch.endsWith('</u>')) {
          elements.push(
            <u key={key} className="underline underline-offset-2">
              {fullMatch.slice(3, -4)}
            </u>
          );
        } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
          elements.push(
            <code
              key={key}
              className={`px-1.5 py-0.5 rounded text-[11.5px] font-mono select-text ${
                isMe
                  ? 'bg-amber-600/30 text-slate-950 border border-amber-600/40 font-bold'
                  : 'bg-black/40 text-amber-300 border border-slate-700/60 font-medium'
              }`}
            >
              {fullMatch.slice(1, -1)}
            </code>
          );
        } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
          elements.push(
            <em key={key} className="italic opacity-90">
              {fullMatch.slice(1, -1)}
            </em>
          );
        } else if (fullMatch.startsWith('http://') || fullMatch.startsWith('https://')) {
          elements.push(
            <a
              key={key}
              href={fullMatch}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-0.5 break-all font-medium ${
                isMe
                  ? 'text-slate-950 underline font-semibold'
                  : 'text-sky-400 hover:text-sky-300 underline underline-offset-2'
              }`}
            >
              <span>{fullMatch}</span>
              <ExternalLink size={10} className="inline shrink-0 opacity-70" />
            </a>
          );
        } else if (fullMatch.startsWith('$$') && fullMatch.endsWith('$$') && fullMatch.length > 2) {
          const math = fullMatch.slice(2, -2).trim();
          if (isMathValid(math)) {
            elements.push(<MosChatMathBlock key={key} math={math} isDark={isDark} />);
          } else {
            elements.push(fullMatch);
          }
        } else if (fullMatch.startsWith('$') && fullMatch.endsWith('$') && fullMatch.length > 1) {
          const math = fullMatch.slice(1, -1).trim();
          if (isMathValid(math)) {
            elements.push(<MosChatMathInline key={key} math={math} />);
          } else {
            elements.push(fullMatch);
          }
        } else if (fullMatch.startsWith('@')) {
          const cleanTag = fullMatch.replace(/^@\s*/, '').trim().toLowerCase();
          const isAi = cleanTag === 'ai' || cleanTag.includes('copilot');
          const isAll = cleanTag === 'all' || cleanTag === 'mọi người' || cleanTag === 'moi nguoi';
          const myId = Number(currentUser?.id) || 0;
          const myNick = activeConversation?.memberNicknames?.[String(myId)];
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

          elements.push(
            <span
              key={key}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[11px] font-semibold select-text transition-all ${
                isMe
                  ? 'bg-slate-950/20 text-slate-950 border border-slate-950/30'
                  : isAi
                    ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                    : isMentioningMe
                      ? 'bg-amber-500/30 text-amber-200 border border-amber-400/60 shadow-xs ring-1 ring-amber-400/40 font-bold'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}
            >
              <AtSign size={10} className="shrink-0 opacity-80" />
              <span>{isAi ? 'AI' : fullMatch.replace(/^@\s*/, '')}</span>
            </span>
          );
        } else {
          elements.push(fullMatch);
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        elements.push(text.substring(lastIndex));
      }

      return elements.length > 0 ? elements : [text];
    },
    [knownMultiWordStaffNames, isMe, isDark, currentUser, activeConversation]
  );

  // Phân tích toàn bộ khối tin nhắn
  const renderedContent = useMemo(() => {
    if (!content) return null;

    const cleanText = content
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

    const lines = cleanText.split('\n');
    const result: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockLines: string[] = [];
    let inMathBlock = false;
    let mathBlockLines: string[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // Code block fences (```)
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

      // Markdown Tables (| cell | cell |)
      if (
        trimmed.startsWith('|') &&
        idx + 1 < lines.length &&
        lines[idx + 1].trim().startsWith('|') &&
        lines[idx + 1].includes('-')
      ) {
        const headerCells = trimmed
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        idx += 2; // bỏ qua header và dòng gạch ngang |---|---|
        const rows: string[][] = [];

        while (idx < lines.length && lines[idx].trim().startsWith('|')) {
          const cells = lines[idx]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          rows.push(cells);
          idx++;
        }
        idx--; // điều chỉnh vị trí vòng for

        result.push(
          <div
            key={`table-${idx}`}
            className="my-2.5 max-w-full overflow-x-auto rounded-xl border border-slate-700/70 shadow-sm"
          >
            <table className="min-w-full text-xs text-left divide-y divide-slate-700/70">
              <thead className="bg-slate-900/90 text-amber-300 font-bold">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={`th-${hIdx}`} className="px-3 py-2 whitespace-nowrap">
                      {parseInlineRichText(h, `th-${idx}-${hIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                {rows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-slate-800/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${rIdx}-${cIdx}`} className="px-3 py-1.5 whitespace-nowrap text-slate-200">
                        {parseInlineRichText(cell, `td-${idx}-${rIdx}-${cIdx}`)}
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

      // Đường kẻ phân cách (Horizontal Divider): ---, ***, ___
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        result.push(
          <hr key={`hr-${idx}`} className={`my-2.5 border-t ${isMe ? 'border-slate-950/30' : 'border-slate-700/70'}`} />
        );
        continue;
      }

      // Headings: # H1 qua ###### H6
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        let headingClass = 'text-xs font-semibold opacity-90 mt-1.5 mb-1';

        if (level === 1) {
          headingClass = isMe
            ? 'text-base font-black text-slate-950 tracking-tight mt-2.5 mb-1.5'
            : 'text-base font-bold text-amber-400 tracking-tight mt-2.5 mb-1.5';
        } else if (level === 2) {
          headingClass = isMe
            ? 'text-sm font-extrabold text-slate-950 mt-2 mb-1'
            : 'text-sm font-bold text-amber-300 mt-2 mb-1';
        } else if (level === 3) {
          headingClass = isMe
            ? 'text-xs font-bold text-slate-950 mt-1.5 mb-1'
            : 'text-[13px] font-bold text-amber-200 mt-1.5 mb-1';
        } else {
          headingClass = isMe
            ? 'text-xs font-bold text-slate-950 mt-1 mb-0.5'
            : 'text-xs font-semibold text-slate-200 mt-1 mb-0.5';
        }

        result.push(
          <div key={`h${level}-${idx}`} className={headingClass}>
            {parseInlineRichText(headingText, `h${level}-${idx}`)}
          </div>
        );
        continue;
      }

      // Blockquote: > text
      if (line.startsWith('> ') || line === '>') {
        result.push(
          <blockquote
            key={`quote-${idx}`}
            className={`my-1.5 pl-2.5 py-1 border-l-2 italic text-xs rounded-r ${
              isMe
                ? 'border-slate-950/60 bg-black/10 text-slate-900'
                : 'border-amber-500/80 bg-amber-500/10 text-slate-200'
            }`}
          >
            {parseInlineRichText(line.replace(/^>\s?/, ''), `q-${idx}`)}
          </blockquote>
        );
        continue;
      }

      // Apple Notes Checklist / Todo: - [ ] hoặc - [x]
      if (/^-\s?\[([ xX])\]\s/.test(trimmed)) {
        const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
        const itemContent = trimmed.replace(/^-\s?\[([ xX])\]\s/, '');
        result.push(
          <div key={`todo-${idx}`} className="flex items-start gap-2 my-1 text-xs select-text">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                isChecked
                  ? isMe
                    ? 'bg-slate-950 text-white font-bold'
                    : 'bg-amber-500 text-black font-bold'
                  : isMe
                    ? 'border-2 border-slate-950/70'
                    : 'border-2 border-amber-500/70'
              }`}
            >
              {isChecked ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span className={`flex-1 break-words ${isChecked ? 'line-through opacity-60' : ''}`}>
              {parseInlineRichText(itemContent, `t-${idx}`)}
            </span>
          </div>
        );
        continue;
      }

      // Bullet List: - item, * item, hoặc • item
      if (/^[-*•]\s/.test(trimmed) || /^\u2022\s/.test(trimmed)) {
        const itemContent = trimmed.replace(/^[-*•\u2022]\s+/, '');
        result.push(
          <div key={`bullet-${idx}`} className="flex items-start gap-1.5 my-0.5 text-xs select-text">
            <span className={`shrink-0 select-none font-bold ${isMe ? 'text-slate-950' : 'text-amber-400'}`}>•</span>
            <span className="flex-1 break-words">{parseInlineRichText(itemContent, `b-${idx}`)}</span>
          </div>
        );
        continue;
      }

      // Numbered List: 1. item
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const itemContent = numMatch[2];
        result.push(
          <div key={`num-${idx}`} className="flex items-start gap-1.5 my-0.5 text-xs select-text">
            <span
              className={`shrink-0 tabular-nums select-none font-semibold text-[11.5px] min-w-[14px] ${
                isMe ? 'text-slate-950' : 'text-amber-400'
              }`}
            >
              {num}.
            </span>
            <span className="flex-1 break-words">{parseInlineRichText(itemContent, `n-${idx}`)}</span>
          </div>
        );
        continue;
      }

      // Dòng trống hoặc văn bản tiêu chuẩn
      if (line === '') {
        result.push(<div key={`blank-${idx}`} className="h-1.5" />);
      } else {
        result.push(
          <div key={`p-${idx}`} className="break-words leading-relaxed select-text">
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

  return <div className={`space-y-0.5 ${className}`}>{renderedContent}</div>;
};

export default MosChatRichText;
