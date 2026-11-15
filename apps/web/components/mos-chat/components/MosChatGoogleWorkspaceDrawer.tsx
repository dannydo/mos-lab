'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  SendHorizontal,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Tooltip, message as antdMessage } from 'antd';
import { columnIndexToLetter, parseGoogleWorkspaceUrl, type ParsedGoogleWorkspaceRange } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { MosChatRichText } from '../MosChatRichText';
import {
  useGoogleWorkspaceOpenListener,
  useGoogleWorkspacePreview,
  type OpenGoogleWorkspaceReaderPayload,
} from '../utils/google-workspace-bridge';

export interface MosChatGoogleWorkspaceDrawerProps {
  isMobile?: boolean;
  isDark: boolean;
  activeConversationId?: string;
  surfaceBg?: string;
  surfaceRaised?: string;
  canvasBg?: string;
  borderColor?: string;
  onPostAiReplyToChat?: (replyText: string, docTitle: string) => void;
}

function isCellInRange(rowNumber: number, colIndex: number, range?: ParsedGoogleWorkspaceRange | null): boolean {
  if (!range) return false;
  return (
    rowNumber >= range.startRow && rowNumber <= range.endRow && colIndex >= range.startCol && colIndex <= range.endCol
  );
}

function highlightMatchText(text: string, query: string, isDark: boolean): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark
        key={idx}
        className={`px-0.5 rounded ${isDark ? 'bg-amber-400/30 text-amber-100' : 'bg-amber-200 text-amber-950'}`}
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

