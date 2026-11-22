'use client';

import React from 'react';
import type { MosChatGoogleWorkspacePreviewResponse, ParsedGoogleWorkspaceRange } from '@mos-lab/shared';
import { highlightMatchText, isCellInRange } from './gwDrawerUtils';
import type { GwSheetGridData } from './useGwDrawerController';

interface GwDrawerFastSheetGridProps {
  isDark: boolean;
  sheetGrid: GwSheetGridData;
  searchQuery: string;
  effectiveRange: ParsedGoogleWorkspaceRange | null;
  selectedCell: { address: string; value: string } | null;
  targetCellRef: React.RefObject<HTMLTableCellElement | null>;
  gridScrollRef: React.RefObject<HTMLDivElement | null>;
  onSelectCell: (cell: { address: string; value: string }) => void;
}

export const GwDrawerFastSheetGrid: React.FC<GwDrawerFastSheetGridProps> = ({
  isDark,
  sheetGrid,
  searchQuery,
  effectiveRange,
  selectedCell,
  targetCellRef,
  gridScrollRef,
  onSelectCell,
}) => {
  return (
    <div ref={gridScrollRef} className="flex-1 overflow-auto min-h-0">
      <table className="min-w-full w-max border-collapse text-[11.5px] tabular-nums">
        <thead className="sticky top-0 z-10">
          <tr className={isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'}>
            <th
              className={`sticky left-0 z-20 w-11 px-2 py-1.5 text-center font-bold border-b border-r border-slate-500/25 ${
                isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              #
            </th>
            {sheetGrid.colLetters.map((letter) => (
              <th
                key={letter}
                className={`min-w-[110px] max-w-[260px] px-2.5 py-1.5 text-center font-bold border-b border-r border-slate-500/20 ${
                  isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}
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
                        onClick={() => onSelectCell({ address, value: val })}
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
          Đang hiển thị tối đa {sheetGrid.totalRows} dòng và {sheetGrid.colCount} cột đầu tiên để tối ưu tốc độ. Chuyển
          sang chế độ Google Trực tiếp để xem thêm.
        </div>
      )}
    </div>
  );
};

interface GwDrawerSheetTabsBarProps {
  isMobile: boolean;
  isDark: boolean;
  tabs: NonNullable<MosChatGoogleWorkspacePreviewResponse['tabs']>;
  activeTabGid?: string | number | null;
  selectedGid?: string | null;
  bgRaised: string;
  bColor: string;
  onSelectTab: (gid: string) => void;
}

export const GwDrawerSheetTabsBar: React.FC<GwDrawerSheetTabsBarProps> = ({
  isMobile,
  isDark,
  tabs,
  activeTabGid,
  selectedGid,
  bgRaised,
  bColor,
  onSelectTab,
}) => {
  return (
    <div
      data-testid="gw-reader-sheet-tabs"
      className={`${
        isMobile
          ? 'pl-[max(env(safe-area-inset-left,0px),10px)] pr-[max(env(safe-area-inset-right,0px),10px)] pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),10px)]'
          : 'px-2.5 py-1.5'
      } flex items-center gap-1 overflow-x-auto shrink-0`}
      style={{
        background: bgRaised,
        borderTop: `1px solid ${bColor}`,
      }}
    >
      {tabs.map((tab) => {
        const active = String(tab.gid) === String(activeTabGid || selectedGid || '');
        return (
          <button
            key={tab.gid}
            type="button"
            onClick={() => onSelectTab(tab.gid)}
            className={`inline-flex items-center justify-center gap-1.5 leading-none px-2.5 ${
              isMobile ? 'min-h-[36px] py-1.5' : 'py-1.5'
            } rounded-lg text-[11.5px] font-bold shrink-0 cursor-pointer border transition-colors ${
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
  );
};
