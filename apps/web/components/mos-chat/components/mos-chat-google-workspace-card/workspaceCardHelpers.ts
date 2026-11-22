import {
  columnIndexToLetter,
  type MosChatGoogleWorkspacePreviewResponse,
  type ParsedGoogleWorkspaceRange,
} from '@mos-lab/shared';
import type { WorkspaceCardTheme, WorkspacePreviewGrid } from './workspaceCardTypes';

export function isCellHighlighted(
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

export function getWorkspaceDefaultTitle(isSheet: boolean, isCanva: boolean): string {
  if (isSheet) return 'Google Sheets';
  if (isCanva) return 'Thiết kế Canva';
  return 'Google Docs';
}

export function getWorkspaceKindSubtitle(
  isSheet: boolean,
  isCanva: boolean,
  data?: MosChatGoogleWorkspacePreviewResponse | null
): string {
  if (isCanva) {
    const designTypePart = data?.designType ? ` ${data.designType}` : '';
    const authorPart = data?.authorName ? ` · ${data.authorName}` : '';
    return `Canva${designTypePart}${authorPart}`;
  }
  return isSheet ? 'Google Sheets' : 'Google Docs';
}

export function buildWorkspaceAiPrompt(params: {
  isSheet: boolean;
  isCanva: boolean;
  activeTabTitle?: string | null;
  effectiveRangeLabel?: string | null;
}): string {
  if (params.isSheet) {
    const rangeSuffix = params.effectiveRangeLabel ? ` (đặc biệt vùng ${params.effectiveRangeLabel})` : '';
    return `Phân tích ngắn gọn dữ liệu tab ${params.activeTabTitle || 'hiện tại'}${rangeSuffix} và nêu các điểm cần lưu ý.`;
  }
  if (params.isCanva) {
    return 'Tóm tắt nội dung chính, quy trình và các ghi chú quan trọng trong thiết kế Canva này.';
  }
  return 'Tóm tắt các ý chính và đầu việc quan trọng trong tài liệu Google Docs này.';
}

export function buildSheetPreviewGrid(
  data: MosChatGoogleWorkspacePreviewResponse | null | undefined,
  isSheet: boolean,
  compact: boolean
): WorkspacePreviewGrid | null {
  if (!isSheet || !data?.activeTab) return null;
  const tab = data.activeTab;
  const colStart = tab.snippetColStart ?? 0;
  const rowLimit = compact ? 3 : 4;
  const snippetRows =
    tab.snippetRows && tab.snippetRows.length > 0
      ? tab.snippetRows.slice(0, rowLimit)
      : (tab.rows || []).slice(0, rowLimit).map((cells, idx) => ({
          rowNumber: (tab.snippetRowStart || 1) + idx,
          cells: cells.slice(colStart, colStart + 5),
        }));

  if (snippetRows.length === 0) return null;

  const maxRowLen = snippetRows.reduce((max, r) => Math.max(max, r.cells.length), 0);
  const maxCols = Math.max(1, Math.min(5, Math.max(tab.snippetColHeaders?.length || 0, maxRowLen)));
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
}

export function resolveCanvaEmbedAspectClass(width?: number | null, height?: number | null): string {
  const safeWidth = width && width > 0 ? width : 16;
  const safeHeight = height && height > 0 ? height : 9;
  const ratio = safeWidth / safeHeight;
  if (ratio >= 1.9) return 'aspect-[2/1]';
  if (ratio >= 1.55) return 'aspect-video';
  if (ratio >= 1.2) return 'aspect-[4/3]';
  if (ratio >= 0.88) return 'aspect-square';
  if (ratio >= 0.68) return 'aspect-[3/4]';
  return 'aspect-[9/16]';
}

export function getWorkspaceCardTheme(isSheet: boolean, isCanva: boolean, isDark: boolean): WorkspaceCardTheme {
  const baseBg = isDark ? 'bg-slate-900/75' : 'bg-white/95';
  const headerBottomBorder = isDark ? 'border-b-slate-400/20' : 'border-b-slate-300/70';

  if (isSheet) {
    return {
      cardContainerClass: `${baseBg} ${isDark ? 'border-emerald-500/30' : 'border-emerald-500/35'}`,
      headerBarClass: `${headerBottomBorder} ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50/95'}`,
      iconWrapperClass: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700',
      primaryButtonClass: isDark
        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
        : 'bg-emerald-600 text-white hover:bg-emerald-700',
      headingChipClass: isDark
        ? 'bg-sky-500/15 border-sky-500/30 text-sky-200 hover:bg-sky-500/25'
        : 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100',
    };
  }

  if (isCanva) {
    return {
      cardContainerClass: `${baseBg} border-violet-500/40`,
      headerBarClass: `${headerBottomBorder} ${isDark ? 'bg-violet-500/15' : 'bg-violet-50/95'}`,
      iconWrapperClass: isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700',
      primaryButtonClass: isDark
        ? 'bg-violet-500 text-white hover:bg-violet-400'
        : 'bg-violet-600 text-white hover:bg-violet-700',
      headingChipClass: isDark
        ? 'bg-violet-500/15 border-violet-500/30 text-violet-200 hover:bg-violet-500/25'
        : 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100',
    };
  }

  return {
    cardContainerClass: `${baseBg} ${isDark ? 'border-sky-400/30' : 'border-sky-500/35'}`,
    headerBarClass: `${headerBottomBorder} ${isDark ? 'bg-sky-400/15' : 'bg-sky-50/95'}`,
    iconWrapperClass: isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-700',
    primaryButtonClass: isDark
      ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
      : 'bg-sky-600 text-white hover:bg-sky-700',
    headingChipClass: isDark
      ? 'bg-sky-500/15 border-sky-500/30 text-sky-200 hover:bg-sky-500/25'
      : 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100',
  };
}
