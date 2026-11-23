'use client';

import React from 'react';
import { ExternalLink, FileSpreadsheet, FileText, Palette } from 'lucide-react';
import type { ParsedGoogleWorkspaceLink } from '@mos-lab/shared';
import { openGoogleWorkspaceReader, useGoogleWorkspaceCachedMeta } from '../utils/google-workspace-bridge';

/**
 * Smart Chip phong cách Google Chat Workspace cho liên kết Google Sheets & Google Docs
 */
export const MosChatGoogleSmartChip: React.FC<{
  parsed: ParsedGoogleWorkspaceLink;
  customLabel?: string;
  isDark: boolean;
}> = React.memo(({ parsed, customLabel, isDark }) => {
  const cachedMeta = useGoogleWorkspaceCachedMeta(parsed.rawUrl);
  const isSheet = parsed.kind === 'spreadsheet';
  const isCanva = parsed.kind === 'canva';
  const cleanCustom = customLabel && !/^https?:\/\//i.test(customLabel.trim()) ? customLabel.trim() : null;
  const primaryLabel =
    cachedMeta?.title || cleanCustom || (isSheet ? 'Google Sheet' : isCanva ? 'Thiết kế Canva' : 'Google Docs');
  const rangeLabel = parsed.range || parsed.parsedRange?.label || null;

  return (
    <span
      data-google-workspace-chip="true"
      data-google-workspace-kind={parsed.kind}
      data-google-workspace-file-id={parsed.fileId}
      className={`inline-flex items-center gap-1 align-middle max-w-full rounded-lg border px-2 py-0.5 text-[12px] font-semibold transition-all shadow-xs ${
        isSheet
          ? isDark
            ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/25 hover:border-emerald-400/55'
            : 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
          : isCanva
            ? isDark
              ? 'bg-violet-500/15 border-violet-500/35 text-violet-200 hover:bg-violet-500/25 hover:border-violet-400/55'
              : 'bg-violet-50 border-violet-300 text-violet-900 hover:bg-violet-100'
            : isDark
              ? 'bg-sky-500/15 border-sky-500/35 text-sky-200 hover:bg-sky-500/25 hover:border-sky-400/55'
              : 'bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100'
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openGoogleWorkspaceReader({
            url: parsed.rawUrl,
            gid: parsed.gid,
            range: parsed.range,
            initialMode: isCanva ? 'embed' : 'fast',
          });
        }}
        title={`Đọc ${primaryLabel} ngay bên cạnh`}
        className="inline-flex items-center gap-1.5 min-w-0 cursor-pointer text-left leading-tight focus:outline-none"
      >
        {isSheet ? (
          <FileSpreadsheet size={13} className={`shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        ) : isCanva ? (
          <Palette size={13} className={`shrink-0 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
        ) : (
          <FileText size={13} className={`shrink-0 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
        )}
        <span className="truncate max-w-[230px]">{primaryLabel}</span>
        {cachedMeta?.tabTitle && (
          <span
            className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
              isDark ? 'bg-white/10 text-emerald-300' : 'bg-white text-emerald-700 border border-emerald-200'
            }`}
          >
            {cachedMeta.tabTitle}
          </span>
        )}
        {isCanva && cachedMeta?.designType && (
          <span
            className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
              isDark ? 'bg-violet-400/20 text-violet-200' : 'bg-white text-violet-700 border border-violet-200'
            }`}
          >
            {cachedMeta.designType}
          </span>
        )}
        {rangeLabel && (
          <span
            className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-extrabold tabular-nums shrink-0 ${
              isDark
                ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            {rangeLabel}
          </span>
        )}
      </button>
      <a
        href={parsed.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={isCanva ? 'Mở liên kết gốc trên Canva' : 'Mở liên kết gốc trên Google'}
        title={isCanva ? 'Mở trên Canva' : 'Mở trên Google'}
        className={`inline-flex items-center justify-center p-0.5 rounded transition-opacity opacity-70 hover:opacity-100 shrink-0 ${
          isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
        }`}
      >
        <ExternalLink size={11} />
      </a>
    </span>
  );
});

MosChatGoogleSmartChip.displayName = 'MosChatGoogleSmartChip';
