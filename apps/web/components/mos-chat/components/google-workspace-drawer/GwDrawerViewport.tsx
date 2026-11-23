'use client';

import React from 'react';
import { BookOpen, Copy, ExternalLink, Globe, Loader2, Lock, RefreshCw, ShieldAlert } from 'lucide-react';
import type { MosChatGoogleWorkspacePreviewResponse, ParsedGoogleWorkspaceRange } from '@mos-lab/shared';
import { highlightMatchText } from './gwDrawerUtils';
import { GwDrawerFastSheetGrid } from './GwDrawerFastSheetView';
import type { GwSheetGridData } from './useGwDrawerController';

interface GwDrawerViewportProps {
  isMobile: boolean;
  isDark: boolean;
  isResizing: boolean;
  readerMode: 'fast' | 'embed';
  isSheet: boolean;
  isCanva: boolean;
  hasBottomSheetTabs: boolean;
  docTitle: string;
  canonicalHref: string;
  embedHref: string;
  loading: boolean;
  error: string | null;
  data: MosChatGoogleWorkspacePreviewResponse | null;
  sheetGrid: GwSheetGridData | null;
  searchQuery: string;
  effectiveRange: ParsedGoogleWorkspaceRange | null;
  selectedCell: { address: string; value: string } | null;
  copiedBotEmail: boolean;
  bgSurface: string;
  bgRaised: string;
  bColor: string;
  mobileHorizontalSafeClass: string;
  docBodyRef: React.RefObject<HTMLDivElement | null>;
  gridScrollRef: React.RefObject<HTMLDivElement | null>;
  targetCellRef: React.RefObject<HTMLTableCellElement | null>;
  onReload: () => void;
  onSetReaderMode: (mode: 'fast' | 'embed') => void;
  onCopyBotEmail: (email: string) => void;
  onSelectCell: (cell: { address: string; value: string }) => void;
}

