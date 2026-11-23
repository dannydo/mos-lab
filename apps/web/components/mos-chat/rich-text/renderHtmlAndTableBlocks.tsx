import React from 'react';
import { Copy } from 'lucide-react';
import { message as antdMessage } from 'antd';
import { isStandardQuote, parseQuoteMeta } from '../utils/quoteUtils';
import { decodeHtmlEntities, isTableSeparatorLine, parseTableRowCells, type RichTextTableTheme } from './richTextUtils';

export interface HtmlAndTableBlockParams {
  lines: string[];
  startIdx: number;
  trimmed: string;
  isDark: boolean;
  tableTheme: RichTextTableTheme;
  onQuoteClick?: (senderName: string, quotedContent: string) => void;
  parseInlineRichText: (text: string, keyPrefix?: string, depth?: number) => React.ReactNode[];
}

export function tryRenderHtmlOrTableBlock({
  lines,
  startIdx,
  trimmed,
  isDark,
  tableTheme,
  onQuoteClick,
  parseInlineRichText,
}: HtmlAndTableBlockParams): { node: React.ReactNode; nextIdx: number } | null {
  // Khối HTML <pre><code>...</code></pre>
  if (/^<pre[^>]*><code/i.test(trimmed)) {
    let cursor = startIdx;
    const preLines: string[] = [];
    while (cursor < lines.length) {
      preLines.push(lines[cursor]);
      if (/<\/code><\/pre>/i.test(lines[cursor])) break;
      cursor++;
    }
    const fullPre = preLines.join('\n');
    const preMatch = fullPre.match(
      /^<pre[^>]*><code(?:\s+class=["'](?:language-)?([a-z0-9_-]+)["'])?[^>]*>([\s\S]+?)<\/code><\/pre>$/i
    );
    if (preMatch) {
      const lang = preMatch[1] || 'Code';
      const codeText = decodeHtmlEntities(preMatch[2]);
      return {
        nextIdx: cursor,
        node: (
          <div
            key={`html-cb-${cursor}`}
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
        ),
      };
    }
  }

  // Khối HTML Table: <table ...> ... </table>
  if (/^<table\b/i.test(trimmed)) {
    let cursor = startIdx;
    const tableLines: string[] = [];
    while (cursor < lines.length) {
      tableLines.push(lines[cursor]);
      if (/<\/table>/i.test(lines[cursor])) break;
      cursor++;
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
      return {
        nextIdx: cursor,
        node: (
          <div
            key={`html-table-${cursor}`}
            className={`my-3 max-w-full overflow-x-auto rounded-xl border shadow-sm ${tableTheme.wrapper}`}
          >
            <table className={`w-full min-w-full text-xs divide-y border-collapse ${tableTheme.divider}`}>
              {thList.length > 0 && (
                <thead className={`font-bold sticky top-0 ${tableTheme.thead}`}>
                  <tr>
                    {thList.map((h, hIdx) => (
                      <th
                        key={`html-th-${cursor}-${hIdx}`}
                        className={`px-3.5 py-2.5 font-bold tracking-wide text-[11.5px] min-w-[110px] leading-snug break-words text-left ${tableTheme.th}`}
                      >
                        {parseInlineRichText(h, `hth-${cursor}-${hIdx}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className={`divide-y ${tableTheme.divider}`}>
                {rows.map((row, rIdx) => (
                  <tr key={`html-tr-${cursor}-${rIdx}`} className={`transition-colors ${tableTheme.trEven}`}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={`html-td-${cursor}-${rIdx}-${cIdx}`}
                        className={`px-3.5 py-2.5 text-[12px] leading-relaxed align-top break-words min-w-[120px] text-left ${tableTheme.td}`}
                      >
                        {parseInlineRichText(cell, `htd-${cursor}-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      };
    }
  }

  // Khối Markdown Tables (| col | col |) hỗ trợ căn lề :---, :---:, ---: và thẻ <br>
  if (trimmed.includes('|') && startIdx + 1 < lines.length && isTableSeparatorLine(lines[startIdx + 1])) {
    const headerCells = parseTableRowCells(trimmed);
    const separatorLine = lines[startIdx + 1];
    const rawAlignments = parseTableRowCells(separatorLine).map((col) => {
      const startColon = col.startsWith(':');
      const endColon = col.endsWith(':');
      if (startColon && endColon) return 'text-center';
      if (endColon) return 'text-right';
      return 'text-left';
    });

    let cursor = startIdx + 2;
    const rows: string[][] = [];

    while (cursor < lines.length) {
      const rowTrimmed = lines[cursor].trim();
      if (!rowTrimmed || rowTrimmed.startsWith('```') || rowTrimmed.startsWith('#') || rowTrimmed.startsWith('>')) {
        break;
      }
      if (!rowTrimmed.includes('|')) {
        break;
      }
      rows.push(parseTableRowCells(rowTrimmed));
      cursor++;
    }
    cursor--;

    return {
      nextIdx: cursor,
      node: (
        <div
          key={`table-${cursor}`}
          className={`my-3 max-w-full overflow-x-auto rounded-xl border shadow-sm ${tableTheme.wrapper}`}
        >
          <table className={`w-full min-w-full text-xs divide-y border-collapse ${tableTheme.divider}`}>
            <thead className={`font-bold sticky top-0 ${tableTheme.thead}`}>
              <tr>
                {headerCells.map((h, hIdx) => {
                  const alignClass = rawAlignments[hIdx] || 'text-left';
                  const parsedHeader = parseInlineRichText(h, `th-${cursor}-${hIdx}`);
                  return (
                    <th
                      key={`th-${cursor}-${hIdx}`}
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
                <tr key={`tr-${cursor}-${rIdx}`} className={`transition-colors ${tableTheme.trEven}`}>
                  {row.map((cell, cIdx) => {
                    const alignClass = rawAlignments[cIdx] || 'text-left';
                    const parsedCell = parseInlineRichText(cell, `td-${cursor}-${rIdx}-${cIdx}`);
                    return (
                      <td
                        key={`td-${cursor}-${rIdx}-${cIdx}`}
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
      ),
    };
  }

  // Khối danh sách HTML: <ul ...> ... </ul> hoặc <ol ...> ... </ol>
  if (/^<(?:ul|ol)\b/i.test(trimmed)) {
    const isOrdered = /^<ol\b/i.test(trimmed);
    let cursor = startIdx;
    const listLines: string[] = [];
    const endTag = isOrdered ? /<\/ol>/i : /<\/ul>/i;
    while (cursor < lines.length) {
      listLines.push(lines[cursor]);
      if (endTag.test(lines[cursor])) break;
      cursor++;
    }
    const listHtml = listLines.join('\n');
    const liMatches = Array.from(listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map((m) => m[1].trim());

    if (liMatches.length > 0) {
      return {
        nextIdx: cursor,
        node: (
          <div key={`html-list-${cursor}`} className="my-1.5 space-y-1">
            {liMatches.map((liText, liIdx) => (
              <div
                key={`html-li-${cursor}-${liIdx}`}
                className="flex items-start gap-1.5 text-xs text-left select-text"
              >
                {isOrdered ? (
                  <span
                    className={`shrink-0 tabular-nums select-none font-semibold text-[11.5px] min-w-[14px] ${
                      isDark ? 'text-amber-400 dark:text-amber-300' : 'text-amber-700'
                    }`}
                  >
                    {liIdx + 1}.
                  </span>
                ) : (
                  <span className={`shrink-0 select-none font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    •
                  </span>
                )}
                <span className="flex-1 break-words text-left">
                  {parseInlineRichText(liText, `hli-${cursor}-${liIdx}`)}
                </span>
              </div>
            ))}
          </div>
        ),
      };
    }
  }

  // Khối trích dẫn HTML: <blockquote ...> ... </blockquote>
  if (/^<blockquote\b/i.test(trimmed)) {
    let cursor = startIdx;
    const bqLines: string[] = [];
    while (cursor < lines.length) {
      bqLines.push(lines[cursor]);
      if (/<\/blockquote>/i.test(lines[cursor])) break;
      cursor++;
    }
    const bqHtml = bqLines
      .join('\n')
      .replace(/^<blockquote[^>]*>/i, '')
      .replace(/<\/blockquote>$/i, '')
      .trim();

    const bqQuoteLine = `> ${bqHtml}`;
    const bqMeta = isStandardQuote(bqQuoteLine) ? parseQuoteMeta(bqQuoteLine) : null;
    const bqClickable = Boolean(bqMeta && onQuoteClick);

    return {
      nextIdx: cursor,
      node: (
        <blockquote
          key={`html-quote-${cursor}`}
          onClick={
            bqClickable && bqMeta
              ? (e) => {
                  e.stopPropagation();
                  onQuoteClick!(bqMeta.senderName, bqMeta.content);
                }
              : undefined
          }
          title={bqClickable ? 'Xem tin nhắn gốc' : undefined}
          className={[
            'my-1.5 pl-2.5 py-1 border-l-2 text-xs rounded-r',
            'overflow-hidden line-clamp-2',
            'transition-all duration-150',
            bqClickable ? 'cursor-pointer select-none' : 'select-text',
            isDark
              ? `border-amber-500/80 bg-amber-500/10 text-slate-200${bqClickable ? ' hover:bg-amber-500/20 hover:border-amber-400' : ''}`
              : `border-amber-600/80 bg-amber-50 text-slate-700${bqClickable ? ' hover:bg-amber-100 hover:border-amber-500' : ''}`,
          ].join(' ')}
        >
          {parseInlineRichText(bqHtml, `hbq-${cursor}`)}
        </blockquote>
      ),
    };
  }

  return null;
}
