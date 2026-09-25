'use client';

import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Info, AlertTriangle, AlertCircle, Lightbulb, ShieldAlert } from 'lucide-react';
import { parseMarkdown, type BlockToken, type InlineToken, type ListItemToken } from './markdown-parser';

export interface RichTextViewerProps {
  content?: string | null;
  className?: string;
  compact?: boolean;
}

function renderInlineTokens(tokens: InlineToken[], keyPrefix = 'tok'): React.ReactNode {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (token.type) {
      case 'text':
        return <span key={key}>{token.content}</span>;
      case 'bold':
        return (
          <strong key={key} className="font-semibold text-inherit">
            {token.content}
          </strong>
        );
      case 'italic':
        return (
          <em key={key} className="italic text-inherit">
            {token.content}
          </em>
        );
      case 'bold_italic':
        return (
          <strong key={key} className="font-semibold italic text-inherit">
            {token.content}
          </strong>
        );
      case 'strikethrough':
        return (
          <del key={key} className="line-through opacity-70">
            {token.content}
          </del>
        );
      case 'code':
        return (
          <code
            key={key}
            className="rounded border border-slate-200/80 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.875em] text-pink-600 dark:border-slate-700/80 dark:bg-slate-800 dark:text-pink-400"
          >
            {token.content}
          </code>
        );
      case 'link':
        return (
          <a
            key={key}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <span>{token.text}</span>
            <ExternalLink className="inline h-3 w-3 shrink-0 opacity-70" />
          </a>
        );
      case 'soft_break':
        return <br key={key} />;
      default:
        return null;
    }
  });
}

