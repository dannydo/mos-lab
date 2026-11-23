'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { MosChatGoogleDocHeading } from '@mos-lab/shared';
import { resolveCanvaEmbedAspectClass } from './workspaceCardHelpers';

export interface WorkspaceRichPreviewProps {
  isDark: boolean;
  isCanva: boolean;
  displayTitle: string;
  embedUrl?: string;
  embedWidth?: number | null;
  embedHeight?: number | null;
  headings?: MosChatGoogleDocHeading[];
  excerpt?: string | null;
  headingChipClass: string;
  showInlineEmbed: boolean;
  onToggleInlineEmbed: () => void;
  onOpenFastReader: () => void;
}

export const WorkspaceRichPreview: React.FC<WorkspaceRichPreviewProps> = ({
  isDark,
  isCanva,
  displayTitle,
  embedUrl,
  embedWidth,
  embedHeight,
  headings,
  excerpt,
  headingChipClass,
  showInlineEmbed,
  onToggleInlineEmbed,
  onOpenFastReader,
}) => {
  const embedAspectClass = resolveCanvaEmbedAspectClass(embedWidth, embedHeight);

  return (
    <div className={isCanva ? 'space-y-2' : 'space-y-1.5'}>
      {headings && headings.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {headings.slice(0, 4).map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={onOpenFastReader}
              className={`inline-flex items-center leading-none px-2 py-1 rounded-md text-[10.5px] font-semibold border cursor-pointer truncate max-w-[180px] ${headingChipClass}`}
            >
              {h.text}
            </button>
          ))}
        </div>
      )}

      {excerpt && (
        <div
          className={`text-[11.5px] leading-relaxed line-clamp-3 rounded-lg p-2 border ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          {excerpt}
        </div>
      )}

      {isCanva && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="canva-inline-embed-toggle"
              onClick={onToggleInlineEmbed}
              className={`inline-flex items-center gap-1.5 leading-none px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border transition-colors ${
                showInlineEmbed
                  ? isDark
                    ? 'bg-violet-500/25 border-violet-400/60 text-violet-100'
                    : 'bg-violet-100 border-violet-400 text-violet-950'
                  : isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              {showInlineEmbed ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{showInlineEmbed ? 'Thu gọn khung xem' : 'Xem thử tại chỗ'}</span>
            </button>
          </div>

          {showInlineEmbed && (
            <div
              className={`w-full max-h-[420px] rounded-lg overflow-hidden border ${embedAspectClass} ${
                isDark ? 'border-violet-500/35' : 'border-violet-500/30'
              }`}
            >
              <iframe
                data-testid="canva-inline-embed-iframe"
                src={embedUrl}
                title={displayTitle}
                className="block w-full h-full border-0 bg-slate-950"
                allow="fullscreen; clipboard-read; clipboard-write"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
