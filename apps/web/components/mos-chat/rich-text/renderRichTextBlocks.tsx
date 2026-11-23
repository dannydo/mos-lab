import React from 'react';
import { Check, Copy } from 'lucide-react';
import { message as antdMessage } from 'antd';
import { MosChatMermaidBlock } from '../MosChatMermaidBlock';
import { MosChatMathBlock } from '../MosChatMathBlock';
import { MosChatStickerVisual, parsePureStickerMessage } from '../mos-chat-stickers';
import { isStandardQuote, parseQuoteMeta } from '../utils/quoteUtils';
import { getRichTextTableTheme, sanitizeRichTextContent } from './richTextUtils';
import { tryRenderHtmlOrTableBlock } from './renderHtmlAndTableBlocks';

function getHeadingClassName(level: number, isDark: boolean): string {
  if (level === 1) {
    return isDark
      ? 'text-base font-bold text-amber-400 tracking-tight mt-2.5 mb-1.5'
      : 'text-base font-bold text-amber-800 tracking-tight mt-2.5 mb-1.5';
  }
  if (level === 2) {
    return isDark ? 'text-sm font-bold text-amber-300 mt-2 mb-1' : 'text-sm font-bold text-amber-700 mt-2 mb-1';
  }
  if (level === 3) {
    return isDark ? 'text-xs font-bold text-amber-200 mt-1.5 mb-1' : 'text-[13px] font-bold text-amber-700 mt-1.5 mb-1';
  }
  return isDark
    ? 'text-xs font-semibold text-slate-200 mt-1 mb-0.5'
    : 'text-xs font-semibold text-slate-800 mt-1 mb-0.5';
}

function isMermaidFence(codeBlockLang: string, codeContent: string): boolean {
  const lang = (codeBlockLang || '').trim().toLowerCase();
  return (
    lang === 'mermaid' ||
    lang.startsWith('mermaid') ||
    /^\s*(?:flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|pie)\b/i.test(codeContent.trim())
  );
}