function CodeBlockRenderer({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-900 text-slate-100 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400">
        <span className="font-mono uppercase tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          title="Sao chép mã"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const ALERT_CONFIG = {
  note: {
    icon: Info,
    title: 'Ghi chú',
    className:
      'border-blue-500/40 bg-blue-50/50 text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/20 dark:text-blue-100',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  tip: {
    icon: Lightbulb,
    title: 'Mẹo hay',
    className:
      'border-emerald-500/40 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-100',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  important: {
    icon: AlertCircle,
    title: 'Quan trọng',
    className:
      'border-purple-500/40 bg-purple-50/50 text-purple-950 dark:border-purple-500/30 dark:bg-purple-950/20 dark:text-purple-100',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  warning: {
    icon: AlertTriangle,
    title: 'Cảnh báo',
    className:
      'border-amber-500/40 bg-amber-50/50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  caution: {
    icon: ShieldAlert,
    title: 'Lưu ý rủi ro',
    className:
      'border-rose-500/40 bg-rose-50/50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-100',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
};

function renderBlock(block: BlockToken, index: number, compact: boolean): React.ReactNode {
  const key = `block-${index}`;

  switch (block.type) {
    case 'heading': {
      const inline = renderInlineTokens(block.tokens, `${key}-h`);
      switch (block.level) {
        case 1:
          return (
            <h1
              key={key}
              className="mb-2 mt-4 text-xl font-bold tracking-tight text-slate-900 first:mt-0 dark:text-slate-100"
            >
              {inline}
            </h1>
          );
        case 2:
          return (
            <h2
              key={key}
              className="mb-2 mt-3.5 text-lg font-bold tracking-tight text-slate-900 first:mt-0 dark:text-slate-100"
            >
              {inline}
            </h2>
          );
        case 3:
          return (
            <h3 key={key} className="mb-1.5 mt-3 text-base font-semibold text-slate-900 first:mt-0 dark:text-slate-100">
              {inline}
            </h3>
          );
        default:
          return (
            <h4 key={key} className="mb-1 mt-2.5 text-sm font-semibold text-slate-800 first:mt-0 dark:text-slate-200">
              {inline}
            </h4>
          );
      }
    }

    case 'paragraph': {
      return (
        <p
          key={key}
          className={`text-slate-800 dark:text-slate-200 ${compact ? 'mb-1.5' : 'mb-2.5'} leading-relaxed last:mb-0`}
        >
          {renderInlineTokens(block.tokens, `${key}-p`)}
        </p>
      );
    }

    case 'list': {
      const isTaskList = block.items.some((item) => item.checked !== undefined);

      if (block.ordered) {
        return (
          <ol
            key={key}
            start={block.start}
            className={`list-decimal space-y-1.5 pl-5 ${compact ? 'mb-2' : 'mb-3'} text-slate-800 dark:text-slate-200 last:mb-0`}
          >
            {block.items.map((item, itemIdx) => (
              <li key={`${key}-item-${itemIdx}`} className="leading-relaxed">
                {renderInlineTokens(item.tokens, `${key}-item-${itemIdx}`)}
              </li>
            ))}
          </ol>
        );
      }

      if (isTaskList) {
        return (
          <ul key={key} className={`space-y-1.5 ${compact ? 'mb-2' : 'mb-3'} list-none pl-1 last:mb-0`}>
            {block.items.map((item, itemIdx) => {
              const isChecked = item.checked === true;
              return (
                <li key={`${key}-task-${itemIdx}`} className="flex items-start gap-2 leading-relaxed">
                  <span
                    className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isChecked
                        ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
                        : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <span className={isChecked ? 'line-through opacity-70' : 'text-slate-800 dark:text-slate-200'}>
                    {renderInlineTokens(item.tokens, `${key}-task-${itemIdx}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        );
      }

      return (
        <ul
          key={key}
          className={`list-disc space-y-1.5 pl-5 ${compact ? 'mb-2' : 'mb-3'} text-slate-800 dark:text-slate-200 last:mb-0`}
        >
          {block.items.map((item, itemIdx) => (
            <li key={`${key}-item-${itemIdx}`} className="leading-relaxed">
              {renderInlineTokens(item.tokens, `${key}-item-${itemIdx}`)}
            </li>
          ))}
        </ul>
      );
    }

    case 'blockquote': {
      if (block.alertType && ALERT_CONFIG[block.alertType]) {
        const config = ALERT_CONFIG[block.alertType];
        const Icon = config.icon;
        return (
          <div
            key={key}
            className={`my-3 flex items-start gap-2.5 rounded-lg border p-3 text-sm leading-relaxed ${config.className}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`} />
            <div className="flex-1">
              <strong className="mb-0.5 block font-semibold">{config.title}</strong>
              <div>{renderInlineTokens(block.tokens, `${key}-alert`)}</div>
            </div>
          </div>
        );
      }

      return (
        <blockquote
          key={key}
          className="my-3 rounded-r-lg border-l-4 border-slate-300 bg-slate-50/70 py-1.5 pl-3.5 pr-3 italic text-slate-700 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-300"
        >
          {renderInlineTokens(block.tokens, `${key}-quote`)}
        </blockquote>
      );
    }

    case 'code_block':
      return <CodeBlockRenderer key={key} language={block.language} code={block.code} />;

    case 'table':
      return (
        <div key={key} className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                {block.headers.map((headerTokens, hIdx) => {
                  const align = block.alignments[hIdx] || 'left';
                  return (
                    <th
                      key={`${key}-th-${hIdx}`}
                      className={`px-3 py-2 ${
                        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {renderInlineTokens(headerTokens, `${key}-th-${hIdx}`)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {block.rows.map((row, rIdx) => (
                <tr key={`${key}-tr-${rIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  {row.map((cellTokens, cIdx) => {
                    const align = block.alignments[cIdx] || 'left';
                    return (
                      <td
                        key={`${key}-td-${rIdx}-${cIdx}`}
                        className={`px-3 py-2 text-slate-800 dark:text-slate-200 ${
                          align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {renderInlineTokens(cellTokens, `${key}-td-${rIdx}-${cIdx}`)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'thematic_break':
      return <hr key={key} className="my-4 border-t border-slate-200 dark:border-slate-800" />;

    default:
      return null;
  }
}

export function RichTextViewer({ content, className = '', compact = false }: RichTextViewerProps) {
  if (!content || !content.trim()) {
    return null;
  }

  const blocks = parseMarkdown(content);

  // If content is simple single-line without markdown elements, render directly to keep DOM concise
  if (blocks.length === 1 && blocks[0].type === 'paragraph' && !content.includes('\n')) {
    if (blocks[0].tokens.length === 1 && blocks[0].tokens[0].type === 'text') {
      return <div className={`rich-text-content ${className}`}>{blocks[0].tokens[0].content}</div>;
    }
    return (
      <div className={`rich-text-content ${className}`}>
        <p className="m-0 leading-relaxed text-slate-800 dark:text-slate-200">
          {renderInlineTokens(blocks[0].tokens, 'single-p')}
        </p>
      </div>
    );
  }

  return (
    <div className={`rich-text-content ${className}`}>
      {blocks.map((block, idx) => renderBlock(block, idx, compact))}
    </div>
  );
}
