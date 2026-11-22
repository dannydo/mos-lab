'use client';

import React from 'react';
import type { MosChatGoogleSheetTabSummary, ParsedGoogleWorkspaceRange } from '@mos-lab/shared';
import { isCellHighlighted } from './workspaceCardHelpers';
import type { WorkspacePreviewGrid } from './workspaceCardTypes';

export interface WorkspaceSheetPreviewProps {
  isDark: boolean;
  tabs?: MosChatGoogleSheetTabSummary[];
  activeTabGid?: string;
  selectedGid?: string | null;
  previewGrid: WorkspacePreviewGrid | null;
  effectiveRange: ParsedGoogleWorkspaceRange | null;
  onSelectGid: (gid: string) => void;
}

export const WorkspaceSheetPreview: React.FC<WorkspaceSheetPreviewProps> = ({
  isDark,
  tabs,
  activeTabGid,
  selectedGid,
  previewGrid,
  effectiveRange,
  onSelectGid,
}) => {
  return (
    <div className="space-y-2">
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map((tab) => {
            const isActiveTab = String(tab.gid) === String(activeTabGid || selectedGid || '');
            return (
              <button
                key={tab.gid}
                type="button"
                onClick={() => onSelectGid(tab.gid)}
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
        <div className={`overflow-x-auto rounded-lg border ${isDark ? 'border-slate-400/20' : 'border-slate-300/90'}`}>
          <table className="w-full border-collapse text-[11px] tabular-nums">
            <thead>
              <tr className={isDark ? 'bg-slate-900/90 text-slate-400' : 'bg-slate-100 text-slate-500'}>
                <th className="w-8 px-1.5 py-1 text-center font-bold border-b border-r border-slate-500/20">#</th>
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
  );
};