export const MosChatGoogleWorkspaceDrawer: React.FC<MosChatGoogleWorkspaceDrawerProps> = React.memo(
  ({
    isMobile = false,
    isDark,
    activeConversationId,
    surfaceBg,
    surfaceRaised,
    canvasBg,
    borderColor,
    onPostAiReplyToChat,
  }) => {
    const [open, setOpen] = useState(false);
    const [payload, setPayload] = useState<OpenGoogleWorkspaceReaderPayload | null>(null);
    const [readerMode, setReaderMode] = useState<'fast' | 'embed'>('fast');
    const [expandedWidth, setExpandedWidth] = useState(false);
    const [selectedGid, setSelectedGid] = useState<string | null | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCell, setSelectedCell] = useState<{
      address: string;
      value: string;
    } | null>(null);
    const [copiedBotEmail, setCopiedBotEmail] = useState(false);

    // Built-in AI Quick Bar state
    const [aiBarOpen, setAiBarOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiSessionId, setAiSessionId] = useState<string | undefined>(undefined);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const targetCellRef = useRef<HTMLTableCellElement | null>(null);
    const docBodyRef = useRef<HTMLDivElement | null>(null);
    const lastAutoScrolledKeyRef = useRef<string>('');

    const parsedUrl = useMemo(() => (payload?.url ? parseGoogleWorkspaceUrl(payload.url) : null), [payload?.url]);

    const runAiQuestion = useCallback(
      async (
        question: string,
        overridePayload?: OpenGoogleWorkspaceReaderPayload | null,
        docTitleFallback?: string
      ) => {
        const cleanQ = question.trim();
        const activePayload = overridePayload ?? payload;
        if (!cleanQ || !activePayload?.url) return;

        setAiBarOpen(true);
        setAiLoading(true);
        setAiError(null);
        try {
          const convId = activePayload.conversationId || activeConversationId;
          const composedMessage = `${cleanQ}\n\nLiên kết tài liệu đang mở (${docTitleFallback || 'Google Workspace'}): ${activePayload.url}`;
          const res = await apiClient.ai.sendMessage({
            sessionId: aiSessionId,
            message: composedMessage,
            scope: convId ? `mos-chat-space:${convId}` : 'mos-chat-private',
            context: {
              page: 'mos-chat-google-workspace-reader',
            },
          });
          setAiSessionId(res.sessionId);
          setAiAnswer(res.message?.content || 'AI không trả về nội dung.');
        } catch (err: unknown) {
          setAiError(err instanceof Error ? err.message : 'Không thể kết nối @AI lúc này. Vui lòng thử lại.');
        } finally {
          setAiLoading(false);
        }
      },
      [payload, activeConversationId, aiSessionId]
    );

    useGoogleWorkspaceOpenListener((nextPayload) => {
      setPayload(nextPayload);
      setOpen(true);
      setReaderMode(nextPayload.initialMode || 'fast');
      setSelectedGid(nextPayload.gid ?? parseGoogleWorkspaceUrl(nextPayload.url)?.gid);
      setSearchQuery('');
      setSelectedCell(null);
      setAiAnswer(null);
      setAiError(null);
      setAiSessionId(undefined);
      lastAutoScrolledKeyRef.current = '';

      if (nextPayload.openAiBar || nextPayload.initialAiPrompt) {
        setAiBarOpen(true);
        if (nextPayload.initialAiPrompt) {
          setAiPrompt(nextPayload.initialAiPrompt);
          void runAiQuestion(nextPayload.initialAiPrompt, nextPayload);
        }
      } else {
        setAiBarOpen(false);
        setAiPrompt('');
      }
    });

    const { data, loading, error, reload } = useGoogleWorkspacePreview(payload?.url, {
      gid: selectedGid,
      range: payload?.range ?? parsedUrl?.range,
      conversationId: payload?.conversationId || activeConversationId,
      messageId: payload?.messageId,
      enabled: open && Boolean(payload?.url),
    });

    const isSheet = (data?.kind || parsedUrl?.kind) === 'spreadsheet';
    const effectiveRange = data?.parsedRange || parsedUrl?.parsedRange || null;
    const effectiveRangeLabel =
      data?.requestedRange || payload?.range || parsedUrl?.range || effectiveRange?.label || null;

    // Derive full grid with row numbers
    const sheetGrid = useMemo(() => {
      if (!isSheet || !data?.activeTab) return null;
      const tab = data.activeTab;
      const rawRows = tab.rows || [];
      const rowOffset =
        tab.snippetRowStart && tab.snippetRowStart > 1 && rawRows.length <= 20 ? tab.snippetRowStart : 1;
      const colCount = Math.max(
        1,
        Math.min(
          26,
          tab.totalCols || 0,
          ...rawRows.map((r) => r.length),
          effectiveRange ? effectiveRange.endCol + 1 : 0
        )
      );
      const colLetters = Array.from({ length: colCount }, (_, i) => columnIndexToLetter(i));
      const needle = searchQuery.trim().toLowerCase();

      const indexedRows = rawRows.map((cells, idx) => ({
        rowNumber: rowOffset + idx,
        cells,
      }));

      const visibleRows = needle
        ? indexedRows.filter((row) =>
            row.cells.some((c) =>
              String(c || '')
                .toLowerCase()
                .includes(needle)
            )
          )
        : indexedRows;

      return {
        colCount,
        colLetters,
        totalRows: indexedRows.length,
        visibleRows,
        truncated: Boolean(tab.truncated),
      };
    }, [isSheet, data?.activeTab, searchQuery, effectiveRange]);

    const scrollToTargetRange = useCallback(() => {
      const el = targetCellRef.current;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, []);

    // Auto-scroll to highlighted anchor cell (e.g. D17) on open/tab load
    useEffect(() => {
      if (!open || readerMode !== 'fast' || !isSheet || !data?.activeTab || !effectiveRange) return;
      const scrollKey = `${data.fileId}:${data.activeTab.gid}:${effectiveRange.label}`;
      if (lastAutoScrolledKeyRef.current === scrollKey) return;
      const anchorVal = data.activeTab.rows?.[effectiveRange.startRow - 1]?.[effectiveRange.startCol] ?? '';
      setSelectedCell({
        address: effectiveRange.anchorCell,
        value: anchorVal,
      });
      const timer = setTimeout(() => {
        scrollToTargetRange();
        lastAutoScrolledKeyRef.current = scrollKey;
      }, 120);
      return () => clearTimeout(timer);
    }, [open, readerMode, isSheet, data, effectiveRange, scrollToTargetRange]);

    const handleCopyText = async (textToCopy: string, label: string) => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(textToCopy);
        }
        antdMessage.success(label);
      } catch {
        antdMessage.error('Không thể sao chép vào clipboard');
      }
    };

    const handleCopyBotEmail = async (email: string) => {
      await handleCopyText(email, `Đã sao chép email mOS Bot: ${email}`);
      setCopiedBotEmail(true);
      setTimeout(() => setCopiedBotEmail(false), 2500);
    };

    if (!open || !payload) return null;

    const bgSurface = surfaceBg || (isDark ? '#0f172a' : '#ffffff');
    const bgRaised = surfaceRaised || (isDark ? '#1e293b' : '#f8fafc');
    const bgCanvas = canvasBg || (isDark ? '#020617' : '#f1f5f9');
    const bColor = borderColor || (isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(203, 213, 225, 0.9)');
    const docTitle = data?.title || (isSheet ? 'Google Sheets' : 'Google Docs');
    const canonicalHref = data?.canonicalUrl || parsedUrl?.canonicalUrl || payload.url;
    const embedHref = data?.embedUrl || parsedUrl?.embedUrl || payload.url;

    const containerClass = isMobile
      ? 'fixed inset-0 z-[1300] flex flex-col w-full h-[100dvh]'
      : 'flex flex-col shrink-0 h-full relative';

    const containerStyle: React.CSSProperties = isMobile
      ? { background: bgSurface, color: isDark ? '#f8fafc' : '#0f172a' }
      : {
          width: expandedWidth ? 'min(64vw, 880px)' : 'min(48vw, 560px)',
          minWidth: 380,
          background: bgSurface,
          borderLeft: `1px solid ${bColor}`,
          color: isDark ? '#f8fafc' : '#0f172a',
          transition: 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        };

    return (
      <aside
        data-testid="google-workspace-split-drawer"
        aria-label="Trình đọc tài liệu Google Workspace"
        className={containerClass}
        style={containerStyle}
      >
        {/* TOP HEADER: Title on LEFT, Mode Switch + Controls + [X] Close strictly on RIGHT */}
        <div
          className="h-[52px] px-3 flex items-center justify-between gap-2 shrink-0"
          style={{
            background: bgRaised,
            borderBottom: `1px solid ${bColor}`,
          }}
        >
          {/* Left: Document Icon & Title */}
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
              <div className="text-[12.5px] font-extrabold truncate">{docTitle}</div>
              <div className="text-[10.5px] opacity-75 flex items-center gap-1.5 truncate tabular-nums">
                <span>{isSheet ? 'Google Sheets' : 'Google Docs'}</span>
                {data?.activeTab?.title && <span>· {data.activeTab.title}</span>}
                {effectiveRangeLabel && <span className="font-bold text-amber-500">· {effectiveRangeLabel}</span>}
              </div>
            </div>
          </div>

          {/* Right: Dual-Mode Switcher, Width Toggle, External Link, Close [X] at End */}
          <div className="flex items-center gap-1 shrink-0">
            <div
              className="flex items-center gap-0.5 p-0.5 rounded-lg"
              style={{ background: bgCanvas, border: `1px solid ${bColor}` }}
            >
              <button
                type="button"
                onClick={() => setReaderMode('fast')}
                className={`inline-flex items-center justify-center gap-1 leading-none px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition-colors ${
                  readerMode === 'fast'
                    ? isDark
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-emerald-600 text-white'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Zap size={11} />
                <span>Đọc nhanh mOS</span>
              </button>
              <button
                type="button"
                onClick={() => setReaderMode('embed')}
                className={`inline-flex items-center justify-center gap-1 leading-none px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition-colors ${
                  readerMode === 'embed'
                    ? isDark
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-sky-600 text-white'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Globe size={11} />
                <span>Google Trực tiếp</span>
              </button>
            </div>

            {!isMobile && (
              <Tooltip title={expandedWidth ? 'Thu chuẩn độ rộng' : 'Mở rộng khung đọc'}>
                <button
                  type="button"
                  aria-label={expandedWidth ? 'Thu chuẩn độ rộng' : 'Mở rộng khung đọc'}
                  onClick={() => setExpandedWidth((v) => !v)}
                  className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                >
                  {expandedWidth ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </Tooltip>
            )}

            <Tooltip title="Mở trên Google">
              <a
                href={canonicalHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Mở trên Google"
                className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
              >
                <ExternalLink size={14} />
              </a>
            </Tooltip>

            <Tooltip title="Đóng trình đọc tài liệu">
              <button
                type="button"
                aria-label="Đóng trình đọc tài liệu"
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 hover:text-rose-400"
              >
                <X size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* SUB-TOOLBAR (Fast Reader Search / Refresh / Range Jump / Ask AI Toggle) */}
        <div
          className="px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap shrink-0"
          style={{ background: bgSurface, borderBottom: `1px solid ${bColor}` }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
            {readerMode === 'fast' && (
              <div className="relative flex-1 max-w-[260px]">
                <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-55" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isSheet ? 'Lọc nhanh dòng, mã hàng...' : 'Tìm trong tài liệu...'}
                  aria-label="Tìm kiếm trong tài liệu"
                  className="w-full h-7 pl-7 pr-2 rounded-md text-[11.5px] focus:outline-none"
                  style={{
                    background: bgRaised,
                    border: `1px solid ${bColor}`,
                  }}
                />
              </div>
            )}

            {readerMode === 'fast' && isSheet && effectiveRangeLabel && (
              <button
                type="button"
                onClick={scrollToTargetRange}
                className={`inline-flex items-center gap-1 leading-none px-2 py-1.5 rounded-md text-[11px] font-bold tabular-nums cursor-pointer border ${
                  isDark
                    ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 hover:bg-amber-400/30'
                    : 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200'
                }`}
              >
                <MapPin size={11} />
                <span>Đang trỏ: {effectiveRangeLabel}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void reload(true)}
              disabled={loading}
              className="inline-flex items-center gap-1 leading-none px-2 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer border hover:bg-black/5 dark:hover:bg-white/10"
              style={{ borderColor: bColor }}
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => setAiBarOpen((v) => !v)}
              className={`inline-flex items-center gap-1 leading-none px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer border transition-colors ${
                aiBarOpen
                  ? isDark
                    ? 'bg-purple-500 text-white border-purple-400'
                    : 'bg-purple-600 text-white border-purple-600'
                  : isDark
                    ? 'bg-purple-500/20 border-purple-400/45 text-purple-200 hover:bg-purple-500/30'
                    : 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100'
              }`}
            >
              <Sparkles size={11} />
              <span>Hỏi @AI</span>
            </button>
          </div>
        </div>

        {/* COLLAPSIBLE BUILT-IN AI QUICK BAR */}
        {aiBarOpen && (
          <div
            data-testid="gw-reader-ai-bar"
            className="p-3 space-y-2 shrink-0"
            style={{
              background: isDark ? 'rgba(88, 28, 135, 0.16)' : 'rgba(243, 232, 255, 0.85)',
              borderBottom: `1px solid ${bColor}`,
            }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => {
                  const q = 'Tóm tắt nhanh các nội dung chính và điểm cần chú ý trong tài liệu này.';
                  setAiPrompt(q);
                  void runAiQuestion(q, payload, docTitle);
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer border ${
                  isDark
                    ? 'bg-purple-500/25 border-purple-400/40 text-purple-100 hover:bg-purple-500/35'
                    : 'bg-white border-purple-300 text-purple-900 hover:bg-purple-50'
                }`}
              >
                <Sparkles size={10} />
                <span>Tóm tắt tài liệu</span>
              </button>

              {isSheet && (
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => {
                    const tabLabel = data?.activeTab?.title || 'hiện tại';
                    const q = `Phân tích số liệu trên tab "${tabLabel}"${effectiveRangeLabel ? ` (chú ý ô ${effectiveRangeLabel})` : ''} và đề xuất hành động.`;
                    setAiPrompt(q);
                    void runAiQuestion(q, payload, docTitle);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer border ${
                    isDark
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
                      : 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  <FileSpreadsheet size={10} />
                  <span>Phân tích tab đang mở</span>
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runAiQuestion(aiPrompt, payload, docTitle);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Nhập câu hỏi cho @AI về tài liệu này..."
                className="flex-1 h-8 px-2.5 rounded-lg text-[12px] focus:outline-none"
                style={{
                  background: bgSurface,
                  border: `1px solid ${bColor}`,
                }}
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                aria-label="Gửi câu hỏi AI"
                className={`h-8 px-3 rounded-lg inline-flex items-center gap-1 text-[11.5px] font-bold cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? 'bg-purple-500 text-white hover:bg-purple-400'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <SendHorizontal size={13} />}
                <span>Hỏi</span>
              </button>
            </form>

            {aiError && <div className="text-[11.5px] text-rose-400">{aiError}</div>}

            {aiAnswer && (
              <div
                className="rounded-lg p-2.5 max-h-[210px] overflow-y-auto space-y-2 border text-[12px]"
                style={{ background: bgSurface, borderColor: bColor }}
              >
                <MosChatRichText content={aiAnswer} isDark={isDark} />
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-500/20">
                  <button
                    type="button"
                    onClick={() => void handleCopyText(aiAnswer, 'Đã sao chép phân tích của AI')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ borderColor: bColor }}
                  >
                    <Copy size={11} />
                    <span>Sao chép</span>
                  </button>
                  {onPostAiReplyToChat && (
                    <button
                      type="button"
                      onClick={() => onPostAiReplyToChat(aiAnswer, docTitle)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                    >
                      <SendHorizontal size={11} />
                      <span>Gửi vào phòng chat</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SELECTED CELL FORMULA / VALUE BAR (Sheets Fast Mode) */}
        {readerMode === 'fast' && isSheet && selectedCell && (
          <div
            className="px-3 py-1 flex items-center justify-between gap-2 text-[11.5px] shrink-0"
            style={{ background: bgRaised, borderBottom: `1px solid ${bColor}` }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded font-extrabold tabular-nums shrink-0 ${
                  isDark ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {selectedCell.address}
              </span>
              <span className="truncate font-medium select-all">
                {selectedCell.value || <span className="opacity-45 italic">(Ô trống)</span>}
              </span>
            </div>
            {selectedCell.value && (
              <button
                type="button"
                onClick={() => void handleCopyText(selectedCell.value, `Đã sao chép giá trị ô ${selectedCell.address}`)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
              >
                <Copy size={11} />
                <span>Sao chép ô</span>
              </button>
            )}
          </div>
        )}

        {/* MAIN VIEWPORT */}
        {readerMode === 'embed' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div
              className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] shrink-0"
              style={{
                background: isDark ? 'rgba(14, 165, 233, 0.12)' : 'rgba(224, 242, 254, 0.9)',
                borderBottom: `1px solid ${bColor}`,
              }}
            >
              <span className="truncate opacity-85">
                Đang nhúng Google trực tiếp (nếu trình duyệt chặn cookie, hãy bấm Mở tab Google riêng).
              </span>
              <a
                href={canonicalHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-sky-500 hover:underline shrink-0"
              >
                <span>Mở trên Google</span>
                <ExternalLink size={11} />
              </a>
            </div>
            <iframe
              data-testid="gw-reader-embed-iframe"
              src={embedHref}
              title={docTitle}
              className="w-full flex-1 border-0 bg-white"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        ) : (
          <div ref={docBodyRef} className="flex-1 overflow-auto min-h-0 flex flex-col">
            {loading && !data && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-2 text-[12.5px] opacity-75">
                <Loader2 size={22} className="animate-spin text-emerald-500" />
                <span>Đang tải toàn bộ dữ liệu tài liệu...</span>
              </div>
            )}

            {error && !data && (
              <div className="p-6 text-center space-y-3">
                <div className="text-[13px] font-bold text-rose-400">{error}</div>
                <button
                  type="button"
                  onClick={() => void reload(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-emerald-500 text-slate-950 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Thử tải lại</span>
                </button>
              </div>
            )}

            {data?.accessStatus === 'NEEDS_SHARE' && (
              <div
                className="p-5 m-4 rounded-xl border space-y-3"
                style={{ background: bgRaised, borderColor: bColor }}
              >
                <div className="flex items-start gap-2.5">
                  <Lock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[13.5px] font-extrabold">Tài liệu chưa cấp quyền cho mOS Bot</div>
                    <div className="text-[12px] opacity-80 mt-1 leading-relaxed">
                      Chia sẻ file trên Google Docs/Sheets ở chế độ <b>Xem (Viewer)</b> cho email Bot bên dưới hoặc bật
                      quyền <b>Bất kỳ ai có đường liên kết</b>, sau đó bấm Thử tải lại:
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border font-mono text-[11.5px]"
                  style={{ background: bgSurface, borderColor: bColor }}
                >
                  <span className="truncate select-all">{data.serviceAccountEmail}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopyBotEmail(data.serviceAccountEmail)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-sans font-bold bg-amber-500 text-slate-950 cursor-pointer shrink-0"
                  >
                    <Copy size={11} />
                    <span>{copiedBotEmail ? 'Đã sao chép' : 'Sao chép email mOS Bot'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={canonicalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold border"
                    style={{ borderColor: bColor }}
                  >
                    <ExternalLink size={12} />
                    <span>Mở Google để chia sẻ</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => void reload(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-emerald-500 text-slate-950 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Thử tải lại</span>
                  </button>
                </div>
              </div>
            )}

            {data?.accessStatus === 'RESTRICTED_ROLE' && (
              <div
                className="p-5 m-4 rounded-xl border space-y-2"
                style={{ background: bgRaised, borderColor: bColor }}
              >
                <div className="flex items-center gap-2 text-rose-400 font-extrabold text-[13.5px]">
                  <ShieldAlert size={18} />
                  <span>Không đủ quyền xem tài liệu nội bộ</span>
                </div>
                <p className="text-[12px] opacity-80 leading-relaxed">
                  {data.statusMessage ||
                    'Tài liệu nội bộ đọc qua Service Account được bảo vệ theo quy tắc Điều răn UI-011.'}
                </p>
              </div>
            )}

            {/* FAST READER: SPREADSHEET FULL GRID */}
            {data &&
              isSheet &&
              (data.accessStatus === 'PUBLIC_LINK' || data.accessStatus === 'SERVICE_ACCOUNT') &&
              sheetGrid && (
                <div className="flex-1 overflow-auto min-h-0">
                  <table className="w-full border-collapse text-[11.5px] tabular-nums">
                    <thead className="sticky top-0 z-10">
                      <tr className={isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'}>
                        <th className="sticky left-0 z-20 w-10 px-2 py-1.5 text-center font-bold border-b border-r border-slate-500/25 bg-inherit">
                          #
                        </th>
                        {sheetGrid.colLetters.map((letter) => (
                          <th
                            key={letter}
                            className="min-w-[96px] max-w-[240px] px-2.5 py-1.5 text-center font-bold border-b border-r border-slate-500/20"
                          >
                            {letter}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetGrid.visibleRows.length === 0 ? (
                        <tr>
                          <td colSpan={sheetGrid.colCount + 1} className="p-6 text-center opacity-60">
                            Không tìm thấy dòng nào khớp với từ khóa &ldquo;{searchQuery}&rdquo;.
                          </td>
                        </tr>
                      ) : (
                        sheetGrid.visibleRows.map((row) => {
                          const isHeaderRow = row.rowNumber === 1;
                          return (
                            <tr
                              key={row.rowNumber}
                              className={
                                isHeaderRow
                                  ? isDark
                                    ? 'bg-emerald-950/35 font-semibold'
                                    : 'bg-emerald-50/75 font-semibold'
                                  : isDark
                                    ? 'border-b border-slate-800/80 hover:bg-white/5'
                                    : 'border-b border-slate-200 hover:bg-slate-50'
                              }
                            >
                              <td
                                className={`sticky left-0 z-[5] px-2 py-1.5 text-center font-bold border-r border-slate-500/25 ${
                                  isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {row.rowNumber}
                              </td>
                              {sheetGrid.colLetters.map((letter, colIdx) => {
                                const val = row.cells[colIdx] ?? '';
                                const highlighted = isCellInRange(row.rowNumber, colIdx, effectiveRange);
                                const isAnchor =
                                  Boolean(effectiveRange) &&
                                  row.rowNumber === effectiveRange!.startRow &&
                                  colIdx === effectiveRange!.startCol;
                                const address = `${letter}${row.rowNumber}`;
                                const isSelected = selectedCell?.address === address;
                                return (
                                  <td
                                    key={address}
                                    ref={isAnchor ? targetCellRef : undefined}
                                    data-cell-address={address}
                                    data-highlighted-cell={highlighted ? 'true' : undefined}
                                    onClick={() => setSelectedCell({ address, value: val })}
                                    className={`px-2.5 py-1.5 max-w-[260px] truncate border-r border-slate-500/15 cursor-pointer ${
                                      highlighted
                                        ? isDark
                                          ? 'bg-amber-400/25 text-amber-100 font-bold ring-2 ring-inset ring-amber-400'
                                          : 'bg-amber-100 text-amber-950 font-bold ring-2 ring-inset ring-amber-500'
                                        : isSelected
                                          ? isDark
                                            ? 'ring-2 ring-inset ring-emerald-400 bg-emerald-500/15'
                                            : 'ring-2 ring-inset ring-emerald-600 bg-emerald-50'
                                          : ''
                                    }`}
                                    title={`${address}: ${val}`}
                                  >
                                    {highlightMatchText(val, searchQuery, isDark)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {sheetGrid.truncated && (
                    <div className="p-2.5 text-center text-[11px] opacity-70 border-t border-slate-500/20">
                      Đang hiển thị {sheetGrid.totalRows} dòng đầu tiên để tối ưu tốc độ. Chuyển sang chế độ Google Trực
                      tiếp để xem thêm.
                    </div>
                  )}
                </div>
              )}

            {/* FAST READER: GOOGLE DOCS CLEAN READER */}
            {data && !isSheet && (data.accessStatus === 'PUBLIC_LINK' || data.accessStatus === 'SERVICE_ACCOUNT') && (
              <div className="p-4 space-y-4">
                {data.headings && data.headings.length > 0 && (
                  <div
                    className="p-2.5 rounded-xl border space-y-1.5"
                    style={{ background: bgRaised, borderColor: bColor }}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-70">
                      <BookOpen size={12} />
                      <span>Mục lục tài liệu</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {data.headings.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(`gw-doc-sec-${h.id}`);
                            if (el && typeof el.scrollIntoView === 'function') {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer border truncate max-w-[220px] ${
                            isDark
                              ? 'bg-sky-500/15 border-sky-500/30 text-sky-200 hover:bg-sky-500/25'
                              : 'bg-white border-sky-200 text-sky-800 hover:bg-sky-50'
                          }`}
                        >
                          {h.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3 text-[13px] leading-relaxed">
                  {(data.sections || []).map((sec) => {
                    if (sec.type === 'heading') {
                      const headingClass =
                        sec.level === 1
                          ? 'text-[17px] font-extrabold pt-2'
                          : sec.level === 2
                            ? 'text-[15px] font-extrabold pt-1.5'
                            : 'text-[13.5px] font-bold pt-1';
                      return (
                        <div key={sec.id} id={`gw-doc-sec-${sec.id}`} className={headingClass}>
                          {highlightMatchText(sec.text || '', searchQuery, isDark)}
                        </div>
                      );
                    }
                    if (sec.type === 'list') {
                      return (
                        <ul key={sec.id} className="list-disc pl-5 space-y-1">
                          {(sec.items || []).map((item, idx) => (
                            <li key={idx}>{highlightMatchText(item, searchQuery, isDark)}</li>
                          ))}
                        </ul>
                      );
                    }
                    if (sec.type === 'table') {
                      return (
                        <div key={sec.id} className="overflow-x-auto rounded-lg border" style={{ borderColor: bColor }}>
                          <table className="w-full border-collapse text-[12px] tabular-nums">
                            <tbody>
                              {(sec.rows || []).map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className={
                                    rIdx === 0
                                      ? isDark
                                        ? 'bg-slate-800 font-bold'
                                        : 'bg-slate-100 font-bold'
                                      : 'border-t border-slate-500/20'
                                  }
                                >
                                  {row.map((cell, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className="px-2.5 py-1.5 border-r last:border-r-0 border-slate-500/15"
                                    >
                                      {highlightMatchText(cell, searchQuery, isDark)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    return (
                      <p key={sec.id} className="whitespace-pre-wrap">
                        {highlightMatchText(sec.text || '', searchQuery, isDark)}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM GOOGLE SHEETS TAB SWITCHER BAR */}
        {readerMode === 'fast' && isSheet && data?.tabs && data.tabs.length > 0 && (
          <div
            className="px-2.5 py-1.5 flex items-center gap-1 overflow-x-auto shrink-0"
            style={{ background: bgRaised, borderTop: `1px solid ${bColor}` }}
          >
            {data.tabs.map((tab) => {
              const active = String(tab.gid) === String(data.activeTab?.gid || selectedGid || '');
              return (
                <button
                  key={tab.gid}
                  type="button"
                  onClick={() => {
                    setSelectedGid(tab.gid);
                    setSelectedCell(null);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 leading-none px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold shrink-0 cursor-pointer border transition-colors ${
                    active
                      ? isDark
                        ? 'bg-emerald-500/25 border-emerald-400/65 text-emerald-200'
                        : 'bg-emerald-100 border-emerald-500 text-emerald-950'
                      : isDark
                        ? 'bg-slate-900/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.title}</span>
                  {tab.rowCount != null && tab.rowCount > 0 && (
                    <span className="text-[10px] opacity-75 tabular-nums">({tab.rowCount})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </aside>
    );
  }
);

MosChatGoogleWorkspaceDrawer.displayName = 'MosChatGoogleWorkspaceDrawer';
