'use client';

import { Button, Tag, Tooltip } from 'antd';
import { Check, Trash2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

interface ThemeStudioPresetsTabProps {
  availableCoreThemes: ReturnType<typeof useTheme>['availableCoreThemes'];
  activeThemeId: string;
  onSelectTheme: (id: string, label: string) => void;
  onDeleteCustomTheme: (id: string) => void;
}

export function ThemeStudioPresetsTab({
  availableCoreThemes,
  activeThemeId,
  onSelectTheme,
  onDeleteCustomTheme,
}: ThemeStudioPresetsTabProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      {availableCoreThemes.map((themeItem) => {
        const isActive = themeItem.id === activeThemeId;
        return (
          <div
            key={themeItem.id}
            onClick={() => onSelectTheme(themeItem.id, themeItem.label)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between ${
              isActive
                ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{themeItem.label}</span>
                {isActive && <Tag color="gold">Đang dùng</Tag>}
                {themeItem.isCustom && <Tag color="blue">Tùy chỉnh</Tag>}
              </div>
              <div className="text-xs text-slate-400">
                {themeItem.base === 'light' ? 'Nền sáng' : 'Nền tối'} • ID: {themeItem.id}
              </div>
              {/* Swatches */}
              <div className="flex items-center gap-1.5 pt-1">
                <span
                  className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: themeItem.colors.primary }}
                  title="Primary Accent"
                />
                <span
                  className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: themeItem.colors.bgLayout }}
                  title="Layout Background"
                />
                <span
                  className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: themeItem.colors.bgContainer }}
                  title="Container Surface"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {themeItem.isCustom && (
                <Tooltip title="Xóa theme này">
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomTheme(themeItem.id);
                    }}
                  />
                </Tooltip>
              )}
              {isActive && <Check className="w-5 h-5 text-amber-500" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
