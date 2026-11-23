'use client';

import React from 'react';
import { Button, Input, Popconfirm, Select } from 'antd';
import { Plus, RotateCcw, Search } from 'lucide-react';
import type { TelesaleTvQuoteItem } from '@mos-lab/shared';
import { EVENT_TYPE_FILTER_OPTIONS, PERSONA_OPTIONS } from './tvQuotesConstants';

interface TvQuotesToolbarProps {
  isDark: boolean;
  zIndex: number;
  saving: boolean;
  quotes: TelesaleTvQuoteItem[];
  filteredCount: number;
  activeCount: number;
  customCount: number;
  selectedPersona: string;
  onSelectPersona: (persona: string) => void;
  selectedEventType: string;
  onSelectEventType: (eventType: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onResetToDefaults: () => void;
  onAddNew: () => void;
}

/** Renders summary counters, bulk actions, persona tabs, event filter, and search box for TV quotes. */
export const TvQuotesToolbar: React.FC<TvQuotesToolbarProps> = ({
  isDark,
  zIndex,
  saving,
  quotes,
  filteredCount,
  activeCount,
  customCount,
  selectedPersona,
  onSelectPersona,
  selectedEventType,
  onSelectEventType,
  searchQuery,
  onSearchChange,
  onResetToDefaults,
  onAddNew,
}) => {
  return (
    <>
      {/* Top Bar: Stats & Global Actions */}
      <div
        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
              Đang bật: <strong className="tabular-nums">{activeCount}</strong>/
              <span className="tabular-nums">{quotes.length}</span>
            </span>
          </div>
          {customCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                Tự tạo: <strong className="tabular-nums">{customCount}</strong> câu
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Popconfirm
            title="Khôi phục câu mẫu gốc?"
            description={
              selectedPersona !== 'ALL'
                ? `Bạn có chắc muốn đặt lại kho câu gốc cho nhân cách ${selectedPersona}?`
                : 'Đặt lại toàn bộ kho câu thoại mặc định?'
            }
            onConfirm={onResetToDefaults}
            okText="Khôi phục"
            cancelText="Hủy"
            zIndex={zIndex + 20}
          >
            <Button size="small" icon={<RotateCcw className="w-3.5 h-3.5" />} loading={saving} className="text-xs">
              Khôi phục gốc
            </Button>
          </Popconfirm>

          <Button
            type="primary"
            size="small"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onAddNew}
            className="text-xs bg-emerald-600 hover:bg-emerald-500"
          >
            Thêm câu mới
          </Button>
        </div>
      </div>

      {/* Persona Tabs (5 Personas + All) */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelectPersona('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all tabular-nums ${
            selectedPersona === 'ALL'
              ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
              : isDark
                ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          🎲 Tất cả ({quotes.length})
        </button>
        {PERSONA_OPTIONS.map((persona) => {
          const count = quotes.filter((q) => q.personaKey === persona.key).length;
          const isSelected = selectedPersona === persona.key;
          return (
            <button
              type="button"
              key={persona.key}
              onClick={() => onSelectPersona(persona.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : isDark
                    ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{persona.icon}</span>
              <span>{persona.label}</span>
              <span
                className={`text-[10px] px-1 rounded tabular-nums ${
                  isSelected ? 'bg-black/20 text-black' : 'opacity-60'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedEventType}
          onChange={onSelectEventType}
          className="w-44 text-xs"
          options={EVENT_TYPE_FILTER_OPTIONS}
        />

        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Tìm kiếm nội dung câu nói..."
            prefix={<Search className="w-3.5 h-3.5 text-zinc-400" />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            className="text-xs"
          />
        </div>

        <div className={`text-xs tabular-nums ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Hiển thị: <strong>{filteredCount}</strong> câu
        </div>
      </div>
    </>
  );
};
