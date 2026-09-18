'use client';

import React, { useState } from 'react';
import { Dropdown, Button, Space, Tag, message } from 'antd';
import { Palette, Sun, Moon, Check, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemeStudioModal } from './ThemeStudioModal';
import { usePointerTrigger } from '../../hooks/usePointerTrigger';

export function ThemeSelector({ isAdmin }: { isAdmin?: boolean } = {}) {
  const {
    themeId,
    themeMode,
    toggleTheme,
    availableCoreThemes,
    setCoreThemeId,
    canManageThemes: contextCanManage,
  } = useTheme();

  const canManageThemes = typeof isAdmin === 'boolean' ? isAdmin : contextCanManage;

  const [studioOpen, setStudioOpen] = useState(false);
  const { open: dropdownOpen, setOpen: setDropdownOpen, triggerProps } = usePointerTrigger();

  const currentThemeItem = availableCoreThemes.find((t) => t.id === themeId);

  const menuItems = [
    {
      key: 'header-label',
      type: 'group' as const,
      label: (
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chọn Phong Cách Giao Diện</span>
      ),
      children: availableCoreThemes.map((themeItem) => {
        const isActive = themeItem.id === themeId;
        return {
          key: themeItem.id,
          label: (
            <div className="flex items-center justify-between gap-3 py-1 min-w-[220px]">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs flex-shrink-0"
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
                    <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{themeItem.description}</div>
                  )}
                </div>
              </div>
              {isActive && <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            </div>
          ),
          onClick: () => {
            setCoreThemeId(themeItem.id);
            setDropdownOpen(false);
            message.success(`Đã kích hoạt theme "${themeItem.label}"`);
          },
        };
      }),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'quick-toggle',
      label: (
        <div className="flex items-center gap-2 text-xs py-0.5">
          {themeMode === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          )}
          <span>Chuyển sang nền {themeMode === 'dark' ? 'Sáng' : 'Tối'}</span>
        </div>
      ),
      onClick: () => {
        toggleTheme();
        setDropdownOpen(false);
      },
    },
    ...(canManageThemes
      ? [
          {
            key: 'open-studio',
            label: (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 py-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Theme Studio (Tự sửa / Dán màu)</span>
              </div>
            ),
            onClick: () => {
              setDropdownOpen(false);
              setStudioOpen(true);
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <Dropdown
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        menu={{ items: menuItems }}
        placement="bottomRight"
        arrow
        trigger={['click']}
      >
        <button
          type="button"
          className="mos-header-icon-action flex items-center justify-center relative group p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Giao diện hiện tại: ${currentThemeItem?.label || 'mOS Theme'}`}
          aria-label="Chọn Theme Giao Diện"
          aria-expanded={dropdownOpen}
          {...triggerProps}
        >
          <Palette className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-amber-500 transition-colors pointer-events-none" />
          {/* Swatch indicator dot */}
          <span
            className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 shadow-xs pointer-events-none"
            style={{ backgroundColor: currentThemeItem?.colors.primary || '#d4a84b' }}
          />
        </button>
      </Dropdown>

      {canManageThemes && studioOpen && <ThemeStudioModal open={studioOpen} onClose={() => setStudioOpen(false)} />}
    </>
  );
}
