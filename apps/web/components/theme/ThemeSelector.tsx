'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tag, message, theme } from 'antd';
import { Palette, Sun, Moon, Check, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeStudioModal } from './ThemeStudioModal';

export function ThemeSelector({ isAdmin }: { isAdmin?: boolean } = {}) {
  const {
    themeId,
    themeMode,
    toggleTheme,
    availableCoreThemes,
    setCoreThemeId,
    canManageThemes: contextCanManage,
  } = useTheme();

  const { token } = theme.useToken();
  const canManageThemes = typeof isAdmin === 'boolean' ? isAdmin : contextCanManage;

  const [studioOpen, setStudioOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const currentThemeItem = availableCoreThemes.find((t) => t.id === themeId);

  return (
    <>
      <div className="relative inline-flex items-center" ref={containerRef}>
        <button
          type="button"
          className="mos-header-icon-action flex items-center justify-center relative group p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Giao diện hiện tại: ${currentThemeItem?.label || 'mOS Theme'}`}
          aria-label="Chọn Theme Giao Diện"
          aria-expanded={dropdownOpen}
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen((prev) => !prev);
          }}
        >
          <Palette className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-amber-500 transition-colors pointer-events-none" />
          {/* Swatch indicator dot */}
          <span
            className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 shadow-xs pointer-events-none"
            style={{ backgroundColor: currentThemeItem?.colors.primary || '#d4a84b' }}
          />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-2 z-[1050] min-w-[270px] p-1.5 overflow-hidden rounded-2xl shadow-2xl transition-all duration-150 animate-in fade-in zoom-in-95"
            style={{
              background: token.colorBgElevated,
              border: `1px solid ${token.colorBorderSecondary}`,
              transformOrigin: 'top right',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Chọn Phong Cách Giao Diện
              </span>
            </div>
            <div className="py-1 max-h-[360px] overflow-y-auto space-y-0.5">
              {availableCoreThemes.map((themeItem) => {
                const isActive = themeItem.id === themeId;
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                    onClick={() => {
                      setCoreThemeId(themeItem.id);
                      setDropdownOpen(false);
                      message.success(`Đã kích hoạt theme "${themeItem.label}"`);
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs shrink-0"
                        style={{ backgroundColor: themeItem.colors.primary }}
                      />
                      <div>
                        <div className="font-medium text-xs leading-tight flex items-center gap-1.5">
                          <span>{themeItem.label}</span>
                          {themeItem.isCustom && (
                            <Tag color="blue" className="text-[10px] px-1 py-0 m-0">
                              Tự tạo
                            </Tag>
                          )}
                        </div>
                        {themeItem.description && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                            {themeItem.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800/60 space-y-0.5">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-200"
                onClick={() => {
                  toggleTheme();
                  setDropdownOpen(false);
                }}
              >
                {themeMode === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                )}
                <span>Chuyển sang nền {themeMode === 'dark' ? 'Sáng' : 'Tối'}</span>
              </button>
              {canManageThemes && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors hover:bg-amber-500/10 text-xs font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
                  onClick={() => {
                    setDropdownOpen(false);
                    setStudioOpen(true);
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Theme Studio (Tự sửa / Dán màu)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {canManageThemes && studioOpen && <ThemeStudioModal open={studioOpen} onClose={() => setStudioOpen(false)} />}
    </>
  );
}
