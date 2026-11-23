'use client';

import React from 'react';
import { Popover, Tooltip } from 'antd';
import { Columns2, Eye, FilePenLine, FileText, Maximize2, Minimize2, Sparkles, Zap } from 'lucide-react';
import { type EditorStats, RICH_EDITOR_TEMPLATES, type RichEditorViewMode } from './richEditorUtils';

export const EditorTooltip: React.FC<{
  title: React.ReactNode;
  disabled?: boolean;
  children: React.ReactElement;
  [key: string]: unknown;
}> = ({ title, disabled, children, ...rest }) => {
  const child = Object.keys(rest).length > 0 ? React.cloneElement(children, rest) : children;
  if (disabled) return child;
  return <Tooltip title={title}>{child}</Tooltip>;
};

interface RichEditorHeaderProps {
  title: string;
  isCompactMode: boolean;
  isMobile: boolean;
  isDark: boolean;
  isFullscreen: boolean;
  viewMode: RichEditorViewMode;
  stats: EditorStats;
  templatePopoverOpen: boolean;
  zIndex: number;
  borderCol: string;
  toolbarBg: string;
  textColor: string;
  secondaryTextColor: string;
  onTemplatePopoverOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateContent: string) => void;
  onViewModeChange: (mode: RichEditorViewMode) => void;
  onToggleFullscreen: () => void;
}

export const RichEditorHeader: React.FC<RichEditorHeaderProps> = ({
  title,
  isCompactMode,
  isMobile,
  isDark,
  isFullscreen,
  viewMode,
  stats,
  templatePopoverOpen,
  zIndex,
  borderCol,
  toolbarBg,
  textColor,
  secondaryTextColor,
  onTemplatePopoverOpenChange,
  onSelectTemplate,
  onViewModeChange,
  onToggleFullscreen,
}) => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-2 sm:py-3 border-b shrink-0 select-none gap-2"
      style={{ borderColor: borderCol, background: toolbarBg }}
    >
      {/* Title & Badge */}
      <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 pr-11 sm:pr-0 min-h-[30px]">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/25 shrink-0 shadow-sm">
            {isCompactMode ? <Zap size={14} /> : <FilePenLine size={15} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3
                className="text-[13px] sm:text-[13.5px] font-bold m-0 leading-tight truncate"
                style={{ color: textColor }}
              >
                {title}
              </h3>
              <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                CKEditor Mode
              </span>
            </div>
            <div
              className="hidden sm:flex items-center gap-1.5 mt-0.5 text-[11px] tabular-nums"
              style={{ color: secondaryTextColor }}
            >
              <span>{stats.words} từ</span>
              <span>·</span>
              <span>{stats.chars} ký tự</span>
              <span>·</span>
              <span>{stats.lines} dòng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls: Stats (on mobile), Templates & Mode switcher */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:mr-7 overflow-x-auto no-scrollbar">
        <div
          className="sm:hidden flex items-center gap-1 text-[10.5px] tabular-nums shrink-0"
          style={{ color: secondaryTextColor }}
        >
          <span>{stats.words} từ</span>
          <span>·</span>
          <span>{stats.chars} ký tự</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto sm:ml-0">
          {!isCompactMode && (
            <Popover
              open={templatePopoverOpen}
              onOpenChange={onTemplatePopoverOpenChange}
              trigger="click"
              placement={isMobile ? 'bottom' : 'bottomRight'}
              zIndex={zIndex + 20}
              content={
                <div className="w-[min(288px,calc(100vw-32px))] max-h-[45vh] overflow-y-auto p-1 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 text-amber-500 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>Mẫu soạn thảo sẵn</span>
                  </div>
                  {RICH_EDITOR_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => onSelectTemplate(tmpl.content)}
                      className="w-full text-left p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex flex-col gap-0.5 cursor-pointer"
                    >
                      <span className="text-[12.5px] font-semibold" style={{ color: textColor }}>
                        {tmpl.title}
                      </span>
                      <span className="text-[11px] opacity-75" style={{ color: secondaryTextColor }}>
                        {tmpl.desc}
                      </span>
                    </button>
                  ))}
                </div>
              }
            >
              <button
                type="button"
                className="h-6.5 sm:h-7 px-2 sm:px-2.5 rounded-lg border flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                style={{ borderColor: borderCol, color: textColor }}
              >
                <Sparkles size={12} className="text-amber-500" />
                <span className="sm:hidden">Mẫu</span>
                <span className="hidden sm:inline">Mẫu nhanh</span>
              </button>
            </Popover>
          )}

          {/* View Mode Segmented Controls */}
          <div
            className="flex items-center p-0.5 rounded-lg border shrink-0"
            style={{ borderColor: borderCol, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)' }}
          >
            <EditorTooltip
              disabled={isMobile}
              title="Bản gọn (Type nhanh): Khung nhỏ gọn kiểu Google Chat, tự xuống dòng dấu đầu dòng • khi nhấn Enter"
            >
              <button
                type="button"
                data-testid="rich-editor-mode-compact"
                onClick={() => onViewModeChange('compact')}
                className={`h-6 sm:h-6.5 px-1.5 sm:px-2 rounded-md flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Zap size={11} />
                <span>Bản gọn</span>
              </button>
            </EditorTooltip>

            <EditorTooltip disabled={isMobile} title="Chỉ soạn thảo (Soạn mã Markdown / Text)">
              <button
                type="button"
                onClick={() => onViewModeChange('edit')}
                className={`h-6 sm:h-6.5 px-1.5 sm:px-2 rounded-md flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium transition-all cursor-pointer ${
                  viewMode === 'edit'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileText size={11} />
                <span className="hidden md:inline">Soạn thảo</span>
              </button>
            </EditorTooltip>

            <EditorTooltip disabled={isMobile} title="Xem song song: Soạn thảo bên trái, Xem trước bên phải">
              <button
                type="button"
                onClick={() => onViewModeChange('split')}
                className={`h-6 sm:h-6.5 px-1.5 sm:px-2 rounded-md flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Columns2 size={11} />
                <span className="hidden md:inline">Song song</span>
              </button>
            </EditorTooltip>

            <EditorTooltip disabled={isMobile} title="Xem trước trực quan (WYSIWYG Preview)">
              <button
                type="button"
                onClick={() => onViewModeChange('preview')}
                className={`h-6 sm:h-6.5 px-1.5 sm:px-2 rounded-md flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium transition-all cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Eye size={11} />
                <span className="hidden md:inline">Xem trước</span>
              </button>
            </EditorTooltip>
          </div>

          {!isCompactMode && (
            <EditorTooltip disabled={isMobile} title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                style={{ borderColor: borderCol, color: secondaryTextColor }}
              >
                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            </EditorTooltip>
          )}
        </div>
      </div>
    </div>
  );
};
