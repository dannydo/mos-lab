'use client';

import React, { useMemo, useState } from 'react';
import {
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  MapPin,
  PanelRightOpen,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Tooltip, message as antdMessage } from 'antd';
import {
  columnIndexToLetter,
  extractGoogleWorkspaceLinksFromText,
  type ParsedGoogleWorkspaceLink,
  type ParsedGoogleWorkspaceRange,
} from '@mos-lab/shared';
import { openGoogleWorkspaceReader, useGoogleWorkspacePreview } from '../utils/google-workspace-bridge';

export interface MosChatGoogleWorkspaceCardProps {
  link: ParsedGoogleWorkspaceLink;
  conversationId?: string;
  messageId?: string;
  isDark: boolean;
  isMe?: boolean;
  compact?: boolean;
}

function isCellHighlighted(
  rowNumber: number,
  colIndex: number,
  parsedRange?: ParsedGoogleWorkspaceRange | null
): boolean {
  if (!parsedRange) return false;
  return (
    rowNumber >= parsedRange.startRow &&
    rowNumber <= parsedRange.endRow &&
    colIndex >= parsedRange.startCol &&
    colIndex <= parsedRange.endCol
  );
}

export const MosChatGoogleWorkspaceCard: React.FC<MosChatGoogleWorkspaceCardProps> = React.memo(
  ({ link, conversationId, messageId, isDark, compact = false }) => {
    const [selectedGid, setSelectedGid] = useState<string | null | undefined>(link.gid);
    const [copiedBotEmail, setCopiedBotEmail] = useState(false);

    const { data, loading, error, reload } = useGoogleWorkspacePreview(link.rawUrl, {
      gid: selectedGid,
      range: link.range,
      conversationId,
      messageId,
      enabled: true,
    });

    const isSheet = link.kind === 'spreadsheet';
    const effectiveRange = data?.parsedRange || link.parsedRange || null;
    const effectiveRangeLabel = data?.requestedRange || link.range || effectiveRange?.label || null;
    const displayTitle = data?.title || (isSheet ? 'Google Sheets' : 'Google Docs');
    const accessStatus = data?.accessStatus;

    const previewGrid = useMemo(() => {
      if (!isSheet || !data?.activeTab) return null;
      const tab = data.activeTab;
      const colStart = tab.snippetColStart ?? 0;
      const snippetRows =
        tab.snippetRows && tab.snippetRows.length > 0
          ? tab.snippetRows.slice(0, compact ? 3 : 4)
          : (tab.rows || []).slice(0, compact ? 3 : 4).map((cells, idx) => ({
              rowNumber: (tab.snippetRowStart || 1) + idx,
              cells: cells.slice(colStart, colStart + 5),
            }));
      if (snippetRows.length === 0) return null;
      const maxCols = Math.max(
        1,
        Math.min(5, tab.snippetColHeaders?.length || 0, ...snippetRows.map((r) => r.cells.length))
      );
      const colHeaders = Array.from({ length: maxCols }, (_, idx) => {
        if (tab.snippetColHeaders && tab.snippetColHeaders[idx]) {
          return tab.snippetColHeaders[idx];
        }
        return columnIndexToLetter(colStart + idx);
      });
      return {
        colStart,
        colHeaders,
        rows: snippetRows,
      };
    }, [isSheet, data?.activeTab, compact]);

    const handleCopyBotEmail = async (email: string) => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(email);
        }
        setCopiedBotEmail(true);
        antdMessage.success(`Đã sao chép email mOS Bot: ${email}`);
        setTimeout(() => setCopiedBotEmail(false), 2500);
      } catch {
        antdMessage.error('Không thể sao chép email vào clipboard');
      }
    };

    const cardBorder = isSheet
      ? isDark
        ? 'rgba(16, 185, 129, 0.32)'
        : 'rgba(16, 185, 129, 0.35)'
      : isDark
        ? 'rgba(56, 189, 248, 0.32)'
        : 'rgba(14, 165, 233, 0.35)';

    const cardBg = isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.94)';
    const headerBg = isSheet
      ? isDark
        ? 'rgba(16, 185, 129, 0.12)'
        : 'rgba(236, 253, 245, 0.95)'
      : isDark
        ? 'rgba(56, 189, 248, 0.12)'
        : 'rgba(240, 249, 255, 0.95)';

    return (
      <div
        data-testid="google-workspace-preview-card"
        data-google-workspace-kind={link.kind}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 rounded-xl overflow-hidden shadow-sm transition-colors text-left select-text max-w-full"
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
        }}
      >
        {/* Header Bar */}
        <div
          className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap"
          style={{
            background: headerBg,
            borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(203, 213, 225, 0.7)'}`,
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isSheet
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-emerald-100 text-emerald-700'
                  : isDark
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-sky-100 text-sky-700'
              }`}
            >
              {isSheet ? <FileSpreadsheet size={15} /> : <FileText size={15} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    openGoogleWorkspaceReader({
                      url: link.rawUrl,
                      gid: selectedGid,
                      range: link.range,
                      conversationId,
                      messageId,
                      initialMode: 'fast',
                    })
                  }
                  className={`text-[12.5px] font-bold truncate cursor-pointer hover:underline text-left ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  {displayTitle}
                </button>
                {accessStatus === 'PUBLIC_LINK' && (
                  <span
                    className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      isDark
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    Công khai
                  </span>
                )}
                {accessStatus === 'SERVICE_ACCOUNT' && (
                  <span
                    className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      isDark
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    Nội bộ Wings
                  </span>
                )}
              </div>
              <div
                className={`text-[11px] flex items-center gap-2 mt-0.5 flex-wrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <span>{isSheet ? 'Google Sheets' : 'Google Docs'}</span>
                {data?.activeTab?.title && (
                  <span className="font-semibold text-emerald-500">· Tab: {data.activeTab.title}</span>
                )}
                {effectiveRangeLabel && (
                  <span
                    className={`inline-flex items-center gap-0.5 leading-none px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                      isDark
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    <MapPin size={9} />
                    <span>{effectiveRangeLabel}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Tooltip title="Mở trình đọc Google Workspace bên cạnh khung chat">
              <button
                type="button"
                onClick={() =>
                  openGoogleWorkspaceReader({
                    url: link.rawUrl,
                    gid: selectedGid,
                    range: link.range,
                    conversationId,
                    messageId,
                    initialMode: 'fast',
                  })
                }
                className={`inline-flex items-center justify-center gap-1 leading-none px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                  isSheet
                    ? isDark
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : isDark
                      ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                <PanelRightOpen size={12} />
                <span>Đọc bên cạnh</span>
              </button>
            </Tooltip>

            <Tooltip title="Hỏi @AI phân tích tài liệu này">
              <button
                type="button"
                onClick={() =>
                  openGoogleWorkspaceReader({
                    url: link.rawUrl,
                    gid: selectedGid,
                    range: link.range,
                    conversationId,
                    messageId,
                    initialMode: 'fast',
                    openAiBar: true,
                    initialAiPrompt: isSheet
                      ? `Phân tích ngắn gọn dữ liệu tab ${data?.activeTab?.title || 'hiện tại'}${effectiveRangeLabel ? ` (đặc biệt vùng ${effectiveRangeLabel})` : ''} và nêu các điểm cần lưu ý.`
                      : 'Tóm tắt các ý chính và đầu việc quan trọng trong tài liệu Google Docs này.',
                  })
                }
                className={`inline-flex items-center justify-center gap-1 leading-none px-2 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition-colors ${
                  isDark
                    ? 'bg-purple-500/20 border-purple-400/40 text-purple-200 hover:bg-purple-500/30'
                    : 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100'
                }`}
              >
                <Sparkles size={11} />
                <span>Hỏi AI</span>
              </button>
            </Tooltip>

            <Tooltip title="Mở trực tiếp trên Google">
              <a
                href={data?.canonicalUrl || link.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Mở trực tiếp trên Google"
                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
                  isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-white/10'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ExternalLink size={12} />
              </a>
            </Tooltip>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-2.5 space-y-2">
          {loading && !data && (
            <div
              className={`flex items-center gap-2 py-2 px-1 text-[11.5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <Loader2 size={14} className="animate-spin text-emerald-500" />
              <span>Đang đọc dữ liệu trực tiếp từ Google Workspace...</span>
            </div>
          )}

          {error && !data && (
            <div className="flex items-center justify-between gap-2 text-[11.5px] text-rose-400 px-1 py-1">
              <span className="truncate">{error}</span>
              <button
                type="button"
                onClick={() => void reload(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-500/30 hover:bg-rose-500/10 cursor-pointer shrink-0 font-semibold"
              >
                <RefreshCw size={11} />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* NEEDS_SHARE Zero-Friction Prompt */}
          {data && accessStatus === 'NEEDS_SHARE' && (
            <div
              className={`rounded-lg p-2.5 space-y-2 border ${
                isDark
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                <Lock size={14} className="shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <div className="font-bold">Tài liệu đang bật chế độ riêng tư</div>
                  <div className={isDark ? 'text-amber-200/80' : 'text-amber-900/80'}>
                    Để xem trực tiếp trong mOS Chat mà không cần đăng nhập từng tài khoản Google, hãy chia sẻ quyền Xem
                    cho mOS Bot:
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-[11px] font-mono ${
                  isDark ? 'bg-slate-950/60 border-amber-500/25' : 'bg-white border-amber-300'
                }`}
              >
                <span className="truncate select-all">{data.serviceAccountEmail}</span>
                <button
                  type="button"
                  onClick={() => void handleCopyBotEmail(data.serviceAccountEmail)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-sans font-bold cursor-pointer shrink-0 ${
                    isDark
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  <Copy size={11} />
                  <span>{copiedBotEmail ? 'Đã sao chép' : 'Sao chép email mOS Bot'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={data.canonicalUrl || link.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                    isDark
                      ? 'border-amber-400/35 text-amber-200 hover:bg-amber-500/15'
                      : 'border-amber-400 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <ExternalLink size={11} />
                  <span>Mở Google để chia sẻ</span>
                </a>
                <button
                  type="button"
                  onClick={() => void reload(true)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                    isDark
                      ? 'border-slate-700 text-slate-200 hover:bg-white/10'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                  <span>Thử tải lại</span>
                </button>
              </div>
            </div>
          )}

          {/* RESTRICTED_ROLE */}
          {data && accessStatus === 'RESTRICTED_ROLE' && (
            <div
              className={`rounded-lg p-2.5 flex items-start gap-2 border text-[11.5px] ${
                isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <ShieldAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 min-w-0">
                <div className="font-bold">Tài liệu nội bộ được bảo vệ theo vai trò (Điều răn UI-011)</div>
                <div className="opacity-85 mt-0.5">
                  {data.statusMessage ||
                    'Tài liệu nội bộ đọc qua Service Account chỉ mở xem khi quản lý/admin gửi trong phòng hoặc tài khoản của bạn có quyền xem.'}
                </div>
              </div>
            </div>
          )}

          {/* Sheet Tabs & Snippet Preview */}
          {data && isSheet && (accessStatus === 'PUBLIC_LINK' || accessStatus === 'SERVICE_ACCOUNT') && (
            <div className="space-y-2">
              {data.tabs && data.tabs.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {data.tabs.map((tab) => {
                    const isActiveTab = String(tab.gid) === String(data.activeTab?.gid || selectedGid || '');
                    return (
                      <button
                        key={tab.gid}
                        type="button"
                        onClick={() => setSelectedGid(tab.gid)}
                        className={`inline-flex items-center justify-center gap-1 leading-none px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer border transition-colors ${
                          isActiveTab
                            ? isDark
                              ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                              : 'bg-emerald-100 border-emerald-400 text-emerald-900'
                            : isDark
                              ? 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span className="truncate max-w-[140px]">{tab.title}</span>
                        {tab.rowCount != null && tab.rowCount > 0 && (
                          <span className="text-[9.5px] opacity-75 tabular-nums">({tab.rowCount})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {previewGrid && (
                <div
                  className="overflow-x-auto rounded-lg border"
                  style={{
                    borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.9)',
                  }}
                >
                  <table className="w-full border-collapse text-[11px] tabular-nums">
                    <thead>
                      <tr className={isDark ? 'bg-slate-900/90 text-slate-400' : 'bg-slate-100 text-slate-500'}>
                        <th className="w-8 px-1.5 py-1 text-center font-bold border-b border-r border-slate-500/20">
                          #
                        </th>
                        {previewGrid.colHeaders.map((letter) => (
                          <th
                            key={letter}
                            className="px-2 py-1 text-center font-bold border-b border-r last:border-r-0 border-slate-500/20"
                          >
                            {letter}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewGrid.rows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={
                            isDark
                              ? 'border-b last:border-b-0 border-slate-800 hover:bg-white/5'
                              : 'border-b last:border-b-0 border-slate-200 hover:bg-slate-50'
                          }
                        >
                          <td
                            className={`px-1.5 py-1 text-center font-semibold border-r border-slate-500/20 ${
                              isDark ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {row.rowNumber}
                          </td>
                          {previewGrid.colHeaders.map((letter, idx) => {
                            const absCol = previewGrid.colStart + idx;
                            const val = row.cells[idx] ?? '';
                            const highlighted = isCellHighlighted(row.rowNumber, absCol, effectiveRange);
                            return (
                              <td
                                key={`${row.rowNumber}-${letter}`}
                                data-highlighted-cell={highlighted ? 'true' : undefined}
                                title={`${letter}${row.rowNumber}: ${val}`}
                                className={`px-2 py-1 max-w-[160px] truncate border-r last:border-r-0 border-slate-500/15 ${
                                  highlighted
                                    ? isDark
                                      ? 'bg-amber-400/20 text-amber-100 font-bold ring-1 ring-inset ring-amber-400/80'
                                      : 'bg-amber-100 text-amber-950 font-bold ring-1 ring-inset ring-amber-500'
                                    : isDark
                                      ? 'text-slate-200'
                                      : 'text-slate-800'
                                }`}
                              >
                                {val || <span className="opacity-30">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Google Docs Headings & Excerpt Preview */}
          {data && !isSheet && (accessStatus === 'PUBLIC_LINK' || accessStatus === 'SERVICE_ACCOUNT') && (
            <div className="space-y-1.5">
              {data.headings && data.headings.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {data.headings.slice(0, 4).map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() =>
                        openGoogleWorkspaceReader({
                          url: link.rawUrl,
                          conversationId,
                          messageId,
                          initialMode: 'fast',
                        })
                      }
                      className={`inline-flex items-center leading-none px-2 py-1 rounded-md text-[10.5px] font-semibold border cursor-pointer truncate max-w-[180px] ${
                        isDark
                          ? 'bg-sky-500/15 border-sky-500/30 text-sky-200 hover:bg-sky-500/25'
                          : 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100'
                      }`}
                    >
                      {h.text}
                    </button>
                  ))}
                </div>
              )}
              {data.excerpt && (
                <div
                  className={`text-[11.5px] leading-relaxed line-clamp-3 rounded-lg p-2 border ${
                    isDark
                      ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {data.excerpt}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

MosChatGoogleWorkspaceCard.displayName = 'MosChatGoogleWorkspaceCard';

export interface MosChatGoogleWorkspaceCardListProps {
  text?: string | null;
  conversationId?: string;
  messageId?: string;
  isDark: boolean;
  isMe?: boolean;
  compact?: boolean;
}

export const MosChatGoogleWorkspaceCardList: React.FC<MosChatGoogleWorkspaceCardListProps> = React.memo(
  ({ text, conversationId, messageId, isDark, isMe, compact }) => {
    const links = useMemo(() => {
      if (!text || !text.includes('docs.google.com/')) return [];
      return extractGoogleWorkspaceLinksFromText(text).slice(0, 3);
    }, [text]);

    if (links.length === 0) return null;

    return (
      <div className="space-y-1.5 w-full">
        {links.map((link) => (
          <MosChatGoogleWorkspaceCard
            key={link.cacheKey}
            link={link}
            conversationId={conversationId}
            messageId={messageId}
            isDark={isDark}
            isMe={isMe}
            compact={compact}
          />
        ))}
      </div>
    );
  }
);

MosChatGoogleWorkspaceCardList.displayName = 'MosChatGoogleWorkspaceCardList';
