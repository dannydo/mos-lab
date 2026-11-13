'use client';

import React from 'react';
import { Palette, Sun, Moon, Smartphone, Check, X } from 'lucide-react';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';

interface MobileThemeSelectorBlockProps {
  compact?: boolean;
  fontControl?: React.ReactNode;
}

/**
 * Shared 3-mode (Light / Dark / Auto) + Core Theme Palette selector block
 * reused across /ios-app (IosProfileMenuSheet) and /chat mobile (MobileThemeSheet).
 */
export const MobileThemeSelectorBlock: React.FC<MobileThemeSelectorBlockProps> = ({
  compact = false,
  fontControl,
}) => {
  const {
    coreThemeId,
    themeId,
    themeMode,
    themePreference,
    systemThemeMode,
    setThemePreference,
    toggleTheme,
    availableCoreThemes,
    setCoreThemeId,
  } = useTheme();

  const resolvedPreference: ThemePreference = themePreference ?? themeMode;
  const isDark = themeMode === 'dark';
  const resolvedSystemMode = systemThemeMode ?? themeMode;
  const currentThemeItem = availableCoreThemes.find((t) => t.id === (coreThemeId || themeId));

  const handleSelectPreference = (target: ThemePreference) => {
    if (typeof setThemePreference === 'function') {
      setThemePreference(target);
      return;
    }
    if (target !== 'auto' && themeMode !== target) {
      toggleTheme();
    }
  };

  const activeModeBadge =
    resolvedPreference === 'auto'
      ? `📱 Tự động (${resolvedSystemMode === 'dark' ? 'Hiện Tối' : 'Hiện Sáng'})`
      : isDark
        ? '🌙 Nền Tối'
        : '☀️ Nền Sáng';

  return (
    <div
      className="p-3 rounded-2xl border space-y-2.5 transition-colors"
      style={{
        backgroundColor: 'var(--mos-surface-raised, var(--mos-surface))',
        borderColor: 'var(--mos-surface-border)',
        color: 'var(--mos-text)',
      }}
    >
      {/* Header: Icon & Active Indicator */}
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-0.5">
        <span className="flex items-center gap-1.5" style={{ color: 'var(--mos-text-muted)' }}>
          <Palette className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mos-accent)' }} />
          <span>Giao diện & Tông màu</span>
        </span>
        <span className="text-[10.5px] font-black truncate max-w-[165px]" style={{ color: 'var(--mos-accent)' }}>
          {activeModeBadge}
        </span>
      </div>

      {/* 1. Tri-state Segmented Control: Nền Sáng / Nền Tối / Tự động */}
      <div
        className="grid grid-cols-3 gap-1 p-1 rounded-xl border"
        style={{
          backgroundColor: 'var(--mos-surface-muted)',
          borderColor: 'var(--mos-surface-border)',
        }}
      >
        <button
          type="button"
          onClick={() => handleSelectPreference('light')}
          aria-pressed={resolvedPreference === 'light'}
          className="py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          style={
            resolvedPreference === 'light'
              ? {
                  backgroundColor: 'var(--mos-surface)',
                  color: 'var(--mos-text)',
                  boxShadow: 'var(--mos-shadow)',
                }
              : {
                  color: 'var(--mos-text-muted)',
                }
          }
        >
          <Sun className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span>Nền Sáng</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectPreference('dark')}
          aria-pressed={resolvedPreference === 'dark'}
          className="py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          style={
            resolvedPreference === 'dark'
              ? {
                  backgroundColor: 'var(--mos-surface)',
                  color: 'var(--mos-accent)',
                  boxShadow: 'var(--mos-shadow)',
                }
              : {
                  color: 'var(--mos-text-muted)',
                }
          }
        >
          <Moon className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
          <span>Nền Tối</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectPreference('auto')}
          aria-pressed={resolvedPreference === 'auto'}
          title={
            resolvedSystemMode === 'dark'
              ? 'Tự động theo iPhone (Hiện tại: Nền Tối)'
              : 'Tự động theo iPhone (Hiện tại: Nền Sáng)'
          }
          className="py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          style={
            resolvedPreference === 'auto'
              ? {
                  backgroundColor: 'var(--mos-surface)',
                  color: 'var(--mos-accent)',
                  boxShadow: 'var(--mos-shadow)',
                }
              : {
                  color: 'var(--mos-text-muted)',
                }
          }
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--mos-accent)' }} />
          <span>Tự động</span>
        </button>
      </div>

      {fontControl ? <div className="pt-0.5">{fontControl}</div> : null}

      {/* 2. Bộ chọn Phong Cách Màu (Theme Palettes) */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between px-0.5 text-[10.5px]">
          <span className="font-medium" style={{ color: 'var(--mos-text-muted)' }}>
            Chủ đề màu ({availableCoreThemes.length} phong cách):
          </span>
          <span className="font-extrabold truncate max-w-[170px]" style={{ color: 'var(--mos-accent)' }}>
            {currentThemeItem?.label || 'mOS Obsidian Gold'}
          </span>
        </div>
        <div
          className={`grid grid-cols-3 gap-1.5 overflow-y-auto no-scrollbar p-0.5 ${
            compact ? 'max-h-[145px]' : 'max-h-[220px]'
          }`}
        >
          {availableCoreThemes.map((t) => {
            const active = t.id === (coreThemeId || themeId);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setCoreThemeId(t.id)}
                aria-pressed={active}
                className="p-2 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col gap-1 active:scale-95"
                style={{
                  backgroundColor: active ? 'var(--mos-surface)' : 'var(--mos-surface-muted)',
                  borderColor: active ? 'var(--mos-accent)' : 'var(--mos-surface-border)',
                  color: active ? 'var(--mos-text)' : 'var(--mos-text-muted)',
                  boxShadow: active ? '0 0 0 1px var(--mos-accent)' : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0 border"
                      style={{
                        backgroundColor: t.colors?.primary || '#d4a84b',
                        borderColor: 'var(--mos-surface-border-strong)',
                      }}
                    />
                    {t.colors?.bgLayout && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border"
                        style={{
                          backgroundColor: t.colors.bgLayout,
                          borderColor: 'var(--mos-surface-border-strong)',
                        }}
                      />
                    )}
                  </div>
                  {active && <Check className="w-3 h-3 stroke-[3]" style={{ color: 'var(--mos-accent)' }} />}
                </div>
                <div className="text-[11px] font-extrabold truncate leading-tight">{t.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface MobileThemeSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Reusable mobile bottom-sheet for switching Light / Dark / Auto and Core Theme Palettes.
 */
export const MobileThemeSheet: React.FC<MobileThemeSheetProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col justify-end">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chọn giao diện & tông màu"
        className="relative z-10 w-full max-w-[430px] mx-auto rounded-t-[26px] border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] shadow-2xl animate-in slide-in-from-bottom duration-200"
        style={{
          backgroundColor: 'var(--mos-surface)',
          borderColor: 'var(--mos-surface-border)',
          color: 'var(--mos-text)',
        }}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-3 opacity-40"
          style={{ backgroundColor: 'var(--mos-text-muted)' }}
        />
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-extrabold leading-tight" style={{ color: 'var(--mos-text)' }}>
              Giao diện hiển thị
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--mos-text-muted)' }}>
              Đồng bộ tức thì giữa iOS App, Chat & Dashboard
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng chọn giao diện"
            className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer active:scale-95 transition-transform"
            style={{
              backgroundColor: 'var(--mos-surface-muted)',
              borderColor: 'var(--mos-surface-border)',
              color: 'var(--mos-text-muted)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <MobileThemeSelectorBlock compact={false} />
      </div>
    </div>
  );
};
