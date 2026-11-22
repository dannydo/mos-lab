'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { ExternalLink, FileSpreadsheet, FileText, MapPin, Palette, PanelRightOpen, Sparkles } from 'lucide-react';
import type { MosChatGoogleWorkspaceAccessStatus, MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';
import { getWorkspaceKindSubtitle } from './workspaceCardHelpers';
import type { WorkspaceCardTheme } from './workspaceCardTypes';

export interface WorkspaceCardHeaderProps {
  isDark: boolean;
  isSheet: boolean;
  isCanva: boolean;
  displayTitle: string;
  canonicalUrl: string;
  accessStatus?: MosChatGoogleWorkspaceAccessStatus;
  effectiveRangeLabel: string | null;
  data: MosChatGoogleWorkspacePreviewResponse | null;
  themeClasses: WorkspaceCardTheme;
  onOpenReader: () => void;
  onAskAi: () => void;
}

export const WorkspaceCardHeader: React.FC<WorkspaceCardHeaderProps> = ({
  isDark,
  isSheet,
  isCanva,
  displayTitle,
  canonicalUrl,
  accessStatus,
  effectiveRangeLabel,
  data,
  themeClasses,
  onOpenReader,
  onAskAi,
}) => {
  const kindSubtitle = getWorkspaceKindSubtitle(isSheet, isCanva, data);

  return (
    <div
      className={`px-3 py-2 flex items-center justify-between gap-2 flex-wrap border-b ${themeClasses.headerBarClass}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${themeClasses.iconWrapperClass}`}
        >
          {isSheet ? <FileSpreadsheet size={15} /> : isCanva ? <Palette size={15} /> : <FileText size={15} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={onOpenReader}
              className={`text-[12.5px] font-bold truncate cursor-pointer hover:underline text-left ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {displayTitle}
            </button>
            {accessStatus === 'PUBLIC_LINK' && (
              <span
                className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  isCanva
                    ? isDark
                      ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                      : 'bg-violet-100 text-violet-800 border border-violet-200'
                    : isDark
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
            className={`text-[11px] flex items-center gap-2 mt-0.5 flex-wrap ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>{kindSubtitle}</span>
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
        <Tooltip
          title={
            isCanva ? 'Mở trình đọc Canva bên cạnh khung chat' : 'Mở trình đọc Google Workspace bên cạnh khung chat'
          }
        >
          <button
            type="button"
            onClick={onOpenReader}
            className={`inline-flex items-center justify-center gap-1 leading-none px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${themeClasses.primaryButtonClass}`}
          >
            <PanelRightOpen size={12} />
            <span>Đọc bên cạnh</span>
          </button>
        </Tooltip>

        <Tooltip title={isCanva ? 'Hỏi @AI tóm tắt thiết kế Canva này' : 'Hỏi @AI phân tích tài liệu này'}>
          <button
            type="button"
            onClick={onAskAi}
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

        <Tooltip title={isCanva ? 'Mở trực tiếp trên Canva' : 'Mở trực tiếp trên Google'}>
          <a
            href={canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={isCanva ? 'Mở trực tiếp trên Canva' : 'Mở trực tiếp trên Google'}
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
  );
};