export const GwDrawerViewport: React.FC<GwDrawerViewportProps> = ({
  isMobile,
  isDark,
  isResizing,
  readerMode,
  isSheet,
  isCanva,
  hasBottomSheetTabs,
  docTitle,
  canonicalHref,
  embedHref,
  loading,
  error,
  data,
  sheetGrid,
  searchQuery,
  effectiveRange,
  selectedCell,
  copiedBotEmail,
  bgSurface,
  bgRaised,
  bColor,
  mobileHorizontalSafeClass,
  docBodyRef,
  gridScrollRef,
  targetCellRef,
  onReload,
  onSetReaderMode,
  onCopyBotEmail,
  onSelectCell,
}) => {
  if (readerMode === 'embed') {
    return (
      <div
        data-testid="gw-reader-embed-container"
        className={`flex-1 flex flex-col min-h-0 ${
          isMobile && !hasBottomSheetTabs ? 'pb-[env(safe-area-inset-bottom,0px)]' : ''
        }`}
      >
        <div
          className={`${mobileHorizontalSafeClass} py-1.5 flex items-center justify-between gap-2 text-[11px] shrink-0`}
          style={{
            background: isCanva
              ? isDark
                ? 'rgba(139, 92, 246, 0.14)'
                : 'rgba(237, 233, 254, 0.95)'
              : isDark
                ? 'rgba(14, 165, 233, 0.12)'
                : 'rgba(224, 242, 254, 0.9)',
            borderBottom: `1px solid ${bColor}`,
          }}
        >
          <span className="truncate opacity-85">
            {isCanva
              ? 'Đang xem Canva trực tiếp (hỗ trợ phóng to, thu nhỏ & lật trang · cần chỉnh sửa hãy bấm Mở trên Canva).'
              : 'Đang nhúng Google trực tiếp (nếu trình duyệt chặn cookie, hãy bấm Mở tab Google riêng).'}
          </span>
          <a
            href={canonicalHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 font-bold hover:underline shrink-0 ${
              isCanva ? 'text-violet-400' : 'text-sky-500'
            }`}
          >
            <span>{isCanva ? 'Mở trên Canva' : 'Mở trên Google'}</span>
            <ExternalLink size={11} />
          </a>
        </div>
        {isCanva && data?.accessStatus === 'NEEDS_SHARE' ? (
          <div className="p-5 m-4 rounded-xl border space-y-3" style={{ background: bgRaised, borderColor: bColor }}>
            <div className="flex items-start gap-2.5">
              <Lock size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-[13.5px] font-extrabold">Thiết kế Canva đang bật chế độ riêng tư</div>
                <div className="text-[12px] opacity-80 mt-1 leading-relaxed">
                  Để xem trực tiếp trong mOS Chat, hãy mở thiết kế trên Canva → bấm <b>Chia sẻ (Share)</b> → đổi quyền
                  liên kết thành <b>Bất kỳ ai có liên kết (Anyone with the link) → Xem</b>, rồi bấm <b>Thử tải lại</b>:
                </div>
              </div>
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
                <span>Mở trên Canva</span>
              </a>
              <button
                type="button"
                onClick={onReload}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-violet-500 text-white cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Thử tải lại</span>
              </button>
            </div>
          </div>
        ) : isCanva && loading && !data && !embedHref.includes('/view?embed') ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-2 text-[12.5px] opacity-75">
            <Loader2 size={22} className="animate-spin text-violet-400" />
            <span>Đang mở khung nhúng Canva...</span>
          </div>
        ) : (
          <iframe
            data-testid="gw-reader-embed-iframe"
            src={embedHref}
            title={docTitle}
            className="block w-full flex-1 min-h-0 border-0 bg-white"
            style={{ pointerEvents: isResizing ? 'none' : 'auto' }}
            allow="fullscreen; clipboard-read; clipboard-write"
            allowFullScreen
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={docBodyRef}
      className={`flex-1 overflow-auto min-h-0 flex flex-col ${
        isMobile && !hasBottomSheetTabs ? 'pb-[env(safe-area-inset-bottom,0px)]' : ''
      }`}
    >
      {loading && !data && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-2 text-[12.5px] opacity-75">
          <Loader2 size={22} className={`animate-spin ${isCanva ? 'text-violet-400' : 'text-emerald-500'}`} />
          <span>{isCanva ? 'Đang đọc thiết kế từ Canva...' : 'Đang tải toàn bộ dữ liệu tài liệu...'}</span>
        </div>
      )}

      {error && !data && (
        <div className="p-6 text-center space-y-3">
          <div className="text-[13px] font-bold text-rose-400">{error}</div>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-emerald-500 text-slate-950 cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Thử tải lại</span>
          </button>
        </div>
      )}

      {data?.accessStatus === 'NEEDS_SHARE' && isCanva && (
        <div className="p-5 m-4 rounded-xl border space-y-3" style={{ background: bgRaised, borderColor: bColor }}>
          <div className="flex items-start gap-2.5">
            <Lock size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-[13.5px] font-extrabold">Thiết kế Canva đang bật chế độ riêng tư</div>
              <div className="text-[12px] opacity-80 mt-1 leading-relaxed">
                Để xem trực tiếp trong mOS Chat, hãy mở thiết kế trên Canva → bấm <b>Chia sẻ (Share)</b> → đổi quyền
                liên kết thành <b>Bất kỳ ai có liên kết (Anyone with the link) → Xem</b>, rồi bấm <b>Thử tải lại</b>:
              </div>
            </div>
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
              <span>Mở trên Canva</span>
            </a>
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-violet-500 text-white cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Thử tải lại</span>
            </button>
          </div>
        </div>
      )}

      {data?.accessStatus === 'NEEDS_SHARE' && !isCanva && (
        <div className="p-5 m-4 rounded-xl border space-y-3" style={{ background: bgRaised, borderColor: bColor }}>
          <div className="flex items-start gap-2.5">
            <Lock size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-[13.5px] font-extrabold">Tài liệu chưa cấp quyền cho mOS Bot</div>
              <div className="text-[12px] opacity-80 mt-1 leading-relaxed">
                Chia sẻ file trên Google Docs/Sheets ở chế độ <b>Xem (Viewer)</b> cho email Bot bên dưới hoặc bật quyền{' '}
                <b>Bất kỳ ai có đường liên kết</b>, sau đó bấm Thử tải lại:
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
              onClick={() => onCopyBotEmail(data.serviceAccountEmail)}
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
              onClick={onReload}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-emerald-500 text-slate-950 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Thử tải lại</span>
            </button>
          </div>
        </div>
      )}

      {data?.accessStatus === 'RESTRICTED_ROLE' && (
        <div className="p-5 m-4 rounded-xl border space-y-2" style={{ background: bgRaised, borderColor: bColor }}>
          <div className="flex items-center gap-2 text-rose-400 font-extrabold text-[13.5px]">
            <ShieldAlert size={18} />
            <span>Không đủ quyền xem tài liệu nội bộ</span>
          </div>
          <p className="text-[12px] opacity-80 leading-relaxed">
            {data.statusMessage || 'Tài liệu nội bộ đọc qua Service Account được bảo vệ theo quy tắc Điều răn UI-011.'}
          </p>
        </div>
      )}

      {data &&
        isSheet &&
        (data.accessStatus === 'PUBLIC_LINK' || data.accessStatus === 'SERVICE_ACCOUNT') &&
        sheetGrid && (
          <GwDrawerFastSheetGrid
            isDark={isDark}
            sheetGrid={sheetGrid}
            searchQuery={searchQuery}
            effectiveRange={effectiveRange}
            selectedCell={selectedCell}
            targetCellRef={targetCellRef}
            gridScrollRef={gridScrollRef}
            onSelectCell={onSelectCell}
          />
        )}

      {/* FAST READER: GOOGLE DOCS & CANVA CLEAN TEXT READER */}
      {data && !isSheet && (data.accessStatus === 'PUBLIC_LINK' || data.accessStatus === 'SERVICE_ACCOUNT') && (
        <div className="p-4 space-y-4">
          {isCanva && (data.sections || []).length === 0 && (
            <div
              className="p-4 rounded-xl border space-y-2.5 text-[12.5px]"
              style={{ background: bgRaised, borderColor: bColor }}
            >
              <div className="font-bold">Thiết kế Canva này chủ yếu là hình ảnh/đồ họa</div>
              <p className="opacity-80 leading-relaxed">
                Không phát hiện khối văn bản tách rời trên thiết kế này. Hãy xem bản tương tác đầy đủ ở chế độ Canva
                Trực tiếp.
              </p>
              <button
                type="button"
                onClick={() => onSetReaderMode('embed')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-violet-500 text-white cursor-pointer"
              >
                <Globe size={13} />
                <span>Mở Canva Trực tiếp</span>
              </button>
            </div>
          )}

          {data.headings && data.headings.length > 0 && (
            <div className="p-2.5 rounded-xl border space-y-1.5" style={{ background: bgRaised, borderColor: bColor }}>
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
                              <td key={cIdx} className="px-2.5 py-1.5 border-r last:border-r-0 border-slate-500/15">
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
  );
};
