'use client';

import React from 'react';
import { Button, Popconfirm, Switch, Tooltip } from 'antd';
import { Edit2, Loader2, Square, Trash2, Volume2 } from 'lucide-react';
import type { TelesaleTvQuoteItem } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { EVENT_TYPE_CONFIG, findPersonaOption, splitTemplateVariableParts } from './tvQuotesConstants';

interface TvQuoteCardProps {
  quote: TelesaleTvQuoteItem;
  isDark: boolean;
  zIndex: number;
  isPlaying: boolean;
  audioLoading: boolean;
  onToggleActive: (id: string, nextActive: boolean) => void;
  onPlayPreview: (quote: TelesaleTvQuoteItem) => void;
  onEdit: (quote: TelesaleTvQuoteItem) => void;
  onDelete: (id: string) => void;
}

/** Displays a single celebration quote card with highlighted placeholders, audio preview, and quick actions. */
export const TvQuoteCard: React.FC<TvQuoteCardProps> = ({
  quote,
  isDark,
  zIndex,
  isPlaying,
  audioLoading,
  onToggleActive,
  onPlayPreview,
  onEdit,
  onDelete,
}) => {
  const persona = findPersonaOption(quote.personaKey);
  const eventConfig = EVENT_TYPE_CONFIG[quote.eventType] || EVENT_TYPE_CONFIG.BOOK;
  const templateSegments = splitTemplateVariableParts(quote.template);

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        quote.isActive
          ? isDark
            ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          : isDark
            ? 'bg-zinc-950/60 border-zinc-900 opacity-60'
            : 'bg-slate-50 border-slate-100 opacity-60'
      }`}
    >
      {/* Header info */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center justify-center gap-1 leading-none text-xs px-2.5 py-1 rounded-full font-medium ${
              isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-800'
            }`}
          >
            <span>{persona.icon}</span>
            <span>{persona.label}</span>
          </span>

          <span
            className={`inline-flex items-center justify-center leading-none text-xs px-2.5 py-1 rounded-full border ${
              isDark
                ? `${eventConfig.bgDark} ${eventConfig.borderDark} text-zinc-200`
                : `${eventConfig.bgLight} ${eventConfig.borderLight} text-slate-800`
            }`}
          >
            {eventConfig.label}
          </span>

          {quote.isCustom && (
            <StatusTag status="purple" label="Tùy chỉnh" className="text-[10px] px-1.5 py-0.5 rounded font-semibold" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Tooltip title={quote.isActive ? 'Đang kích hoạt phát loa' : 'Đang tạm tắt'}>
            <Switch
              size="small"
              checked={quote.isActive}
              onChange={(checked) => onToggleActive(quote.id, checked)}
              className={quote.isActive ? 'bg-emerald-500' : undefined}
            />
          </Tooltip>
        </div>
      </div>

      {/* Template Text with Highlighted Variables */}
      <p
        className={`text-xs leading-relaxed font-normal mb-3 whitespace-pre-wrap ${
          isDark ? 'text-zinc-200' : 'text-zinc-700'
        }`}
      >
        {templateSegments.map((segment, index) =>
          segment.isVariable ? (
            <span
              key={index}
              className={`font-semibold font-mono px-1 py-0.5 rounded text-[11px] mx-0.5 ${
                isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )}
      </p>

      {/* Action Bar */}
      <div
        className={`flex items-center justify-between border-t pt-2 border-dashed ${
          isDark ? 'border-zinc-800/80' : 'border-zinc-200'
        }`}
      >
        <div className={`text-[11px] font-mono flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          <span>Giọng: {persona.voice.includes('NamMinh') ? 'Nam Minh' : 'Hoài My'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="small"
            type={isPlaying ? 'primary' : 'default'}
            danger={isPlaying}
            icon={
              isPlaying ? (
                <Square className="w-3 h-3 fill-current" />
              ) : audioLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              ) : (
                <Volume2 className="w-3 h-3 text-amber-500" />
              )
            }
            onClick={() => onPlayPreview(quote)}
            className="text-xs"
          >
            {isPlaying ? 'Dừng' : 'Nghe thử'}
          </Button>

          <Button size="small" icon={<Edit2 className="w-3 h-3" />} onClick={() => onEdit(quote)} className="text-xs">
            Sửa
          </Button>

          <Popconfirm
            title="Xóa câu thoại này?"
            onConfirm={() => onDelete(quote.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            zIndex={zIndex + 20}
          >
            <Button
              size="small"
              danger
              aria-label="Xóa câu thoại"
              icon={<Trash2 className="w-3 h-3" />}
              className="text-xs"
            />
          </Popconfirm>
        </div>
      </div>
    </div>
  );
};
