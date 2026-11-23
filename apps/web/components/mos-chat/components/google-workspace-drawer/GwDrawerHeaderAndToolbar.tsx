'use client';

import React from 'react';
import { Tooltip } from 'antd';
import {
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Palette,
  RefreshCw,
  Search,
  SendHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type { MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';
import { MosChatRichText } from '../../MosChatRichText';
import type { OpenGoogleWorkspaceReaderPayload } from '../../utils/google-workspace-bridge';

interface GwDrawerHeaderAndToolbarProps {
  isMobile: boolean;
  isDark: boolean;
  isSheet: boolean;
  isCanva: boolean;
  docTitle: string;
  data: MosChatGoogleWorkspacePreviewResponse | null;
  payload: OpenGoogleWorkspaceReaderPayload;
  readerMode: 'fast' | 'embed';
  effectiveRangeLabel: string | null;
  canonicalHref: string;
  expandedWidth: boolean;
  searchQuery: string;
  loading: boolean;
  aiBarOpen: boolean;
  aiPrompt: string;
  aiLoading: boolean;
  aiError: string | null;
  aiAnswer: string | null;
  selectedCell: { address: string; value: string } | null;
  bgSurface: string;
  bgRaised: string;
  bgCanvas: string;
  bColor: string;
  mobileHorizontalSafeClass: string;
  onSetReaderMode: (mode: 'fast' | 'embed') => void;
  onToggleExpandWidth: () => void;
  onCloseDrawer: () => void;
  onChangeSearchQuery: (value: string) => void;
  onScrollToTargetRange: () => void;
  onReload: () => void;
  onToggleAiBar: () => void;
  onChangeAiPrompt: (value: string) => void;
  onRunAiQuestion: (question: string) => void;
  onCopyText: (text: string, label: string) => void;
  onPostAiReplyToChat?: (replyText: string, docTitle: string) => void;
}

export const GwDrawerHeaderAndToolbar: React.FC<GwDrawerHeaderAndToolbarProps> = ({
  isMobile,
  isDark,
  isSheet,
  isCanva,
  docTitle,
  data,
  payload,
  readerMode,
  effectiveRangeLabel,
  canonicalHref,
  expandedWidth,
  searchQuery,
  loading,
  aiBarOpen,
  aiPrompt,
  aiLoading,
  aiError,
  aiAnswer,
  selectedCell,
  bgSurface,
  bgRaised,
  bgCanvas,
  bColor,
  mobileHorizontalSafeClass,
  onSetReaderMode,
  onToggleExpandWidth,
  onCloseDrawer,
  onChangeSearchQuery,
  onScrollToTargetRange,
  onReload,
  onToggleAiBar,
  onChangeAiPrompt,
  onRunAiQuestion,
  onCopyText,
  onPostAiReplyToChat,
}) => {
  void payload;

  const docIdentityNode = (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          isSheet
            ? isDark
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-emerald-100 text-emerald-700'
            : isCanva
              ? isDark
                ? 'bg-violet-500/20 text-violet-300'
                : 'bg-violet-100 text-violet-700'
              : isDark
                ? 'bg-sky-500/20 text-sky-400'
                : 'bg-sky-100 text-sky-700'
        }`}
      >
        {isSheet ? <FileSpreadsheet size={15} /> : isCanva ? <Palette size={15} /> : <FileText size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`${isMobile ? 'text-[13px]' : 'text-[12.5px]'} font-extrabold truncate`}>{docTitle}</div>
        <div className="text-[10.5px] opacity-75 flex items-center gap-1.5 truncate tabular-nums">
          <span>
            {isCanva
              ? `Canva${data?.designType ? ` ${data.designType}` : ''}${data?.authorName ? ` · ${data.authorName}` : ''}`
              : isSheet
                ? 'Google Sheets'
                : 'Google Docs'}
          </span>
          {data?.activeTab?.title && <span>· {data.activeTab.title}</span>}
          {effectiveRangeLabel && <span className="font-bold text-amber-500">· {effectiveRangeLabel}</span>}
        </div>
      </div>
    </div>
  );

  const modeSwitcherNode = (
    <div
      className={`flex items-center gap-0.5 p-0.5 rounded-lg ${isMobile ? 'w-full' : ''}`}
      style={{ background: bgCanvas, border: `1px solid ${bColor}` }}
    >
      <button
        type="button"
        onClick={() => onSetReaderMode('fast')}
        className={`inline-flex items-center justify-center gap-1 leading-none rounded-md font-bold cursor-pointer transition-colors ${
          isMobile ? 'flex-1 min-h-[36px] px-2.5 py-1.5 text-[11.5px]' : 'px-2 py-1 text-[10.5px]'
        } ${
          readerMode === 'fast'
            ? isDark
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-emerald-600 text-white'
            : 'opacity-75 hover:opacity-100'
        }`}
      >
        <Zap size={isMobile ? 12 : 11} />
        <span>{isCanva ? 'Đọc nhanh văn bản' : 'Đọc nhanh mOS'}</span>
      </button>
      <button
        type="button"
        onClick={() => onSetReaderMode('embed')}
        className={`inline-flex items-center justify-center gap-1 leading-none rounded-md font-bold cursor-pointer transition-colors ${
          isMobile ? 'flex-1 min-h-[36px] px-2.5 py-1.5 text-[11.5px]' : 'px-2 py-1 text-[10.5px]'
        } ${
          readerMode === 'embed'
            ? isCanva
              ? isDark
                ? 'bg-violet-500 text-white'
                : 'bg-violet-600 text-white'
              : isDark
                ? 'bg-sky-500 text-slate-950'
                : 'bg-sky-600 text-white'
            : 'opacity-75 hover:opacity-100'
        }`}
      >
        <Globe size={isMobile ? 12 : 11} />
        <span>{isCanva ? 'Canva Trực tiếp' : 'Google Trực tiếp'}</span>
      </button>
    </div>
  );

  const externalLinkNode = (
    <Tooltip title={isCanva ? 'Mở trên Canva' : 'Mở trên Google'}>
      <a
        href={canonicalHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={isCanva ? 'Mở trên Canva' : 'Mở trên Google'}
        className={`${
          isMobile ? 'min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg' : 'w-7 h-7 rounded-md'
        } inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10`}
      >
        <ExternalLink size={isMobile ? 16 : 14} />
      </a>
    </Tooltip>
  );

  const closeButtonNode = (
    <Tooltip title="Đóng trình đọc tài liệu">
      <button
        type="button"
        aria-label="Đóng trình đọc tài liệu"
        onClick={onCloseDrawer}
        className={`${
          isMobile ? 'min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg' : 'w-7 h-7 rounded-md'
        } inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 hover:text-rose-400`}
      >
        <X size={isMobile ? 18 : 16} />
      </button>
    </Tooltip>
  );

  return (
    <>
      {/* TOP HEADER: Title on LEFT, Mode Switch + Controls + [X] Close strictly on RIGHT */}
      <div
        data-testid="gw-reader-header"
        className={
          isMobile
            ? `${mobileHorizontalSafeClass} pt-[max(env(safe-area-inset-top,0px),10px)] pb-2 flex flex-col gap-2 shrink-0`
            : 'h-[52px] px-3 flex items-center justify-between gap-2 shrink-0'
        }
        style={{
          background: bgRaised,
          borderBottom: `1px solid ${bColor}`,
        }}
      >
        {isMobile ? (
          <>
            <div className="min-h-[44px] flex items-center justify-between gap-2">
              {docIdentityNode}
              <div className="flex items-center gap-1 shrink-0">
                {externalLinkNode}
                {closeButtonNode}
              </div>
            </div>
            {modeSwitcherNode}
          </>
        ) : (
          <>
            {docIdentityNode}
            <div className="flex items-center gap-1 shrink-0">
              {modeSwitcherNode}
              <Tooltip title={expandedWidth ? 'Thu chuẩn độ rộng' : 'Mở rộng khung đọc'}>
                <button
                  type="button"
                  aria-label={expandedWidth ? 'Thu chuẩn độ rộng' : 'Mở rộng khung đọc'}
                  onClick={onToggleExpandWidth}
                  className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                >
                  {expandedWidth ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </Tooltip>
              {externalLinkNode}
              {closeButtonNode}
            </div>
          </>
        )}
      </div>

      {/* SUB-TOOLBAR */}
      <div
        className={`${mobileHorizontalSafeClass} py-1.5 flex items-center justify-between gap-2 flex-wrap shrink-0`}
        style={{
          background: bgSurface,
          borderBottom: `1px solid ${bColor}`,
        }}
      >
        <div className={`flex items-center gap-1.5 flex-1 ${isMobile ? 'min-w-[150px]' : 'min-w-[180px]'}`}>
          {readerMode === 'fast' && (
            <div className={`relative flex-1 ${isMobile ? '' : 'max-w-[260px]'}`}>
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-55" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onChangeSearchQuery(e.target.value)}
                placeholder={
                  isSheet
                    ? 'Lọc nhanh dòng, mã hàng...'
                    : isCanva
                      ? 'Tìm chữ trong thiết kế Canva...'
                      : 'Tìm trong tài liệu...'
                }
                aria-label="Tìm kiếm trong tài liệu"
                className={`w-full ${isMobile ? 'h-9 text-[12px]' : 'h-7 text-[11.5px]'} pl-7 pr-2 rounded-md focus:outline-none`}
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
              onClick={onScrollToTargetRange}
              className={`inline-flex items-center gap-1 leading-none px-2 ${
                isMobile ? 'min-h-[36px]' : 'py-1.5'
              } rounded-md text-[11px] font-bold tabular-nums cursor-pointer border ${
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
            onClick={onReload}
            disabled={loading}
            className={`inline-flex items-center gap-1 leading-none px-2 ${
              isMobile ? 'min-h-[36px]' : 'py-1.5'
            } rounded-md text-[11px] font-semibold cursor-pointer border hover:bg-black/5 dark:hover:bg-white/10`}
            style={{ borderColor: bColor }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={onToggleAiBar}
            className={`inline-flex items-center gap-1 leading-none px-2.5 ${
              isMobile ? 'min-h-[36px]' : 'py-1.5'
            } rounded-md text-[11px] font-bold cursor-pointer border transition-colors ${
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
                onChangeAiPrompt(q);
                onRunAiQuestion(q);
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
                  onChangeAiPrompt(q);
                  onRunAiQuestion(q);
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
              onRunAiQuestion(aiPrompt);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => onChangeAiPrompt(e.target.value)}
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
                isDark ? 'bg-purple-500 text-white hover:bg-purple-400' : 'bg-purple-600 text-white hover:bg-purple-700'
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
                  onClick={() => onCopyText(aiAnswer, 'Đã sao chép phân tích của AI')}
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

      {/* SELECTED CELL FORMULA / VALUE BAR */}
      {readerMode === 'fast' && isSheet && selectedCell && (
        <div
          className={`${mobileHorizontalSafeClass} py-1 flex items-center justify-between gap-2 text-[11.5px] shrink-0`}
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
              onClick={() => onCopyText(selectedCell.value, `Đã sao chép giá trị ô ${selectedCell.address}`)}
              className={`inline-flex items-center gap-1 px-1.5 ${
                isMobile ? 'min-h-[32px]' : 'py-0.5'
              } rounded text-[10.5px] font-semibold cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 shrink-0`}
            >
              <Copy size={11} />
              <span>Sao chép ô</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};