export function renderRichTextBlocks(params: {
  content?: string | null;
  isDark: boolean;
  onQuoteClick?: (senderName: string, quotedContent: string) => void;
  parseInlineRichText: (text: string, keyPrefix?: string, depth?: number) => React.ReactNode[];
}): React.ReactNode {
  const { content, isDark, onQuoteClick, parseInlineRichText } = params;
  if (!content) return null;

  const cleanText = sanitizeRichTextContent(content);
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

  const tableTheme = getRichTextTableTheme(isDark);
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
        if (isMermaidFence(codeBlockLang, codeContent)) {
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
        result.push(
          <div key={`mb-${idx}`} className="my-2">
            <MosChatMathBlock math={mathBlockLines.join('\n')} isDark={isDark} />
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
        result.push(
          <div key={`mb-${idx}`} className="my-2">
            <MosChatMathBlock math={mathBlockLines.join('\n')} isDark={isDark} />
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

    // Multi-line HTML / Table blocks
    const htmlOrTable = tryRenderHtmlOrTableBlock({
      lines,
      startIdx: idx,
      trimmed,
      isDark,
      tableTheme,
      onQuoteClick,
      parseInlineRichText,
    });
    if (htmlOrTable) {
      result.push(htmlOrTable.node);
      idx = htmlOrTable.nextIdx;
      continue;
    }

    // Đường kẻ phân cách (Horizontal Divider): ---, ***, ___, <hr>
    if (/^<hr\s*\/?>$/i.test(trimmed) || /^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      result.push(
        <hr key={`hr-${idx}`} className={`my-2.5 border-t ${isDark ? 'border-slate-700/70' : 'border-slate-300'}`} />
      );
      continue;
    }

    // Headings HTML: <h1> đến <h6>
    const htmlHMatch = trimmed.match(/^<h([1-6])[^>]*>([\s\S]+?)<\/h\1>$/i);
    if (htmlHMatch) {
      const level = parseInt(htmlHMatch[1], 10);
      const headingText = htmlHMatch[2];
      result.push(
        <div key={`html-h${level}-${idx}`} className={getHeadingClassName(level, isDark)}>
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
      result.push(
        <div key={`h${level}-${idx}`} className={getHeadingClassName(level, isDark)}>
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
      const mdMeta = isStandardQuote(trimmed) ? parseQuoteMeta(trimmed) : null;
      const mdClickable = Boolean(mdMeta && onQuoteClick);
      const mdContent = trimmed.replace(/^>\s?/, '');

      result.push(
        <blockquote
          key={`quote-${idx}`}
          onClick={
            mdClickable && mdMeta
              ? (e) => {
                  e.stopPropagation();
                  onQuoteClick!(mdMeta.senderName, mdMeta.content);
                }
              : undefined
          }
          title={mdClickable ? 'Xem tin nhắn gốc' : undefined}
          className={[
            'my-1.5 pl-2.5 py-1 border-l-2 text-xs rounded-r',
            'overflow-hidden line-clamp-2',
            'transition-all duration-150',
            mdClickable ? 'cursor-pointer select-none' : 'select-text',
            isDark
              ? `border-amber-500/80 bg-amber-500/10 text-slate-200${mdClickable ? ' hover:bg-amber-500/20 hover:border-amber-400' : ''}`
              : `border-amber-600/80 bg-amber-50 text-slate-700${mdClickable ? ' hover:bg-amber-100 hover:border-amber-500' : ''}`,
          ].join(' ')}
        >
          {parseInlineRichText(mdContent, `q-${idx}`)}
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

    // Bullet List Markdown
    const boldBulletMatch = trimmed.match(/^\*\*[-+*•\u2022]\s+([\s\S]+)\*\*$/);
    const isBulletLine =
      Boolean(boldBulletMatch) || /^[-+*•\u2022](?:\s|$)/.test(trimmed) || /^\*[-•]\s*/.test(trimmed);

    if (isBulletLine) {
      const itemContent = boldBulletMatch
        ? `**${boldBulletMatch[1]}**`
        : trimmed.replace(/^(\*[-•]\s*|[-+*•\u2022](?:\s+|$))/, '');
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
          <span className={`shrink-0 select-none font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>•</span>
          <span className="flex-1 break-words text-left">
            {itemContent ? parseInlineRichText(itemContent, `b-${idx}`) : <span className="opacity-0">&nbsp;</span>}
          </span>
        </div>
      );
      continue;
    }

    // Numbered List Markdown
    const boldNumMatch = trimmed.match(/^\*\*(\d+(?:\.\d+)*)\.\s+([\s\S]+)\*\*$/);
    const starNumMatch = trimmed.match(/^\*{1,3}(\d+(?:\.\d+)*)\.(?:\s+(.*)|$)/);
    const standardNumMatch = trimmed.match(/^(\d+(?:\.\d+)*)\.(?:\s+(.*)|$)/);

    const numMatch = boldNumMatch
      ? ([boldNumMatch[0], boldNumMatch[1], `**${boldNumMatch[2]}**`] as RegExpMatchArray)
      : starNumMatch
        ? ([starNumMatch[0], starNumMatch[1], starNumMatch[2] || ''] as RegExpMatchArray)
        : standardNumMatch;

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

    // Smart Section Label / Header: ***Nhãn: Nội dung hoặc **Nhãn: Nội dung
    const sectionLabelMatch = trimmed.match(/^(\*{2,3})\s*([^:\n]{1,40}:)\s*(.*)$/);
    if (sectionLabelMatch) {
      const label = sectionLabelMatch[2].trim();
      const body = sectionLabelMatch[3].trim();
      result.push(
        <div
          key={`sec-lbl-${idx}`}
          className="break-words leading-relaxed text-left select-text whitespace-pre-wrap my-0.5"
        >
          <strong className={isDark ? 'font-bold text-amber-300 drop-shadow-xs' : 'font-bold text-amber-800'}>
            {parseInlineRichText(label, `sec-lbl-l-${idx}`)}
          </strong>
          {body ? (
            <>
              {' '}
              <span>{parseInlineRichText(body, `sec-lbl-b-${idx}`)}</span>
            </>
          ) : null}
        </div>
      );
      continue;
    }

    // Smart Section Header: ***Tóm lại: hoặc **3. Tình trạng gói hiện tại:
    const sectionHeaderMatch = trimmed.match(/^(\*{2,3})\s*(.+?)(?:\s*\1)?$/);
    if (sectionHeaderMatch) {
      const headerText = sectionHeaderMatch[2].trim();
      result.push(
        <div
          key={`sec-head-${idx}`}
          className={
            isDark
              ? 'text-xs font-bold text-amber-300 drop-shadow-xs mt-2 mb-1 text-left select-text'
              : 'text-xs font-bold text-amber-800 mt-2 mb-1 text-left select-text'
          }
        >
          {parseInlineRichText(headerText, `sec-head-${idx}`)}
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
    if (isMermaidFence(codeBlockLang, codeContent)) {
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
}
