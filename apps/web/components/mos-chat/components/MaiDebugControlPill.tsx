'use client';

import React, { useMemo, useState } from 'react';
import { Popover, Tooltip, theme } from 'antd';
import { Bug, Check, ChevronDown, Cpu } from 'lucide-react';
import { DEFAULT_MAI_CHAT_MODEL_ID, DEFAULT_MAI_DEBUG_MODEL_ID, type AgModelOption } from '@mos-lab/shared';
import { useMaiDebugSettings } from '../shared/hooks/useMaiDebugSettings';

export interface MaiDebugControlPillProps {
  isStrictDannySuperAdmin: boolean;
  isDark: boolean;
  isAiPrivateConv?: boolean;
  compact?: boolean;
  onEnsureMaiMention?: () => void;
}

interface ModelFamilyGroup {
  family: string;
  tag?: AgModelOption['tag'];
  description?: string;
  options: AgModelOption[];
}

export const MaiDebugControlPill: React.FC<MaiDebugControlPillProps> = ({
  isStrictDannySuperAdmin,
  isDark,
  isAiPrivateConv = false,
  compact = false,
  onEnsureMaiMention,
}) => {
  const { token } = theme.useToken();
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const { debugMode, setDebugMode, modelId, effectiveModelId, setModelId, models, activeModel, bridgeOnline } =
    useMaiDebugSettings(isStrictDannySuperAdmin);

  const familyGroups = useMemo<ModelFamilyGroup[]>(() => {
    const groups = new Map<string, ModelFamilyGroup>();
    for (const opt of models) {
      const existing = groups.get(opt.family);
      if (existing) {
        existing.options.push(opt);
      } else {
        groups.set(opt.family, {
          family: opt.family,
          tag: opt.tag,
          description: opt.description,
          options: [opt],
        });
      }
    }
    return Array.from(groups.values());
  }, [models]);

  if (!isStrictDannySuperAdmin) return null;

  const handleToggleDebug = () => {
    const next = !debugMode;
    setDebugMode(next);
    if (next && !isAiPrivateConv) {
      onEnsureMaiMention?.();
    }
  };

  const renderTagBadge = (tag?: AgModelOption['tag']) => {
    if (!tag) return null;
    const isNew = tag === 'New';
    const isLeaving = tag === 'Leaving Soon';
    return (
      <span
        className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
          isNew
            ? isDark
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
              : 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/35'
            : isLeaving
              ? isDark
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                : 'bg-amber-500/15 text-amber-700 border border-amber-500/35'
              : isDark
                ? 'bg-slate-500/25 text-slate-300 border border-slate-500/40'
                : 'bg-slate-500/15 text-slate-700 border border-slate-500/35'
        }`}
      >
        {tag}
      </span>
    );
  };

  const popoverContent = (
    <div
      data-testid="mai-model-picker-popover"
      className="w-[330px] max-w-[88vw] max-h-[380px] overflow-y-auto pr-1 space-y-2.5"
      style={{ color: token.colorText }}
    >
      <div
        className="flex items-center justify-between pb-1.5 border-b"
        style={{ borderColor: token.colorBorderSecondary }}
      >
        <div className="flex items-center gap-1.5">
          <Cpu size={13} className="text-purple-400" />
          <span className="text-[11.5px] font-bold">Model Antigravity cho @MAI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: bridgeOnline ? '#10b981' : token.colorTextTertiary }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${bridgeOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {bridgeOnline ? 'AG Live' : 'Catalog'}
          </span>
          {modelId && (
            <button
              type="button"
              onClick={() => {
                setModelId('');
                setModelPopoverOpen(false);
              }}
              className="text-[10px] px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: token.colorTextSecondary }}
            >
              Mặc định
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {familyGroups.map((group) => (
          <div
            key={group.family}
            className="rounded-xl p-2 border"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.025)',
              borderColor: token.colorBorderSecondary,
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11.5px] font-bold truncate">{group.family}</span>
              {renderTagBadge(group.tag)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((opt) => {
                const isSelected = opt.id === effectiveModelId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`mai-model-option-${opt.id}`}
                    onClick={() => {
                      setModelId(opt.id);
                      setModelPopoverOpen(false);
                    }}
                    title={opt.label}
                    className={`inline-flex items-center justify-center leading-none gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all border ${
                      isSelected
                        ? isDark
                          ? 'bg-purple-500/25 text-purple-200 border-purple-400/60 shadow-sm'
                          : 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : isDark
                          ? 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check size={11} />}
                    <span>{opt.effort || opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] leading-snug pt-1" style={{ color: token.colorTextTertiary }}>
        Mặc định Chat nhanh: <span className="font-semibold">{DEFAULT_MAI_CHAT_MODEL_ID}</span> · Mặc định Debug:{' '}
        <span className="font-semibold">{DEFAULT_MAI_DEBUG_MODEL_ID}</span>
      </div>
    </div>
  );

  return (
    <div
      data-testid="mai-superadmin-debug-controls"
      className={`inline-flex items-center gap-1 ${compact ? 'flex-wrap' : ''}`}
    >
      <Tooltip
        title={
          debugMode
            ? 'Đang bật chế độ AG Debug (MAI được đọc code, chạy test & kiểm tra flow trên máy Win AG) — Chỉ Super Admin'
            : 'Bật chế độ AG Debug để cùng @MAI kiểm tra code, test flow ngay trong phòng chat này (Chỉ Super Admin)'
        }
      >
        <button
          type="button"
          data-testid="mai-debug-toggle-btn"
          aria-pressed={debugMode}
          aria-label="Bật tắt chế độ AG Debug cho @MAI"
          onClick={handleToggleDebug}
          className={`h-7 px-2 rounded-lg inline-flex items-center justify-center leading-none gap-1 text-[11px] font-extrabold cursor-pointer transition-all border ${
            debugMode
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/55 shadow-sm ring-1 ring-emerald-500/30'
                : 'bg-emerald-500/15 text-emerald-800 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/25'
              : isDark
                ? 'hover:bg-emerald-500/10 text-emerald-400/80 border-emerald-500/25'
                : 'hover:bg-emerald-500/10 text-emerald-700/85 border-emerald-500/30'
          }`}
        >
          <Bug size={13} />
          <span>{debugMode ? 'AG Debug: BẬT' : 'AG Debug'}</span>
        </button>
      </Tooltip>

      <Popover
        trigger="click"
        placement="topLeft"
        zIndex={1080}
        open={modelPopoverOpen}
        onOpenChange={setModelPopoverOpen}
        content={popoverContent}
      >
        <button
          type="button"
          data-testid="mai-model-picker-btn"
          aria-label="Chọn model Antigravity cho @MAI"
          title={`Model @MAI hiện tại: ${activeModel.label}`}
          className={`h-7 px-2 rounded-lg inline-flex items-center justify-center leading-none gap-1 text-[11px] font-bold cursor-pointer transition-all border max-w-[165px] ${
            modelId || debugMode
              ? isDark
                ? 'bg-purple-500/15 text-purple-200 border-purple-500/45 hover:bg-purple-500/25'
                : 'bg-purple-50 text-purple-800 border-purple-400/50 hover:bg-purple-100'
              : isDark
                ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
          }`}
        >
          <Cpu size={12} className="shrink-0" />
          <span className="truncate">{activeModel.shortLabel}</span>
          <ChevronDown size={11} className="shrink-0 opacity-75" />
        </button>
      </Popover>
    </div>
  );
};
